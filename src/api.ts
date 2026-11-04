export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options?.headers }, signal: options?.signal ?? AbortSignal.timeout(45_000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? '요청을 완료하지 못했습니다. 다시 시도해 주세요.');
  return body as T;
}

export async function copyText(value: string) {
  if (!navigator.clipboard || !window.isSecureContext) throw new Error('이 환경에서는 자동 복사가 지원되지 않습니다. 표시된 내용을 길게 눌러 복사해 주세요.');
  await navigator.clipboard.writeText(value);
}
