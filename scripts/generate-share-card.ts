import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#fbfaf7"/>
  <path d="M790 0H1200V630H880L720 150Z" fill="#e8e7dd"/>
  <path d="M790 0H1200L880 630Z" fill="#f0eee5"/>
  <rect x="30" y="30" width="1140" height="570" fill="none" stroke="#bfc5b5"/>
  <text x="100" y="123" font-size="15" letter-spacing="5" fill="#7c8574" font-family="Arial">WEDDING INVITATION</text>
  <text x="98" y="272" font-size="62" letter-spacing="3" fill="#343a35" font-family="Batang, serif">조현범</text>
  <path d="M344 216L326 272" stroke="#a2ab96"/>
  <text x="380" y="272" font-size="62" letter-spacing="3" fill="#343a35" font-family="Batang, serif">권주영</text>
  <text x="101" y="328" font-size="13" letter-spacing="3" fill="#7c8574" font-family="Arial">CHO HYUNBUM &amp; GWON JUYOUNG</text>
  <path d="M102 387H638" stroke="#d9ddd0"/>
  <text x="101" y="451" font-size="25" fill="#5d6855" font-family="Malgun Gothic, sans-serif">2027.02.20 토요일 오후 12시 30분</text>
  <text x="101" y="503" font-size="23" fill="#5d6855" font-family="Malgun Gothic, sans-serif">HD현대글로벌R&amp;D센터 아산홀</text>
  <text x="910" y="327" text-anchor="middle" font-size="144" letter-spacing="-10" fill="#86917a" font-family="Times New Roman, serif">H&amp;J</text>
  <text x="910" y="391" text-anchor="middle" font-size="10" letter-spacing="3" fill="#849076" font-family="Arial">20 FEBRUARY 2027</text>
</svg>`;
await mkdir('public/images', { recursive: true });
await sharp(Buffer.from(svg)).png().toFile('public/images/share-card.png');
console.log('공유 미리보기 이미지를 생성했습니다.');
