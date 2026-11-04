import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import sharp from 'sharp';

// 원본 폴더 안의 사진을 이름 순서대로 변환합니다. 원본 파일은 변경하지 않습니다.
const inputDir = resolve(process.argv[2] ?? 'photo-originals');
const outputDir = resolve('public/images/gallery');
const files = (await readdir(inputDir)).filter(file => /\.(jpg|jpeg|png|webp|avif)$/i.test(file)).sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
await mkdir(outputDir, { recursive: true });
const gallery: { src: string; alt: string }[] = [];
for (const [index, file] of files.entries()) {
  const name = `${String(index + 1).padStart(2, '0')}-${basename(file, extname(file)).replace(/[^a-zA-Z0-9가-힣_-]/g, '-')}.webp`;
  await sharp(resolve(inputDir, file), { limitInputPixels: 80_000_000 }).rotate().resize({ width: 1800, height: 2200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toFile(resolve(outputDir, name));
  gallery.push({ src: `/images/gallery/${name}`, alt: `현범과 주영의 웨딩 사진 ${index + 1}` });
}
await writeFile(resolve(outputDir, 'gallery-list.json'), JSON.stringify(gallery, null, 2), 'utf8');
console.log(`${files.length}장의 사진을 변환했습니다. public/images/gallery/gallery-list.json의 배열을 shared/wedding.ts의 gallery에 넣어 주세요.`);
