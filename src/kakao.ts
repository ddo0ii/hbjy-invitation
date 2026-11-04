declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (payload: unknown) => void };
      Navi: { start: (payload: { name: string; x: number; y: number; coordType: 'wgs84' }) => void };
    };
  }
}

let loading: Promise<void> | undefined;
export async function loadKakao() {
  const key = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
  if (!key) throw new Error('카카오 연결을 준비 중입니다. 청첩장 링크 복사와 지도 보기를 이용해 주세요.');
  if (!window.Kakao) {
    loading ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => { script.remove(); loading = undefined; reject(new Error('카카오 연결이 지연되고 있어요. 다시 시도해 주세요.')); }, 8000);
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.0/kakao.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error('카카오 연결을 확인해 주세요.')); };
      document.head.append(script);
    });
    await loading;
  }
  if (!window.Kakao) throw new Error('카카오를 불러오지 못했습니다.');
  if (!window.Kakao.isInitialized()) window.Kakao.init(key);
  return window.Kakao;
}
