// 브라우저에서 회전을 반영하고 위치 정보를 제거한 뒤 업로드 용량을 줄입니다.
export async function prepareSnapshot(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, 2048 / bitmap.width, 2048 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진을 변환하지 못했습니다. 다른 브라우저에서 시도해 주세요.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('사진을 변환하지 못했습니다.')), 'image/webp', 0.88));
    if (blob.type !== 'image/webp') throw new Error('이 브라우저는 사진 변환을 지원하지 않습니다. 최신 브라우저에서 시도해 주세요.');
    if (blob.size > 4 * 1024 * 1024) throw new Error('변환한 사진의 용량이 큽니다. 크기를 줄인 사진으로 다시 시도해 주세요.');
    return new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.webp`, { type: 'image/webp' });
  } finally { bitmap.close(); }
}
