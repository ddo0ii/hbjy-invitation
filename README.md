# 현범과 주영의 모바일 청첩장

2027년 2월 20일 토요일 오후 12시 30분, HD현대글로벌R&D센터 아산홀.

청첩장 주소: [현범과 주영의 청첩장](https://hyunbum-juyoung-2027.kkang8877.chatgpt.site) · 로그인 없이 열람

소스 저장소: [ddo0ii/hbjy-invitation](https://github.com/ddo0ii/hbjy-invitation) · 비공개

기존 [명준·소영 청첩장](https://ddo0ii.github.io/invitation/)의 세로 흐름을 참고해 새로 구성했습니다. 아이보리와 차콜 계열, 한글 명조와 정돈된 산세리프, 얇은 선을 사용한 차분한 디자인입니다. 사진이 준비되기 전에는 종이 질감의 색면과 이니셜을 표시하며 실제 웨딩 사진으로 교체할 수 있습니다.

## 바로 실행

Node.js 24 LTS에서 실행합니다.

```powershell
cd D:\dev\HBJY
npm ci
npm run setup
npm run dev
```

- 청첩장: http://localhost:3000/
- 관리자: http://localhost:3000/admin
- 관리자 비밀번호: 로컬 `.env`의 `ADMIN_PASSWORD`. `setup`은 임의의 안전한 비밀번호를 생성하며 기존 `.env`는 덮어쓰지 않습니다.

클라이언트는 React 19.3 · TypeScript 7 · Vite 8, 서버는 Express 5 · Node.js 내장 SQLite를 사용합니다. 폰트는 자체 호스팅하고, 음악은 클릭한 경우에만 재생합니다.

## 화면 순서와 기능

1. 사진과 이름·예식 기본 정보
2. 초대의 글과 양가 부모님·신랑신부 성함
3. 2027년 2월 달력과 한국 날짜 기준 D-DAY, 캘린더 저장
4. 2장·3장·2장이 섞인 갤러리: 처음 3행, 전체 펼치기·접기, 크게 보기·이전·다음·키보드 이동
5. 참석 응답: 신랑·신부별 안내, 성함·연락처·참석·인원·동행인·식사·대절버스·메시지·수집 동의
6. 현장 스냅: 2027년 2월 20일 한국 시각 0시부터 서버가 접수 허용
7. 오시는 길과 지하철·셔틀·버스·자가용 안내, 지도·내비 연결
8. 대전·경주 대절버스 드롭다운
9. 신랑측·신부측 계좌 드롭다운과 복사
10. 카카오톡 공유·링크 복사·기기 공유, 마지막 인사

참석 응답은 서버의 DB 저장 성공 후에만 ‘전달되었습니다’와 전달한 내용을 표시합니다. 같은 접수 번호로 통신을 재시도해도 중복 기록하지 않습니다. 참석 인원은 정수만 허용합니다. 불참은 0명·식사 없음·버스 없음·동행인 없음으로 저장합니다.

## 나중에 받을 정보 수정

**문구와 예식 데이터의 기준 파일은 `shared/wedding.ts`입니다.** UI와 서버가 함께 참조하므로 개시일을 화면에만 따로 설정하지 않습니다.

| 정보 | 수정할 값 |
| --- | --- |
| 첫 사진 | `heroPhoto`: 예를 들어 `/images/hero.webp` |
| 첫 사진의 위치 | `heroPhotoPosition`: `center 45%` 등 |
| 초대의 글 | `greeting` 배열. 현재 문구는 임시 초안 |
| 갤러리 | `gallery` 배열의 `src`, `alt`, 필요하면 `position` |
| 마지막 사진 | `closingPhoto`. 비어 있으면 생략 |
| 종이 청첩장 약도 | `venue.mapImage` |
| 셔틀 시간·배차 | `transport.shuttle.start`, `end`, `intervalMinutes` |
| 대전·경주 버스 | `charterBuses`의 출발 시간·장소·연락처·비고 |
| 계좌 | `accounts.groom`, `accounts.bride`에 아래 형식으로 입력 |
| 배경음악 | `music.src`, `music.title`, `music.description` |
| 공유 사진 | `public/images/share-card.png`를 1200×630 PNG 또는 JPG로 교체 |
| 현장 스냅 마감 | `snapshotCloseAt`. 현재 `null`로 별도 마감일 없음 |

계좌는 숫자로 변환하지 않고 문자열로 유지합니다.

```ts
{ holder: '예금주 성함', bank: '은행명', number: '계좌번호', relationship: '신랑' }
```

사진 파일은 `public/images/`에 넣습니다. 갤러리 사진이 많으면 원본을 `photo-originals/`에 번호순으로 넣고 다음 명령으로 회전 반영·크기 조절·WEBP 변환을 수행합니다. 원본은 수정하지 않습니다.

```powershell
npm run photos
# 다른 원본 폴더를 사용할 때
npm run photos -- "D:\사진 폴더"
```

변환 결과는 `public/images/gallery/`에 생성됩니다. 함께 생성되는 `gallery-list.json`의 배열을 `shared/wedding.ts`의 `gallery`에 옮깁니다. 배열 순서가 그대로 유지됩니다. `heroPhoto`도 변환된 파일을 지정할 수 있습니다.

아직 전달받지 않은 계좌·셔틀 시간·대절버스 일정은 임의로 작성하지 않았습니다. ‘정혜민 청첩장’은 링크를 받지 않아 직접 비교하지 않았으며, 신랑·신부별 안내 문구는 별도로 구성했습니다.

## 데이터와 엑셀

화면·서버·DDL의 위치를 구분합니다.

| 구분 | 위치 | 역할 |
| --- | --- | --- |
| UI | `src/` | 청첩장, 참석 폼, 사진 선택, 관리자 |
| 데이터 계약 | `shared/contracts.ts` | 필수 값·형식·정수 인원 검증 |
| 예식 정보 | `shared/wedding.ts` | 문구·사진·일정·계좌·교통편 |
| 서버 | `server/app.ts` | 저장·인증·엑셀·사진 API |
| DDL | `server/schema.sql` | SQLite 테이블·제약·인덱스 |
| 실제 DB | `data/wedding.sqlite` | 참석 응답·사진 메타데이터 |
| 실제 사진 | `data/snapshots/` | 비공개 WEBP 이미지 |

엑셀 파일을 동시에 덮어쓰는 방식 대신 SQLite에 저장하고, 관리자 화면의 **엑셀 다운로드**로 전체 응답을 `.xlsx`로 받습니다. Google Sheets에 자동으로 쌓이는 방식은 연결하지 않았습니다. 연락처 앞자리 0과 한글을 보존하며 사용자 입력을 엑셀 수식으로 만들지 않습니다. 인원 합계는 불참을 제외하고 본인을 포함합니다.

현장 사진은 한 번에 5장, 장당 10MB, 전체 3,000장까지 받습니다. 실제 이미지 디코딩을 확인하고 가로·세로 최대 2,560px의 WEBP로 변환합니다. EXIF 위치 정보를 보존하지 않으며 원본 파일도 보관하지 않습니다. 사진이 한 장이라도 잘못되면 해당 묶음을 저장하지 않습니다. 목록·원본 다운로드는 관리자 인증이 필요합니다.

관리자 로그인은 HttpOnly·SameSite 쿠키를 사용하며 세션은 12시간 유효합니다. 서버를 재시작하면 다시 로그인해야 합니다. 운영 HTTPS에서는 Secure 쿠키가 설정됩니다. 응답과 업로드에는 요청 횟수 제한과 출처 검사를 적용합니다.

DB와 사진 폴더는 공개 정적 파일 경로에서 분리되어 있습니다. 운영 데이터는 배포 파일과 별도로 영구 볼륨에 보관해야 합니다. 개인정보와 사진은 안내한 보유 기간에 맞춰 예식 후 90일 이내 운영자가 삭제해야 합니다. 자동 삭제는 구현하지 않았습니다.

## 카카오 공유와 내비게이션

카카오 개발자 콘솔에서 앱의 JavaScript 키를 만들고 실제 서비스 도메인을 등록한 후 `.env`의 `VITE_KAKAO_JAVASCRIPT_KEY`를 지정합니다. `VITE_` 값은 공개 브라우저 키이며 서버 비밀번호를 넣으면 안 됩니다. 키를 바꾸면 개발 서버를 재시작하거나 다시 빌드합니다.

- 카카오톡 공유: `Kakao.Share.sendDefault()`로 이름·예식·공유 이미지·링크 전달
- 카카오내비: `Kakao.Navi.start()`로 목적지 전달. 앱이 없는 경우 설치 안내는 카카오 SDK가 처리
- 네이버지도: 예식장 이름 검색 링크
- 티맵: TMAP 공식 모바일 검색·앱 연결 페이지

카카오 키가 없는 현재 상태에서는 연결 준비 안내를 표시합니다. 카카오톡으로 실제 메시지를 보내거나 모바일 내비 앱을 실행하는 검증은 하지 않았습니다. 카카오내비 좌표는 건물 위치 기준이며, 배포 전 실제 차량 진입 지점과 맞는지 종이 청첩장으로 확인해 주세요. 예식장 공식 주소는 [HD현대일렉트릭 사업장 안내](https://www.hyundai-electric.com/elect/m/ko/company/workplace.jsp)와 일치하며, 좌표 참고 자료는 [도로명주소 정보](https://findby.co.kr/details/13553-411353180055-st-652bef3a4e0223ae18032e79)입니다.

구현 기준: [카카오 공유 문서](https://developers.kakao.com/docs/ko/kakaotalk-share/js-link), [카카오내비 문서](https://developers.kakao.com/docs/ko/kakaonavi/js), [카카오맵 URL 문서](https://apis.map.kakao.com/web/guide/).

## 배포

운영 사이트는 Sites의 Cloudflare Worker에서 실행합니다. 참석 응답과 관리자 세션은 D1에, 현장 사진은 비공개 R2에 보관합니다. 로컬 SQLite 파일을 운영 서버에 올리지 않으며, 로컬 PC를 꺼도 운영 데이터는 유지됩니다. 관리자 비밀번호는 기존 `.env`의 `ADMIN_PASSWORD`와 같고, 배포 환경에는 SHA-256 해시만 비밀값으로 등록합니다.

배포 서버 코드는 `worker/`, D1 스키마는 `db/schema.ts`, 적용 이력은 `drizzle/`에 있습니다. Sites 프로젝트 설정은 `.openai/hosting.json`에 있으며 비밀값은 포함하지 않습니다. 로컬 Node 서버와 운영 Worker는 동일한 입력 검증·엑셀 생성 코드를 사용합니다.

현장 사진은 업로드 전 브라우저에서 회전을 반영해 최대 2,048px WEBP로 변환하고, 운영 서버에서도 실제 이미지 디코딩·재인코딩으로 위치 정보를 제거합니다. 운영 서버는 2월 20일 전 업로드를 차단합니다.

변경 후 `npm run build`로 빌드하고 Sites 스킬의 소스 저장·게시 절차를 따릅니다. GitHub에 푸시하는 것만으로 자동 배포되지는 않습니다.

### Node 서버 또는 Docker로 직접 운영할 때

소스는 GitHub 비공개 저장소에 보관합니다. GitHub 소스 업로드와 실제 웹서비스 배포는 별도입니다. 서버 DB와 사진 업로드가 있으므로 이 프로젝트를 GitHub Pages에 정적 파일만 올리면 저장 기능을 사용할 수 없습니다. Node.js 서버와 영구 디스크가 있는 환경에서 실행해야 합니다.

서버 환경에서 `.env`의 `NODE_ENV=production`, 실제 HTTPS `SITE_URL`, 관리자 비밀번호를 설정하고 다음 명령으로 실행합니다.

```powershell
npm ci
npm run build
npm start
```

리버스 프록시에서 접근할 때 `HOST=0.0.0.0`을 설정합니다. 프록시가 1개인 구성에 한해 `TRUST_PROXY_HOPS=1`로 설정하고, 프록시에서 원래 출처·클라이언트 IP 헤더를 정확히 전달합니다. `SITE_URL`은 브라우저에서 여는 주소와 일치해야 접수가 허용됩니다.

Docker 배포용 파일도 포함했습니다. Docker가 설치된 서버에서 `.env`를 설정한 뒤 실행합니다. 컨테이너의 `/app/data`는 별도의 볼륨으로 유지됩니다. 기본 포트는 서버의 루프백에만 열려 있으므로 실제 HTTPS 도메인은 리버스 프록시로 연결합니다.

```powershell
docker compose up -d --build
```

Docker 이미지 빌드와 실제 외부 서버 배포는 이 작업에서 실행하지 않았습니다.

## 검증 명령

```powershell
npm run check
npm test
npm run build
npm audit
```

자동 테스트는 임시 DB에서만 실행합니다. 한국 날짜 경계, 갤러리 순서, 실제 DB 저장·재조회, 재시도 중복 방지, 불참 규칙, 출처 검사, 관리자 인증, 엑셀의 한글·문자열 보존, 개시 전 사진 업로드 차단, 잘못된 사진의 전체 취소, 이미지 변환·비공개 다운로드를 검증합니다.

## 음악과 시각 요소

`public/music/sunlit-day.wav`는 `scripts/generate-music.mjs`로 구성한 약 34초의 오리지널 연주입니다. 밝고 가벼운 분위기의 임시 BGM이며, 특정 팝송을 복제하지 않았습니다. 다른 곡은 사용 권한이 있는 음원 파일로 교체해 주세요. 사진 대체 화면은 CSS로 구성한 종이 색면과 이니셜입니다. 외부 사진이나 기존 청첩장의 개인 사진·계좌·키를 복사하지 않았습니다.
