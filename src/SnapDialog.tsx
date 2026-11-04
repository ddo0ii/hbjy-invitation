import { useEffect, useState, type FormEvent } from 'react';
import { Camera, Check, LoaderCircle, Upload, X } from 'lucide-react';
import { Dialog } from './components.tsx';
import { api } from './api.ts';
import type { SnapStatus } from '../shared/contracts.ts';

export function SnapDialog({ status, onClose, onUploaded }: { status: SnapStatus; onClose: () => void; onUploaded: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  useEffect(() => { const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    if (!files.length) { setError('함께 나눌 사진을 선택해 주세요.'); return; }
    const body = new FormData(event.currentTarget);
    body.delete('photos'); body.set('consent', 'true');
    for (const file of files) body.append('photos', file);
    setBusy(true); setError('');
    try { const result = await api<{ message: string }>('/api/snaps', { method: 'POST', body }); setSuccess(result.message); onUploaded(); }
    catch (error) { setError(error instanceof Error ? error.message : '사진을 전달하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  return <Dialog title="우리의 순간을 나눠 주세요" onClose={() => { if (!busy) onClose(); }}>
    {success ? <div className="receipt"><div className="success-mark"><Check /></div><h3>사진이 도착했어요!</h3><p>{success}</p><button className="button primary full" onClick={onClose}>닫기</button></div> : <form className="snap-form" onSubmit={submit}><fieldset className="form-fieldset" disabled={busy}>
      <p className="muted">하객의 시선으로 담은 오늘,<br />저희에게 오래도록 남을 선물이 될 거예요.</p>
      <label>성함<input name="name" autoComplete="name" maxLength={30} required placeholder="사진을 보내 주시는 분" /></label>
      <label className="upload-zone"><Camera size={30} /><strong>사진 선택하기</strong><span>한 번에 5장 · 장당 10MB 이하</span><input type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={event => { const chosen = Array.from(event.target.files ?? []); if (chosen.length > status.maxFiles || chosen.some(file => file.size > status.maxFileBytes)) { setError('사진은 한 번에 5장, 장당 10MB까지 선택해 주세요.'); event.target.value = ''; return; } setFiles(chosen); setError(''); }} /></label>
      {!!files.length && <div className="upload-previews">{files.map((file, i) => <div key={`${file.name}-${i}`}><img src={previews[i]} alt={`선택한 사진 ${i + 1}`} /><button type="button" className="icon-button" aria-label={`${i + 1}번째 사진 선택 취소`} onClick={() => setFiles(files.filter((_, index) => index !== i))}><X size={14} /></button></div>)}</div>}
      <p className="fine-print">사진은 신랑·신부만 확인하며 공개되지 않습니다.<br />위치 정보는 제거하고 고화질 WEBP로 보관합니다.<br />원본 파일이 필요한 사진은 별도로 전달해 주세요.</p>
      <label className="checkbox"><input type="checkbox" name="consent" required /><span>촬영 대상의 동의를 받은 사진이며, 성함과 사진을 예식 기록용으로 수집·보관하는 데 동의합니다. 예식 후 90일 이내 운영자가 삭제합니다.</span></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="button primary full" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} />사진을 보내고 있어요</> : <><Upload size={17} />사진 전달하기</>}</button>
    </fieldset></form>}
  </Dialog>;
}
