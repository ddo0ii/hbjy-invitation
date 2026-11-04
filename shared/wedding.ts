export type Side = 'groom' | 'bride';
export type Account = { holder: string; bank: string; number: string; relationship: string };
export type GalleryPhoto = { src: string; alt: string; position?: string };

// 미정인 값은 빈 값 또는 null로 남깁니다. 다른 사람의 정보로 대체하지 않습니다.
export const wedding = {
  dateTime: '2027-02-20T12:30:00+09:00',
  date: '2027-02-20',
  snapshotOpenAt: '2027-02-20T00:00:00+09:00',
  snapshotCloseAt: null as string | null,
  groom: { name: '조현범', shortName: '현범', english: 'CHO HYUNBUM', father: '조성진', mother: '이진용', order: '장남' },
  bride: { name: '권주영', shortName: '주영', english: 'GWON JUYOUNG', father: '권용덕', mother: '이선애', order: '차녀' },
  venue: { name: 'HD현대글로벌R&D센터', hall: '아산홀', address: '경기 성남시 분당구 분당수서로 477', mapImage: '', coordinates: { latitude: 37.3769302, longitude: 127.1061108 } },
  greeting: ['서로를 아끼며 함께할 날들을 약속합니다.', '', '저희의 새로운 시작에 함께하시어', '자리를 빛내 주시면 감사하겠습니다.'],
  heroPhoto: '',
  heroPhotoPosition: 'center 45%',
  closingPhoto: '',
  shareImage: '/images/share-card.png',
  music: { src: '/music/sunlit-day.wav', title: 'Sunlit day', description: '밝고 가벼운 오리지널 연주곡' },
  // 한 행에 2장 → 3장 → 2장 순서입니다. 처음에는 정확히 세 행을 보여줍니다.
  gallery: Array.from({ length: 14 }, (_, i): GalleryPhoto => ({ src: '', alt: `현범과 주영의 웨딩 사진 ${i + 1}` })),
  rsvp: {
    groom: { title: '신랑 조현범 측 하객 안내', description: '신랑측 참석 정보를 남겨 주시면 예식 전 확인 연락을 드리겠습니다. 정성껏 모실 수 있도록 아래 내용을 작성해 주세요.' },
    bride: { title: '신부 권주영 측 하객 안내', description: '신부측 참석 정보를 남겨 주시면 예식 전 확인 연락을 드리겠습니다. 정성껏 모실 수 있도록 아래 내용을 작성해 주세요.' },
  },
  transport: {
    subway: ['수인분당선 수내역 4번 출구', '수인분당선 정자역 6번 출구', '각 출구에서 예식장 셔틀버스를 이용하실 수 있습니다.'],
    shuttle: { start: '', end: '', intervalMinutes: null as number | null },
    subwayNote: '역에서 식장까지 도보 약 20분이 소요될 수 있으니, 편리한 셔틀버스 이용을 권장합니다.',
    bus: ['2번 · 111번', '현대중공업R&D센터 정류장 하차'],
    parking: ['사옥 내 무료 주차가 가능합니다.', '주차 공간이 여유롭게 마련되어 있습니다.'],
  },
  charterBuses: [
    { city: '대전', departure: '', location: '', contact: '', note: '' },
    { city: '경주', departure: '', location: '', contact: '', note: '' },
  ],
  accounts: { groom: [] as Account[], bride: [] as Account[] },
  maps: {
    naver: 'https://map.naver.com/p/search/HD현대글로벌R%26D센터',
    kakao: 'https://map.kakao.com/link/search/HD현대글로벌R%26D센터',
    // 카카오내비·티맵의 목적지 공유 링크를 받은 뒤 입력합니다.
    kakaoNavi: '',
    tmap: 'https://www.tmap.co.kr/tmap2/mobile/search.jsp?name=HD현대글로벌R%26D센터',
  },
} as const;

const dayMs = 86_400_000;

export function koreanDateKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function weddingDaysLeft(now: Date): number {
  // 날짜를 한국 시각의 달력 날짜로 변환한 후 정수 밀리초로 계산합니다.
  return Math.round((Date.parse(`${wedding.date}T00:00:00Z`) - Date.parse(`${koreanDateKey(now)}T00:00:00Z`)) / dayMs);
}

export function snapshotState(now: Date, closesAt: string | null = wedding.snapshotCloseAt): 'scheduled' | 'open' | 'closed' {
  if (now.getTime() < Date.parse(wedding.snapshotOpenAt)) return 'scheduled';
  return closesAt && now.getTime() >= Date.parse(closesAt) ? 'closed' : 'open';
}

export function galleryRows<T>(photos: readonly T[]): T[][] {
  const rows: T[][] = [];
  let start = 0;
  while (start < photos.length) {
    const size = rows.length % 3 === 1 ? 3 : 2;
    rows.push(photos.slice(start, start + size));
    start += size;
  }
  return rows;
}
