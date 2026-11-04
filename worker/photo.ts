import { imageSize } from 'image-size';

type DecodedImage = { get_width(): number; get_height(): number; get_bytes_webp(): Uint8Array; free(): void };
type Decoder = { new_from_byteslice(bytes: Uint8Array): DecodedImage };

export function reencodeSnapshot(bytes: Uint8Array, decoder: Decoder) {
  const metadata = imageSize(bytes);
  // 디코딩 전에 크기를 검사해 이미지 압축 해제로 인한 메모리 초과를 막습니다.
  if (!metadata.type || !['jpg', 'png', 'webp'].includes(metadata.type) || metadata.width * metadata.height > 2048 * 2048) throw new Error('사진의 크기 또는 형식을 확인해 주세요.');
  const image = decoder.new_from_byteslice(bytes);
  try { return { width: image.get_width(), height: image.get_height(), bytes: new Uint8Array(image.get_bytes_webp()) }; }
  finally { image.free(); }
}
