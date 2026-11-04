import { Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { timingSafeEqual } from 'node:crypto';
import type { D1Database, R2Bucket, Fetcher } from '@cloudflare/workers-types';
import { PhotonImage } from '@cf-wasm/photon/workerd';
import { reencodeSnapshot } from './photo.ts';
import { rsvpSchema } from '../shared/contracts.ts';
import { receiptFromRow, type RsvpRow } from '../shared/records.ts';
import { rsvpWorkbook } from '../shared/rsvp-export.ts';
import { snapshotState, wedding } from '../shared/wedding.ts';

type Environment = { DB: D1Database; BUCKET: R2Bucket; ASSETS: Fetcher; SITE_URL: string; ADMIN_PASSWORD_HASH: string };
type Context = { Bindings: Environment };
type SnapRow = { id: string; uploader: string; file_name: string; byte_size: number; width: number; height: number; created_at: string };
const app = new Hono<Context>();
const maxFileBytes = 10 * 1024 * 1024;
const smallBody = bodyLimit({ maxSize: 16_384, onError: c => c.json({ error: '입력 내용이 너무 깁니다.' }, 413) });

async function hash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
const equalHash = (left: string, right: string) => left.length === 64 && right.length === 64 && timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
const cookieOptions = (url: string) => ({ httpOnly: true, sameSite: 'Strict' as const, secure: new URL(url).protocol === 'https:', path: '/api/admin', maxAge: 12 * 60 * 60 });

const requireAdmin: MiddlewareHandler<Context> = async (c, next) => {
  const token = getCookie(c, 'wedding_admin');
  const session = token && /^[A-Za-z0-9-]{72}$/.test(token) ? await c.env.DB.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ?').bind(await hash(token)).first<{ expires_at: number }>() : null;
  if (!session || session.expires_at <= Date.now()) return c.json({ error: '관리자 로그인이 필요합니다.' }, 401);
  await next();
};
function limit(max: number, minutes: number): MiddlewareHandler<Context> {
  return async (c, next) => {
    const now = Date.now();
    // IP 원문은 저장하지 않고 비밀값으로 해시한 요청 구분자만 기록합니다.
    const key = await hash(`${c.env.ADMIN_PASSWORD_HASH}:${c.req.path}:${c.req.header('CF-Connecting-IP') ?? 'local-preview'}`);
    const row = await c.env.DB.prepare('INSERT INTO rate_limits (key, hits, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET hits = CASE WHEN reset_at <= ? THEN 1 ELSE hits + 1 END, reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END RETURNING hits')
      .bind(key, now + minutes * 60_000, now, now).first<{ hits: number }>();
    if (!row || row.hits > max) return c.json({ error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' }, 429);
    await next();
  };
}
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff'); c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' https://t1.kakaocdn.net; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self' https://*.kakao.com https://*.kakaocdn.net; frame-src https://*.kakao.com; object-src 'none'; base-uri 'self'");
});
app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && c.req.header('Origin') !== new URL(c.env.SITE_URL).origin) return c.json({ error: '허용되지 않은 요청입니다. 청첩장 페이지에서 다시 시도해 주세요.' }, 403);
  await next();
});
app.get('/api/health', async c => {
  await c.env.DB.prepare('SELECT 1').first();
  return c.json({ ok: true });
});
app.get('/api/snaps/status', async c => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM snapshots').first<{ count: number }>();
  return c.json({ state: snapshotState(new Date()), opensAt: wedding.snapshotOpenAt, closesAt: wedding.snapshotCloseAt, count: row?.count ?? 0, maxFiles: 5, maxFileBytes });
});
app.post('/api/rsvp', smallBody, limit(30, 60), async c => {
  const parsed = rsvpSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? '입력 내용을 확인해 주세요.' }, 400);
  const input = parsed.data;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const inserted = await c.env.DB.prepare('INSERT INTO rsvp (id, request_id, side, name, phone, attendance, guest_count, companions, meal, bus, message, consent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(request_id) DO NOTHING RETURNING id')
    .bind(id, input.requestId, input.side, input.name, input.phone, input.attendance, input.count, input.companions, input.meal, input.bus, input.message, createdAt).first<{ id: string }>();
  const row = await c.env.DB.prepare('SELECT * FROM rsvp WHERE request_id = ?').bind(input.requestId).first<RsvpRow>();
  if (!row) throw new Error('참석 응답 저장 결과를 확인하지 못했습니다.');
  const receipt = receiptFromRow(row);
  const { id: _id, createdAt: _createdAt, ...original } = receipt;
  if (JSON.stringify(original) !== JSON.stringify(input)) return c.json({ error: '이미 접수된 요청입니다. 창을 닫고 새로 작성해 주세요.' }, 409);
  return c.json({ receipt }, inserted ? 201 : 200);
});
app.post('/api/admin/login', smallBody, limit(5, 15), async c => {
  if (!/^[a-f0-9]{64}$/.test(c.env.ADMIN_PASSWORD_HASH ?? '')) return c.json({ error: '관리자 설정을 확인해 주세요.' }, 503);
  const { password } = await c.req.json<{ password?: unknown }>();
  if (typeof password !== 'string' || password.length < 16 || password.length > 256 || !equalHash(await hash(password), c.env.ADMIN_PASSWORD_HASH)) return c.json({ error: '비밀번호가 일치하지 않습니다.' }, 401);
  const token = crypto.randomUUID() + crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(Date.now()),
    c.env.DB.prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)').bind(await hash(token), Date.now() + 12 * 60 * 60_000),
  ]);
  setCookie(c, 'wedding_admin', token, cookieOptions(c.req.url));
  return c.json({ ok: true });
});
app.post('/api/admin/logout', requireAdmin, async c => {
  const token = getCookie(c, 'wedding_admin');
  if (token) await c.env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await hash(token)).run();
  deleteCookie(c, 'wedding_admin', { path: '/api/admin' }); return c.json({ ok: true });
});
app.get('/api/admin/overview', requireAdmin, async c => {
  const rows = await c.env.DB.prepare('SELECT * FROM rsvp ORDER BY created_at DESC').all<RsvpRow>();
  const rsvps = rows.results.map(receiptFromRow);
  const snaps = await c.env.DB.prepare('SELECT * FROM snapshots ORDER BY created_at DESC').all<SnapRow>();
  return c.json({ rsvps, snaps: snaps.results, totals: { responses: rsvps.length, attending: rsvps.filter(row => row.attendance === 'yes').reduce((sum, row) => sum + row.count, 0), groom: rsvps.filter(row => row.side === 'groom' && row.attendance === 'yes').reduce((sum, row) => sum + row.count, 0), bride: rsvps.filter(row => row.side === 'bride' && row.attendance === 'yes').reduce((sum, row) => sum + row.count, 0) } });
});
app.get('/api/admin/rsvp.xlsx', requireAdmin, async c => {
  const rows = await c.env.DB.prepare('SELECT * FROM rsvp ORDER BY created_at DESC').all<RsvpRow>();
  return new Response(await rsvpWorkbook(rows.results.map(receiptFromRow)), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="wedding-rsvp-20270220.xlsx"', 'Cache-Control': 'no-store' } });
});
app.get('/api/admin/snaps/:id/file', requireAdmin, async c => {
  const row = await c.env.DB.prepare('SELECT file_name FROM snapshots WHERE id = ?').bind(c.req.param('id')).first<{ file_name: string }>();
  if (!row) return c.json({ error: '사진을 찾을 수 없습니다.' }, 404);
  const file = await c.env.BUCKET.get(row.file_name);
  if (!file) return c.json({ error: '사진을 찾을 수 없습니다.' }, 404);
  const headers = new Headers({ 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' });
  if (c.req.query('download') === '1') headers.set('Content-Disposition', `attachment; filename="wedding-${c.req.param('id')}.webp"`);
  return new Response(file.body as unknown as ReadableStream, { headers });
});
app.post('/api/snaps', limit(15, 60), async (c, next) => {
  const state = snapshotState(new Date());
  if (state !== 'open') return c.json({ error: state === 'scheduled' ? '현장 스냅은 2027년 2월 20일부터 열립니다.' : '현장 스냅 접수가 마감되었습니다.' }, 403);
  await next();
}, bodyLimit({ maxSize: 25 * 1024 * 1024, onError: c => c.json({ error: '사진의 총 용량을 줄여 다시 시도해 주세요.' }, 413) }), async c => {
  const form = await c.req.raw.formData();
  const uploader = form.get('name');
  const files = form.getAll('photos');
  if (typeof uploader !== 'string' || !uploader.trim() || uploader.trim().length > 30 || form.get('consent') !== 'true' || files.length < 1 || files.length > 5 || files.some(file => !(file instanceof File) || file.size > maxFileBytes)) return c.json({ error: '성함, 사진, 수집 동의를 확인해 주세요. 사진은 한 번에 5장, 장당 10MB까지 보낼 수 있습니다.' }, 400);
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM snapshots').first<{ count: number }>();
  if ((count?.count ?? 0) + files.length > 3000) return c.json({ error: '사진 보관 한도에 도달했습니다. 신랑·신부에게 연락해 주세요.' }, 409);
  const rows: SnapRow[] = [];
  const written: string[] = [];
  try {
    for (const entry of files) {
      const bytes = new Uint8Array(await (entry as File).arrayBuffer());
      const { bytes: output, width, height } = reencodeSnapshot(bytes, PhotonImage);
      const id = crypto.randomUUID(); const fileName = `${id}.webp`;
      await c.env.BUCKET.put(fileName, output, { httpMetadata: { contentType: 'image/webp' } });
      written.push(fileName);
      rows.push({ id, uploader: uploader.trim(), file_name: fileName, byte_size: output.byteLength, width, height, created_at: new Date().toISOString() });
    }
    await c.env.DB.batch(rows.map(row => c.env.DB.prepare('INSERT INTO snapshots (id, uploader, file_name, byte_size, width, height, consent, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)').bind(row.id, row.uploader, row.file_name, row.byte_size, row.width, row.height, row.created_at)));
    return c.json({ count: rows.length, message: '사진이 전달되었습니다. 소중한 순간을 나눠 주셔서 감사합니다.' }, 201);
  } catch {
    if (written.length) await c.env.BUCKET.delete(written);
    return c.json({ error: '사진을 저장하지 못했습니다. 청첩장 화면에서 사진을 다시 선택해 주세요.' }, 400);
  }
});
app.all('/api/*', c => c.json({ error: '요청한 경로를 찾을 수 없습니다.' }, 404));
app.get('/admin/', c => c.redirect('/admin', 308));
app.all('*', async c => {
  // 관리자 화면은 청첩장과 같은 React 진입 문서를 사용합니다.
  // 배포 환경의 정적 파일 검색에 /admin 파일을 요청하지 않도록 명시적으로 연결합니다.
  const assetRequest = c.req.path === '/admin'
    ? new Request(new URL('/', c.req.url), c.req.raw)
    : c.req.raw;
  const response = await c.env.ASSETS.fetch(assetRequest as unknown as Parameters<Fetcher['fetch']>[0]);
  if (response.headers.get('Content-Type')?.includes('text/html')) {
    const html = (await response.text()).replace('content="/images/share-card.png"', `content="${new URL('/images/share-card.png', c.env.SITE_URL).href}"`).replace('</head>', `<meta property="og:url" content="${new URL('/', c.env.SITE_URL).href}" /></head>`);
    const headers = new Headers(Object.fromEntries(response.headers.entries()));
    if (c.req.path === '/admin') headers.set('Cache-Control', 'no-store');
    return new Response(html, { status: response.status, headers });
  }
  return response as unknown as Response;
});
app.onError((error, c) => {
  if (error instanceof SyntaxError) return c.json({ error: '요청 내용을 확인해 주세요.' }, 400);
  console.error('청첩장 요청 처리 실패:', error.name);
  return c.json({ error: '잠시 문제가 발생했습니다. 다시 시도해 주세요.' }, 500);
});
export default app;
