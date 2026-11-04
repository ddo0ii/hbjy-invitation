import 'dotenv/config';
import express from 'express';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer as createHttpServer } from 'node:http';
import { createApp } from './app.ts';

const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const siteUrl = process.env.SITE_URL ?? `http://localhost:${port}`;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 유효한 정수여야 합니다.');
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) throw new Error('TRUST_PROXY_HOPS를 확인해 주세요.');
if (production && (process.env.ADMIN_PASSWORD?.length ?? 0) < 16) throw new Error('운영 관리자 비밀번호를 16자 이상 설정해 주세요.');
const { app, store } = createApp({ dataDir: resolve(process.env.DATA_DIR ?? './data'), adminPassword: process.env.ADMIN_PASSWORD ?? '', siteUrl, production, trustProxyHops });
const server = createHttpServer(app);
const htmlMetadata = (html: string) => html.replace('content="/images/share-card.png"', `content="${new URL('/images/share-card.png', siteUrl).href}"`).replace('</head>', `<meta property="og:url" content="${new URL(siteUrl).href}" /></head>`);

if (production) {
  app.use(express.static(resolve('dist'), { index: false, maxAge: '1h' }));
  app.get('/{*path}', async (_req, res) => { res.type('html').send(htmlMetadata(await readFile(resolve('dist/index.html'), 'utf8'))); });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'custom' });
  app.use(vite.middlewares);
  app.get('/{*path}', async (req, res, next) => {
    try { res.type('html').send(await vite.transformIndexHtml(req.originalUrl, htmlMetadata(await readFile(resolve('index.html'), 'utf8')))); }
    catch (error) { next(error); }
  });
}
server.listen(port, host, () => console.log(`청첩장: ${siteUrl}\n관리자: ${siteUrl}/admin`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(() => { store.close(); process.exit(0); }); });
