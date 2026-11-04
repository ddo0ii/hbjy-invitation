import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import writeXlsxFile, { type SheetData } from 'write-excel-file/node';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createStore, type SnapRow } from './database.ts';
import { rsvpSchema } from '../shared/contracts.ts';
import { snapshotState, wedding } from '../shared/wedding.ts';

export type AppOptions = { dataDir: string; adminPassword: string; siteUrl: string; production?: boolean; trustProxyHops?: number; now?: () => Date };
const maxFileBytes = 10 * 1024 * 1024;
const digest = (value: string) => createHash('sha256').update(value).digest();

export function createApp(options: AppOptions) {
  const app = express();
  const store = createStore(options.dataDir);
  const now = options.now ?? (() => new Date());
  const origin = new URL(options.siteUrl).origin;
  const uploadDir = resolve(options.dataDir, 'snapshots');
  const sessions = new Map<string, number>();
  app.disable('x-powered-by');
  if (options.trustProxyHops) app.set('trust proxy', options.trustProxyHops);
  app.use(helmet({
    contentSecurityPolicy: options.production ? {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://t1.kakaocdn.net'],
        styleSrc: ["'self'", "'unsafe-inline'"], fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'], mediaSrc: ["'self'"],
        connectSrc: ["'self'", 'https://*.kakao.com', 'https://*.kakaocdn.net'],
        frameSrc: ['https://*.kakao.com'], objectSrc: ["'none'"],
        upgradeInsecureRequests: options.siteUrl.startsWith('https:') ? [] : null,
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: options.production && options.siteUrl.startsWith('https:') ? undefined : false,
  }));
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== origin) {
      res.status(403).json({ error: '허용되지 않은 요청입니다. 청첩장 페이지에서 다시 시도해 주세요.' }); return;
    }
    next();
  });
  app.use(express.json({ limit: '16kb' }));

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('wedding_admin='))?.slice('wedding_admin='.length);
    const key = token ? digest(token).toString('hex') : '';
    const expires = sessions.get(key);
    if (!expires || expires <= now().getTime()) { sessions.delete(key); res.status(401).json({ error: '관리자 로그인이 필요합니다.' }); return; }
    next();
  };
  const limit = (max: number, minutes: number) => rateLimit({ windowMs: minutes * 60_000, limit: max, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' } });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/snaps/status', (_req, res) => res.json({ state: snapshotState(now()), opensAt: wedding.snapshotOpenAt, closesAt: wedding.snapshotCloseAt, count: store.snapCount(), maxFiles: 5, maxFileBytes }));

  app.post('/api/rsvp', limit(30, 60), (req, res) => {
    const parsed = rsvpSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? '입력 내용을 확인해 주세요.' }); return; }
    const existing = store.getRsvp(parsed.data.requestId);
    if (existing) {
      const { id: _id, createdAt: _createdAt, ...original } = existing;
      if (JSON.stringify(original) !== JSON.stringify(parsed.data)) { res.status(409).json({ error: '이미 접수된 요청입니다. 창을 닫고 새로 작성해 주세요.' }); return; }
      res.json({ receipt: existing }); return;
    }
    res.status(201).json({ receipt: store.addRsvp(parsed.data, now()) });
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxFileBytes, files: 5, fields: 2, fieldSize: 300, parts: 7 } });
  app.post('/api/snaps', limit(15, 60), (req, res, next) => {
    if (snapshotState(now()) !== 'open') { res.status(403).json({ error: snapshotState(now()) === 'scheduled' ? '현장 스냅은 2027년 2월 20일부터 열립니다.' : '현장 스냅 접수가 마감되었습니다.' }); return; }
    next();
  }, upload.array('photos', 5), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    const uploader = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!uploader || uploader.length > 30 || req.body.consent !== 'true' || !files?.length) { res.status(400).json({ error: '성함, 사진, 사진 수집 동의를 확인해 주세요.' }); return; }
    if (store.snapCount() + files.length > 3000) { res.status(409).json({ error: '사진 보관 한도에 도달했습니다. 신랑·신부에게 연락해 주세요.' }); return; }
    const rows: SnapRow[] = [];
    const written: string[] = [];
    try {
      await mkdir(uploadDir, { recursive: true });
      for (const file of files) {
        const image = sharp(file.buffer, { limitInputPixels: 40_000_000, animated: false, failOn: 'error' });
        const metadata = await image.metadata();
        if (!metadata.format || !['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format) || (metadata.pages ?? 1) > 1) throw new Error('사진 형식을 확인해 주세요. JPG, PNG, WEBP, AVIF 정지 사진을 이용해 주세요.');
        // 회전 정보를 반영하고 위치 등 EXIF 정보를 제거한 뒤 크기를 줄여 보관합니다.
        const { data, info } = await image.rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
        const id = randomUUID();
        const fileName = `${id}.webp`;
        const path = resolve(uploadDir, fileName);
        await writeFile(path, data, { flag: 'wx' });
        written.push(path);
        rows.push({ id, uploader, file_name: fileName, byte_size: info.size, width: info.width, height: info.height, created_at: now().toISOString() });
      }
      store.addSnaps(rows);
      res.status(201).json({ count: rows.length, message: '사진이 전달되었습니다. 소중한 순간을 나눠 주셔서 감사합니다.' });
    } catch {
      await Promise.allSettled(written.map(path => unlink(path)));
      res.status(400).json({ error: '사진을 저장하지 못했습니다. 10MB 이하의 JPG, PNG, WEBP, AVIF 사진인지 확인해 주세요.' });
    }
  });

  app.post('/api/admin/login', limit(5, 15), (req, res) => {
    const password = req.body?.password;
    if (options.adminPassword.length < 16) { res.status(503).json({ error: '.env에 16자 이상의 관리자 비밀번호를 설정해 주세요.' }); return; }
    if (typeof password !== 'string' || password.length > 256 || !timingSafeEqual(digest(password), digest(options.adminPassword))) { res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' }); return; }
    for (const [key, expiry] of sessions) if (expiry <= now().getTime()) sessions.delete(key);
    const token = randomBytes(32).toString('base64url');
    sessions.set(digest(token).toString('hex'), now().getTime() + 12 * 60 * 60_000);
    res.cookie('wedding_admin', token, { httpOnly: true, sameSite: 'strict', secure: !!options.production && options.siteUrl.startsWith('https:'), maxAge: 12 * 60 * 60_000, path: '/api/admin' });
    res.json({ ok: true });
  });
  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    const token = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('wedding_admin='))?.slice('wedding_admin='.length);
    if (token) sessions.delete(digest(token).toString('hex'));
    res.clearCookie('wedding_admin', { path: '/api/admin' }); res.json({ ok: true });
  });
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const rsvps = store.listRsvp();
    res.json({ rsvps, snaps: store.listSnaps(), totals: {
      responses: rsvps.length, attending: rsvps.filter(row => row.attendance === 'yes').reduce((sum, row) => sum + row.count, 0),
      groom: rsvps.filter(row => row.side === 'groom' && row.attendance === 'yes').reduce((sum, row) => sum + row.count, 0),
      bride: rsvps.filter(row => row.side === 'bride' && row.attendance === 'yes').reduce((sum, row) => sum + row.count, 0),
    } });
  });
  app.get('/api/admin/rsvp.xlsx', requireAdmin, async (_req, res) => {
    const headers = ['접수 일시 (한국)', '구분', '성함', '연락처', '참석', '인원 (본인 포함)', '동행인', '식사', '대절버스', '전할 말', '수집 동의', '접수 번호'];
    const data: SheetData = [headers.map(value => ({ value, fontWeight: 'bold', color: '#FFFFFF', backgroundColor: '#3962A4' }))];
    for (const row of store.listRsvp()) {
      const cells = [new Date(row.createdAt).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }), row.side === 'groom' ? '신랑측' : '신부측', row.name, row.phone, row.attendance === 'yes' ? '참석' : '불참', row.count, row.companions, { yes: '예정', no: '안 함', undecided: '미정' }[row.meal], row.bus === 'none' ? '이용 안 함' : row.bus, row.message, '동의', row.id];
      // 연락처의 앞자리 0과 사용자 입력을 보존하고 수식으로 해석되지 않게 명시합니다.
      data.push(cells.map(value => typeof value === 'number' ? { value, type: Number } : { value, type: String }));
    }
    const buffer = await writeXlsxFile(data, { sheet: '참석 응답', stickyRowsCount: 1, columns: [24, 10, 16, 18, 10, 18, 24, 12, 12, 40, 12, 38].map(width => ({ width })) }).toBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="wedding-rsvp-20270220.xlsx"');
    res.send(buffer);
  });
  app.get('/api/admin/snaps/:id/file', requireAdmin, (req, res) => {
    const row = store.getSnap(req.params.id as string);
    if (!row) { res.status(404).json({ error: '사진을 찾을 수 없습니다.' }); return; }
    res.setHeader('Content-Type', 'image/webp');
    if (req.query.download === '1') res.setHeader('Content-Disposition', `attachment; filename="wedding-${row.id}.webp"`);
    res.sendFile(resolve(uploadDir, row.file_name));
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: '요청한 경로를 찾을 수 없습니다.' }); });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError) { res.status(400).json({ error: '사진은 한 번에 5장, 장당 10MB까지 보낼 수 있습니다.' }); return; }
    if (error instanceof SyntaxError) { res.status(400).json({ error: '요청 내용을 확인해 주세요.' }); return; }
    console.error('서버 요청 처리 실패:', error instanceof Error ? error.name : '알 수 없는 오류');
    res.status(500).json({ error: '잠시 문제가 발생했습니다. 다시 시도해 주세요.' });
  });
  return { app, store };
}
