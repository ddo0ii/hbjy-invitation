import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { PhotonImage } from '@cf-wasm/photon/node';
import { reencodeSnapshot } from '../worker/photo.ts';

test('배포용 WASM이 실제 사진을 WEBP로 재인코딩하고 EXIF를 제거한다', async () => {
  const original = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#abcdef' } }).withExif({ IFD0: { Artist: '검증용' } }).jpeg().toBuffer();
  const result = reencodeSnapshot(original, PhotonImage);
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.exif, undefined);
  assert.equal(result.width, 32); assert.equal(result.height, 24);
});
test('대형 사진과 가짜 사진은 WASM 디코딩 전에 거절한다', async () => {
  const large = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  let decoded = false;
  const decoder = { new_from_byteslice() { decoded = true; throw new Error('디코딩하면 안 됩니다.'); } };
  assert.throws(() => reencodeSnapshot(large, decoder));
  assert.throws(() => reencodeSnapshot(new TextEncoder().encode('<svg></svg>'), decoder));
  assert.equal(decoded, false);
});
