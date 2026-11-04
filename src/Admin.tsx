import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Download, LogOut, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from './api.ts';
import type { RsvpReceipt } from '../shared/contracts.ts';

type Snap = { id: string; uploader: string; created_at: string; width: number; height: number };
type Overview = { rsvps: RsvpReceipt[]; snaps: Snap[]; totals: { responses: number; attending: number; groom: number; bride: number } };
const formatDate = (value: string) => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function Admin() {
  const [overview, setOverview] = useState<Overview>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState('all');
  const [query, setQuery] = useState('');
  const refresh = useCallback(async () => {
    setBusy(true);
    try { setOverview(await api<Overview>('/api/admin/overview')); setError(''); }
    catch (error) { setOverview(undefined); if (!(error as Error).message.includes('로그인')) setError((error as Error).message); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { document.title = '청첩장 관리 · 현범과 주영'; void refresh(); }, [refresh]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get('password');
    setBusy(true); setError('');
    try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); await refresh(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  const rows = overview?.rsvps.filter(row => (side === 'all' || row.side === side) && (!query || row.name.includes(query) || row.phone.includes(query))) ?? [];
  return <main className="admin-shell"><header className="admin-header"><div><h1>현범과 주영의 청첩장 관리</h1><p>참석 응답과 하객이 보내 주신 소중한 사진</p></div><div className="admin-actions"><a className="text-button" href="/"><ArrowLeft size={14} />청첩장</a>{overview && <button className="text-button" onClick={async () => { try { await api('/api/admin/logout', { method: 'POST' }); setOverview(undefined); } catch (error) { setError((error as Error).message); } }}><LogOut size={14} />로그아웃</button>}</div></header>
    {!overview ? <form className="admin-login" onSubmit={login}><span className="eyebrow">FOR THE TWO OF YOU</span><h2>관리자 로그인</h2><p className="muted">.env에 설정한 관리자 비밀번호를 입력해 주세요.</p><label>관리자 비밀번호<input name="password" type="password" minLength={16} required autoComplete="current-password" maxLength={256} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" type="submit" disabled={busy}>{busy ? '확인 중' : '로그인'}</button></form> : <>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="admin-stats">{[['응답 건수', overview.totals.responses], ['총 참석 인원', overview.totals.attending], ['신랑측 인원', overview.totals.groom], ['신부측 인원', overview.totals.bride]].map(([label, count]) => <div className="admin-stat" key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
    <div className="admin-section-head"><h2>참석 응답</h2><div className="admin-actions"><button className="text-button" disabled={busy} onClick={() => void refresh()}><RefreshCw size={14} />새로고침</button><a className="button primary" href="/api/admin/rsvp.xlsx" download><Download size={16} />엑셀 다운로드</a></div></div>
    <div className="admin-filters"><label className="sr-only" htmlFor="admin-search">성함 또는 연락처 검색</label><input id="admin-search" placeholder="성함 또는 연락처 검색" value={query} onChange={event => setQuery(event.target.value)} /><label className="sr-only" htmlFor="side-filter">신랑·신부측 구분</label><select id="side-filter" value={side} onChange={event => setSide(event.target.value)}><option value="all">신랑·신부측 전체</option><option value="groom">신랑측</option><option value="bride">신부측</option></select><span className="fine-print">{rows.length}건</span></div>
    {rows.length ? <div className="table-wrap"><table className="admin-table"><thead><tr>{['접수 (한국 시각)', '구분', '성함', '연락처', '참석', '인원', '동행인', '식사', '버스', '전할 말'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{formatDate(row.createdAt)}</td><td>{row.side === 'groom' ? '신랑측' : '신부측'}</td><td>{row.name}</td><td>{row.phone}</td><td>{row.attendance === 'yes' ? '참석' : '불참'}</td><td>{row.count}명</td><td>{row.companions || '—'}</td><td>{{ yes: '예정', no: '안 함', undecided: '미정' }[row.meal]}</td><td>{row.bus === 'none' ? '이용 안 함' : row.bus}</td><td className="message-cell">{row.message || '—'}</td></tr>)}</tbody></table></div> : <div className="admin-empty">{query || side !== 'all' ? '검색 조건에 맞는 응답이 없습니다.' : '아직 도착한 응답이 없습니다. 첫 소식을 기다리고 있어요.'}</div>}
    <p className="fine-print left">엑셀에는 필터와 관계없이 전체 응답이 담깁니다. 인원은 본인을 포함한 정수 인원입니다.</p>
    <div className="admin-section-head"><h2>현장 스냅 · {overview.snaps.length}장</h2><span className="fine-print">사진은 관리자에게만 공개됩니다.</span></div>
    {overview.snaps.length ? <div className="admin-snaps">{overview.snaps.map(snap => <figure key={snap.id} className="admin-snap"><a href={`/api/admin/snaps/${snap.id}/file`} target="_blank" rel="noreferrer"><img src={`/api/admin/snaps/${snap.id}/file`} loading="lazy" alt={`${snap.uploader} 님이 남긴 현장 스냅`} /></a><figcaption>{snap.uploader} · {formatDate(snap.created_at)}</figcaption><a className="text-button" href={`/api/admin/snaps/${snap.id}/file?download=1`} download><Download size={13} />사진 저장</a></figure>)}</div> : <div className="admin-empty">2월 20일부터 하객이 보내 주시는 사진이 여기에 모입니다.</div>}
    <p className="fine-print left">개인정보 및 사진은 예식 후 90일 이내 삭제해 주세요. data 폴더에는 개인정보가 있으므로 공개 저장소에 올리지 않습니다.</p>
    </>}
  </main>;
}
