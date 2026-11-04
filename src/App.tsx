import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, MapPin, Music2, Pause, Share2 } from 'lucide-react';
import { wedding, weddingDaysLeft, galleryRows, type GalleryPhoto, type Side } from '../shared/wedding.ts';
import type { SnapStatus } from '../shared/contracts.ts';
import { Accordion, Dialog, ExternalLink, PhotoPlaceholder, SectionHeading } from './components.tsx';
import { api, copyText } from './api.ts';
import { loadKakao } from './kakao.ts';
const RsvpDialog = lazy(() => import('./RsvpDialog.tsx').then(module => ({ default: module.RsvpDialog })));
const SnapDialog = lazy(() => import('./SnapDialog.tsx').then(module => ({ default: module.SnapDialog })));

function MusicButton({ notify }: { notify: (message: string) => void }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return <><audio ref={audio} src={wedding.music.src} loop preload="none" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} onError={() => { setPlaying(false); notify('음악을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요.'); }} /><button className={`music-button ${playing ? 'playing' : ''}`} aria-label={playing ? '배경음악 끄기' : '배경음악 켜기'} aria-pressed={playing} onClick={async () => {
    if (!audio.current) return;
    if (playing) audio.current.pause();
    else { audio.current.volume = 0.25; try { await audio.current.play(); } catch { notify('음악을 재생하지 못했습니다. 다시 눌러 주세요.'); } }
  }}>{playing ? <Pause size={13} /> : <Music2 size={13} />}<span>{playing ? 'MUSIC ON' : 'MUSIC OFF'}</span><span className="music-dot" /></button></>;
}

function CalendarSection() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  const daysLeft = weddingDaysLeft(now);
  return <section id="date" className="section calendar-section"><SectionHeading number="02" eyebrow="WEDDING DAY">예식 안내</SectionHeading><p className="date-description">2027년 2월 20일 토요일<br /><strong>오후 12시 30분</strong></p>
    <div className="calendar"><div className="calendar-top"><span>February</span><span>2027</span></div><div className="calendar-grid">{['일', '월', '화', '수', '목', '금', '토'].map((day, i) => <span key={day} className={`weekday ${i === 0 ? 'sunday' : ''}`}>{day}</span>)}{Array.from({ length: 1 }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: 28 }, (_, i) => <span key={i} className={`calendar-day ${(i + 1) % 7 === 0 ? 'sunday' : ''} ${i === 19 ? 'wedding-day' : ''}`}><span>{i + 1}</span>{i === 19 && <span className="sr-only"> 결혼식</span>}</span>)}</div></div>
    <div className="countdown" aria-label="결혼식 D-DAY"><span className="countdown-label">UNTIL OUR WEDDING</span><strong>{daysLeft > 0 ? 'D — ' + daysLeft : daysLeft === 0 ? 'D-DAY' : 'THANK YOU'}</strong></div>
    <p className="dday-line">{daysLeft > 0 ? '소중한 날에 뵙겠습니다.' : daysLeft === 0 ? '오늘, 저희 두 사람이 결혼합니다.' : '함께해 주신 모든 분께 감사드립니다.'}</p>
    <a className="text-button calendar-save" href="/wedding.ics" download><CalendarDays size={15} />캘린더에 담아두기</a>
  </section>;
}

function GallerySection() {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const rows = galleryRows<GalleryPhoto>(wedding.gallery);
  const visibleRows = expanded ? rows : rows.slice(0, 3);
  const all = wedding.gallery;
  useEffect(() => {
    if (selected === null) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'ArrowRight') setSelected(index => index === null ? null : (index + 1) % all.length); if (event.key === 'ArrowLeft') setSelected(index => index === null ? null : (index - 1 + all.length) % all.length); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [selected, all.length]);
  return <section id="gallery" className="section gallery-section"><SectionHeading number="03" eyebrow="GALLERY" description={wedding.gallery.some(photo => photo.src) ? '두 사람이 함께한 순간을 담았습니다.' : '사진을 준비하고 있습니다.'}>함께한 순간</SectionHeading>
    <div id="gallery-photos" className="gallery-rows">{visibleRows.map((row, rowIndex) => <div className={`gallery-row columns-${row.length}`} key={rowIndex}>{row.map((photo, colIndex) => {
      const index = rows.slice(0, rowIndex).reduce((sum, item) => sum + item.length, 0) + colIndex;
      return <button className="gallery-photo" key={index} aria-label={`${index + 1}번째 사진 크게 보기`} onClick={() => setSelected(index)}>{photo.src ? <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" style={{ objectPosition: photo.position }} /> : <PhotoPlaceholder index={index} />}</button>;
    })}</div>)}</div>
    <button className="button outline full gallery-expand" aria-expanded={expanded} aria-controls="gallery-photos" onClick={() => setExpanded(!expanded)}>{expanded ? '사진 접기' : '사진 전체 보기'}<ChevronDown size={16} className={expanded ? 'rotate' : ''} /></button>
    {selected !== null && <Dialog title={`GALLERY · ${selected + 1} / ${all.length}`} onClose={() => setSelected(null)} className="lightbox"><div className="lightbox-photo">{all[selected].src ? <img src={all[selected].src} alt={all[selected].alt} /> : <PhotoPlaceholder index={selected} />}</div><div className="lightbox-nav"><button type="button" className="icon-button" aria-label="이전 사진" onClick={() => setSelected((selected - 1 + all.length) % all.length)}><ChevronLeft /></button><span>{selected + 1} / {all.length}</span><button type="button" className="icon-button" aria-label="다음 사진" onClick={() => setSelected((selected + 1) % all.length)}><ChevronRight /></button></div><p className="fine-print">두 손가락으로 사진을 확대하실 수 있습니다.</p></Dialog>}
  </section>;
}

function LocationSection({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState('subway');
  async function copyAddress() { try { await copyText(wedding.venue.address); notify('주소를 복사했습니다.'); } catch (error) { notify((error as Error).message); } }
  return <section id="location" className="section location-section"><SectionHeading number="06" eyebrow="LOCATION">오시는 길</SectionHeading>
    <div className="venue-info"><h3>{wedding.venue.name}</h3><p>{wedding.venue.hall}</p><div className="venue-address"><span>{wedding.venue.address}</span><button className="icon-button" aria-label="예식장 주소 복사" onClick={copyAddress}><Copy size={14} /></button></div></div>
    <ExternalLink href={wedding.maps.kakao} className="map-panel">{wedding.venue.mapImage ? <img src={wedding.venue.mapImage} alt="HD현대글로벌R&D센터 약도" /> : <div className="map-placeholder"><MapPin size={30} /><strong>HD현대글로벌R&D센터</strong><span>실제 지도에서 위치 확인하기</span><small>약도는 준비 중입니다</small></div>}</ExternalLink>
    <div className="map-links"><ExternalLink href={wedding.maps.naver}><span className="map-brand naver">N</span>네이버지도</ExternalLink>{wedding.maps.kakaoNavi ? <ExternalLink href={wedding.maps.kakaoNavi}><span className="map-brand kakao">K</span>카카오내비</ExternalLink> : <button onClick={async () => { try { const kakao = await loadKakao(); kakao.Navi.start({ name: wedding.venue.name, x: wedding.venue.coordinates.longitude, y: wedding.venue.coordinates.latitude, coordType: 'wgs84' }); } catch (error) { notify((error as Error).message); } }}><span className="map-brand kakao">K</span>카카오내비</button>}{wedding.maps.tmap ? <ExternalLink href={wedding.maps.tmap}><span className="map-brand tmap">T</span>티맵</ExternalLink> : <button onClick={() => notify('티맵 목적지 공유 링크를 준비 중입니다. 주소 복사 후 티맵에서 검색해 주세요.')}><span className="map-brand tmap">T</span>티맵</button>}</div>
    <div className="transport-tabs" role="tablist" aria-label="교통편">{[['subway', '지하철 · 셔틀'], ['bus', '버스'], ['parking', '자가용 · 주차']].map(([key, label]) => <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`} tabIndex={tab === key ? 0 : -1} className={tab === key ? 'active' : ''} onClick={() => setTab(key)} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const keys = ['subway', 'bus', 'parking']; const index = keys.indexOf(tab); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3; setTab(keys[next]); document.getElementById(`tab-${keys[next]}`)?.focus(); }}>{label}</button>)}</div>
    <div className="transport-content" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>{tab === 'subway' ? <><h4>지하철 및 셔틀버스 안내</h4><ul>{wedding.transport.subway.map(line => <li key={line}>{line}</li>)}</ul>{wedding.transport.shuttle.start && wedding.transport.shuttle.end && wedding.transport.shuttle.intervalMinutes ? <p>운행: {wedding.transport.shuttle.start} ~ {wedding.transport.shuttle.end}<br />약 {wedding.transport.shuttle.intervalMinutes}분 간격</p> : <div className="transport-note">셔틀 운행 시간과 배차 간격은<br />확정되는 대로 안내드리겠습니다.</div>}<p className="fine-print left">{wedding.transport.subwayNote}</p></> : tab === 'bus' ? <><h4>버스로 오시는 길</h4>{wedding.transport.bus.map(line => <p key={line}>{line}</p>)}</> : <><h4>자가용 및 주차 안내</h4>{wedding.transport.parking.map(line => <p key={line}>{line}</p>)}<p className="fine-print left">내비게이션에 ‘HD현대 글로벌R&D센터’를 검색해 주세요.</p><button className="text-button" onClick={copyAddress}><Copy size={14} />주소 복사하기</button></>}</div>
  </section>;
}

function AccountsSection({ notify }: { notify: (message: string) => void }) {
  return <section id="accounts" className="section accounts-section"><SectionHeading number="08" eyebrow="WITH GRATITUDE" description={<>축하해 주시는 모든 분께 감사드립니다.<br />마음 전하실 곳을 안내드립니다.</>}>마음 전하실 곳</SectionHeading><div className="accordion-group">{(['groom', 'bride'] as Side[]).map(side => <Accordion key={side} title={`${side === 'groom' ? '신랑측' : '신부측'} 마음 전하실 곳`} trailing={side === 'groom' ? 'GROOM' : 'BRIDE'}>{wedding.accounts[side].length ? wedding.accounts[side].map(account => <div className="account" key={`${account.bank}-${account.number}`}><div><small>{account.relationship}</small><strong>{account.holder}</strong><p>{account.bank} <span>{account.number}</span></p></div><button className="text-button" onClick={async () => { try { await copyText(account.number); notify('계좌번호를 복사했습니다.'); } catch (error) { notify((error as Error).message); } }}><Copy size={14} />복사</button></div>) : <p className="pending">계좌 정보는 추후 안내드리겠습니다.</p>}</Accordion>)}</div></section>;
}

export function App() {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);
  const [snapStatus, setSnapStatus] = useState<SnapStatus>();
  const [snapError, setSnapError] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => { if (timer.current) clearTimeout(timer.current); setToast(message); timer.current = setTimeout(() => setToast(''), 5500); }, []);
  const refreshSnap = useCallback(async () => { try { setSnapStatus(await api<SnapStatus>('/api/snaps/status')); setSnapError(false); } catch { setSnapError(true); } }, []);
  useEffect(() => { void refreshSnap(); const timer = setInterval(() => void refreshSnap(), 60_000); return () => clearInterval(timer); }, [refreshSnap]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function shareKakao() {
    try {
      const kakao = await loadKakao();
      kakao.Share.sendDefault({ objectType: 'feed', content: { title: '현범과 주영, 결혼합니다', description: '2027.02.20 토요일 오후 12시 30분\nHD현대글로벌R&D센터 아산홀', imageUrl: new URL(wedding.shareImage, window.location.origin).href, link: { mobileWebUrl: window.location.origin, webUrl: window.location.origin } }, buttons: [{ title: '청첩장 보러 가기', link: { mobileWebUrl: window.location.origin, webUrl: window.location.origin } }] });
    } catch (error) { notify(error instanceof Error ? error.message : '카카오톡 공유를 완료하지 못했습니다.'); }
  }
  async function copyLink() { try { await copyText(`${window.location.origin}/`); notify('청첩장 링크를 복사했습니다.'); } catch (error) { notify((error as Error).message); } }
  return <>
    <a className="skip-link" href="#invitation">청첩장 본문으로 이동</a>
    <aside className="desktop-note"><div className="desktop-note-inner"><span className="eyebrow">WEDDING INVITATION</span><h2 className="desktop-title">Hyunbum<span className="desktop-ampersand">&</span>Juyoung</h2><p>조현범 · 권주영<br />저희의 결혼식에 초대합니다.</p><div className="desktop-date"><strong>02.20</strong><span>FEBRUARY 2027<br />SATURDAY, 12:30 PM</span></div><nav aria-label="청첩장 바로가기"><a href="#gallery">갤러리 <ArrowRight size={14} /></a><a href="#rsvp">참석 여부 <ArrowRight size={14} /></a><a href="#location">오시는 길 <ArrowRight size={14} /></a></nav></div><span className="desktop-bottom">HD HYUNDAI GLOBAL R&D CENTER</span></aside>
    <main className="invitation" id="invitation"><header className="topbar"><a href="#home" className="wordmark">H <span>&</span> J <span className="wordmark-date">27.02.20</span></a><MusicButton notify={notify} /></header>
    <section id="home" className="hero"><div className="hero-topline"><span>WEDDING INVITATION</span><span>FEBRUARY 20, 2027</span></div><h1 className="hero-names"><span>{wedding.groom.name}</span><span className="name-divider" aria-hidden="true" /><span>{wedding.bride.name}</span></h1><p className="hero-english">CHO HYUNBUM <span>&</span> GWON JUYOUNG</p><div className="hero-photo">{wedding.heroPhoto ? <img src={wedding.heroPhoto} alt="조현범과 권주영의 웨딩 사진" fetchPriority="high" decoding="async" style={{ objectPosition: wedding.heroPhotoPosition }} /> : <PhotoPlaceholder hero />}</div><div className="hero-details"><div className="hero-date">2027. 02. 20 <span>SATURDAY</span></div><p className="hero-time">토요일 오후 12시 30분</p><p className="hero-venue">HD현대글로벌R&D센터 아산홀</p><a href="#greeting" className="scroll-cue" aria-label="초대의 글로 이동"><ArrowDown size={15} /></a></div></section>
    <section id="greeting" className="section greeting-section"><SectionHeading number="01" eyebrow="INVITATION">소중한 분들을 초대합니다</SectionHeading><div className="greeting-copy">{wedding.greeting.map((line, i) => line ? <p key={i}>{line}</p> : <br key={i} />)}</div><div className="family-lines"><p><span>조성진 <span className="parent-dot">·</span> 이진용</span><span className="family-order">의 장남</span><strong>현범</strong></p><p><span>권용덕 <span className="parent-dot">·</span> 이선애</span><span className="family-order">의 차녀</span><strong>주영</strong></p></div></section>
    <CalendarSection />
    <GallerySection />
    <section id="rsvp" className="section rsvp-section"><SectionHeading number="04" eyebrow="R.S.V.P." description={<>정성껏 모실 수 있도록<br />참석 여부를 미리 전해 주시면 감사하겠습니다.</>}>참석 여부</SectionHeading><button className="button primary full" onClick={() => setRsvpOpen(true)}>참석 여부 남기기<ArrowRight size={16} /></button><p className="fine-print">결혼식 일주일 전까지 확인 연락드리겠습니다.</p></section>
    <section id="snaps" className="section snap-section"><SectionHeading number="05" eyebrow="WEDDING SNAP" description={<>예식에서 담아 주신 사진을 보내 주세요.<br />소중한 날의 기록으로 간직하겠습니다.</>}>현장 스냅</SectionHeading><div className="snap-notice"><Camera size={25} strokeWidth={1.1} /><div><strong>2027. 02. 20</strong><span>예식 당일부터 사진을 받습니다.</span></div></div><button className="button outline full" onClick={() => { if (snapStatus?.state === 'open') setSnapOpen(true); else if (snapError) { void refreshSnap(); notify('접수 상태를 확인하고 있습니다. 잠시 후 다시 시도해 주세요.'); } else notify(snapStatus?.state === 'closed' ? '현장 스냅 접수가 마감되었습니다. 함께해 주셔서 감사합니다.' : '2027년 2월 20일부터 사진을 보내실 수 있습니다.'); }}><Camera size={16} />{snapStatus?.state === 'open' ? '현장 스냅 올리기' : snapStatus?.state === 'closed' ? '현장 스냅 접수 마감' : snapError ? '접수 상태 다시 확인하기' : '2월 20일부터 이용 가능합니다'}</button><p className="fine-print">사진은 신랑·신부만 확인할 수 있습니다.</p></section>
    <LocationSection notify={notify} />
    <section id="charter" className="section charter-section"><SectionHeading number="07" eyebrow="CHARTER BUS" description="대전·경주에서 오시는 분들을 위한 안내입니다.">대절버스 안내</SectionHeading><div className="accordion-group">{wedding.charterBuses.map(bus => <Accordion key={bus.city} title={`${bus.city} 출발`} trailing="CHARTER BUS">{bus.departure && bus.location ? <dl className="bus-detail"><div><dt>출발 시간</dt><dd>{bus.departure}</dd></div><div><dt>탑승 장소</dt><dd>{bus.location}</dd></div>{bus.contact && <div><dt>문의</dt><dd>{bus.contact}</dd></div>}{bus.note && <p>{bus.note}</p>}</dl> : <p className="pending">출발 시간과 탑승 장소는 추후 안내드리겠습니다.<br />참석 응답에 버스 이용 희망을 남겨 주세요.</p>}</Accordion>)}</div></section>
    <AccountsSection notify={notify} />
    <section id="share" className="section share-section"><SectionHeading number="09" eyebrow="SHARE" description="소중한 분들께 저희의 소식을 전해 주세요.">초대장 전하기</SectionHeading><button className="button kakao-share full" onClick={() => void shareKakao()}><span className="kakao-bubble" />카카오톡으로 공유하기</button><div className="share-buttons"><button className="text-button" onClick={() => void copyLink()}><Copy size={15} />링크 복사하기</button>{!!navigator.share && <button className="text-button" onClick={async () => { try { await navigator.share({ title: '현범과 주영, 결혼합니다', text: '2027.02.20 오후 12시 30분 · HD현대글로벌R&D센터 아산홀', url: `${window.location.origin}/` }); } catch (error) { if ((error as Error).name !== 'AbortError') notify('공유 기능을 사용할 수 없습니다. 링크 복사를 이용해 주세요.'); } }}><Share2 size={15} />다른 앱으로 공유</button>}</div></section>
    <footer className="footer">{wedding.closingPhoto && <img className="closing-photo" src={wedding.closingPhoto} alt="현범과 주영의 마지막 인사" loading="lazy" />}<span className="footer-monogram" aria-hidden="true">H<span>&</span>J</span><p>저희의 시작에 함께해 주셔서 감사합니다.</p><div className="footer-names">조현범<span>·</span>권주영</div><span className="eyebrow">FEBRUARY 20, 2027</span></footer>
    </main>
    <Suspense fallback={null}>{rsvpOpen && <RsvpDialog onClose={() => setRsvpOpen(false)} />}
    {snapOpen && snapStatus && <SnapDialog status={snapStatus} onClose={() => setSnapOpen(false)} onUploaded={() => void refreshSnap()} />}</Suspense>
    <div role="status" aria-live="polite" className={`toast ${toast ? 'visible' : ''}`}>{toast && <><Check size={15} /><span>{toast}</span></>}</div>
    <a className="back-to-top" href="#home" aria-label="맨 위로 이동"><ArrowDown size={16} /></a>
  </>;
}
