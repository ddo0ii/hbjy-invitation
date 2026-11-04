import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { unzipSync, strFromU8 } from 'fflate';
import { createApp } from '../server/app.ts';
import { createStore } from '../server/database.ts';

test('참석 응답·관리자·엑셀·현장 사진 통합 검증', async t => {
  const dataDir = await mkdtemp(resolve(tmpdir(), 'hbjy-test-'));
  let clock = new Date('2026-11-04T03:00:00Z');
  const origin = 'http://localhost:3000';
  const { app, store } = createApp({ dataDir, adminPassword: 'local-test-password-very-long', siteUrl: origin, now: () => clock });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  const input = { requestId: randomUUID(), side: 'bride', name: '검증용 하객', phone: '01012345678', attendance: 'yes', count: 3, companions: '동행인 두 명', meal: 'yes', bus: '대전', message: '=1+1', consent: true };
  const post = (path: string, value: unknown, headers = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(value) });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    store.close();
    const allowed = `${resolve(tmpdir())}${sep}hbjy-test-`;
    assert(dataDir.startsWith(allowed), '임시 검증 폴더만 정리합니다.');
    await rm(dataDir, { recursive: true, force: true });
  });

  await t.test('외부 출처에서 보낸 저장 요청은 차단한다', async () => {
    assert.equal((await post('/api/rsvp', input, { Origin: 'https://other.example' })).status, 403);
    assert.equal(store.listRsvp().length, 0);
  });
  await t.test('소수 인원과 개인정보 수집 미동의를 저장하지 않는다', async () => {
    assert.equal((await post('/api/rsvp', { ...input, count: 1.5 })).status, 400);
    assert.equal((await post('/api/rsvp', { ...input, consent: false })).status, 400);
    assert.equal(store.listRsvp().length, 0);
  });
  await t.test('DB 저장을 완료한 접수 내용이 그대로 반환된다', async () => {
    const response = await post('/api/rsvp', input);
    assert.equal(response.status, 201);
    const { receipt } = await response.json();
    assert.equal(receipt.count, 3);
    assert.equal(receipt.phone, '01012345678');
    assert.equal(receipt.side, 'bride');
    assert.equal(store.listRsvp().length, 1);
    assert.equal(store.listRsvp()[0].id, receipt.id);
  });
  await t.test('통신 재시도로 같은 요청이 와도 중복 저장하지 않는다', async () => {
    assert.equal((await post('/api/rsvp', input)).status, 200);
    assert.equal(store.listRsvp().length, 1);
    assert.equal((await post('/api/rsvp', { ...input, count: 4 })).status, 409);
  });
  await t.test('불참 응답에 참석 인원이 들어가면 거절한다', async () => {
    assert.equal((await post('/api/rsvp', { ...input, requestId: randomUUID(), attendance: 'no' })).status, 400);
    assert.equal((await post('/api/rsvp', { ...input, requestId: randomUUID(), side: 'groom', attendance: 'no', count: 0, meal: 'no', bus: 'none', companions: '' })).status, 201);
  });
  await t.test('다른 DB 연결에서도 접수 내용이 유지된다', () => {
    const another = createStore(dataDir);
    assert.equal(another.listRsvp().length, 2);
    another.close();
  });
  await t.test('관리자 인증 없이 응답·사진·엑셀에 접근할 수 없다', async () => {
    for (const path of ['/api/admin/overview', '/api/admin/rsvp.xlsx', '/api/admin/snaps/fake/file']) assert.equal((await fetch(`${base}${path}`)).status, 401);
  });
  await t.test('비밀번호 검증 후 보안 쿠키로 로그인한다', async () => {
    assert.equal((await post('/api/admin/login', { password: 'wrong' })).status, 401);
    const response = await post('/api/admin/login', { password: 'local-test-password-very-long' });
    assert.equal(response.status, 200);
    const raw = response.headers.get('set-cookie')!;
    assert.match(raw, /HttpOnly/i); assert.match(raw, /SameSite=Strict/i);
    cookie = raw.split(';')[0];
  });
  await t.test('정수 인원을 합산하고 불참 인원은 제외한다', async () => {
    const response = await fetch(`${base}/api/admin/overview`, { headers: { Cookie: cookie } });
    const result = await response.json();
    assert.deepEqual(result.totals, { responses: 2, attending: 3, groom: 0, bride: 3 });
  });
  await t.test('엑셀에 한글·앞자리 0·수식 모양 문자열을 보존한다', async () => {
    const response = await fetch(`${base}/api/admin/rsvp.xlsx`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    const buffer = new Uint8Array(await response.arrayBuffer());
    const archive = unzipSync(buffer);
    const xml = Object.entries(archive).filter(([key]) => key.endsWith('.xml')).map(([, value]) => strFromU8(value)).join('\n');
    assert.match(xml, /검증용 하객/); assert.match(xml, /01012345678/); assert.match(xml, /=1\+1/);
    assert.doesNotMatch(xml, /<f[ >]/);
    assert.match(xml, /frozen/);
  });
  const image = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#aabbcc' } }).jpeg().toBuffer();
  function photoForm(invalidSecond = false) {
    const form = new FormData(); form.set('name', '스냅 검증'); form.set('consent', 'true');
    form.append('photos', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), 'photo.jpg');
    if (invalidSecond) form.append('photos', new Blob(['<svg></svg>'], { type: 'image/jpeg' }), 'fake.jpg');
    return form;
  }
  await t.test('2월 20일 이전에는 직접 API 업로드도 차단한다', async () => {
    const response = await fetch(`${base}/api/snaps`, { method: 'POST', headers: { Origin: origin }, body: photoForm() });
    assert.equal(response.status, 403); assert.equal(store.snapCount(), 0);
  });
  await t.test('여러 장 중 가짜 이미지가 있으면 전부 저장하지 않는다', async () => {
    clock = new Date('2027-02-19T15:00:00Z');
    const response = await fetch(`${base}/api/snaps`, { method: 'POST', headers: { Origin: origin }, body: photoForm(true) });
    assert.equal(response.status, 400); assert.equal(store.snapCount(), 0);
    assert.deepEqual(await readdir(resolve(dataDir, 'snapshots')), []);
  });
  await t.test('개시 이후 WEBP 변환·파일 저장·DB 기록·인증 다운로드가 동작한다', async () => {
    const response = await fetch(`${base}/api/snaps`, { method: 'POST', headers: { Origin: origin }, body: photoForm() });
    assert.equal(response.status, 201); assert.equal(store.snapCount(), 1);
    const snap = store.listSnaps()[0];
    assert.equal(snap.width, 32); assert.equal(snap.height, 24);
    assert.match(snap.file_name, /\.webp$/);
    const login = await post('/api/admin/login', { password: 'local-test-password-very-long' });
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    const photo = await fetch(`${base}/api/admin/snaps/${snap.id}/file`, { headers: { Cookie: cookie } });
    assert.equal(photo.status, 200); assert.match(photo.headers.get('content-type')!, /image\/webp/);
    const metadata = await sharp(Buffer.from(await photo.arrayBuffer())).metadata(); assert.equal(metadata.exif, undefined);
    assert.equal((await fetch(`${base}/api/admin/snaps/${snap.id}/file`)).status, 401);
  });
  await t.test('로그아웃하면 세션을 폐기한다', async () => {
    clock = new Date('2027-03-21T15:00:00Z');
    const login = await post('/api/admin/login', { password: 'local-test-password-very-long' });
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await post('/api/admin/logout', {}, { Cookie: cookie })).status, 200);
    assert.equal((await fetch(`${base}/api/admin/overview`, { headers: { Cookie: cookie } })).status, 401);
  });
});
