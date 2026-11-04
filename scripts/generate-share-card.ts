import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const petals = Array.from({ length: 8 }, (_, i) => `<ellipse cx="1000" cy="185" rx="22" ry="48" fill="#6986ad" transform="rotate(${i * 45} 1000 235)"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fbfaf6"/><rect x="30" y="30" width="1140" height="570" fill="none" stroke="#d6ddce"/><text x="100" y="126" font-size="15" letter-spacing="5" fill="#7e9085" font-family="Arial">YOU ARE INVITED TO OUR WEDDING</text><text x="100" y="267" font-size="72" fill="#3f639a" font-family="Malgun Gothic, sans-serif">현범과 주영,</text><text x="100" y="370" font-size="72" fill="#3f639a" font-family="Malgun Gothic, sans-serif">결혼합니다.</text><text x="104" y="463" font-size="25" fill="#697b6c" font-family="Malgun Gothic, sans-serif">2027.02.20 토요일 오후 12시 30분</text><text x="104" y="516" font-size="23" fill="#697b6c" font-family="Malgun Gothic, sans-serif">HD현대글로벌R&amp;D센터 아산홀</text>${petals}<circle cx="1000" cy="235" r="27" fill="#e9d58b"/><path d="M1000 320V480M1000 420C940 420 939 369 970 389Z" stroke="#a2ae8f" fill="#c5ceb7" stroke-width="3"/></svg>`;
await mkdir('public/images', { recursive: true });
await sharp(Buffer.from(svg)).png().toFile('public/images/share-card.png');
console.log('공유 미리보기 이미지를 생성했습니다.');
