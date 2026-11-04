import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (!existsSync('.env')) {
  const password = randomBytes(24).toString('base64url');
  writeFileSync('.env', `PORT=3000\nHOST=127.0.0.1\nSITE_URL=http://localhost:3000\nADMIN_PASSWORD=${password}\nDATA_DIR=./data\nNODE_ENV=development\nTRUST_PROXY_HOPS=0\nVITE_KAKAO_JAVASCRIPT_KEY=\n`, { mode: 0o600 });
  console.log('로컬 .env 파일을 생성했습니다. 관리자 비밀번호는 .env의 ADMIN_PASSWORD에서 확인하세요.');
} else console.log('기존 .env를 유지합니다.');
mkdirSync('data', { recursive: true });
