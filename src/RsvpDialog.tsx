import { useState, type FormEvent } from 'react';
import { Check, Heart, ArrowRight, LoaderCircle } from 'lucide-react';
import { wedding, type Side } from '../shared/wedding.ts';
import { rsvpSchema, type RsvpReceipt } from '../shared/contracts.ts';
import { Dialog, Flower } from './components.tsx';
import { api } from './api.ts';

export function RsvpDialog({ onClose }: { onClose: () => void }) {
  const [side, setSide] = useState<Side>('groom');
  const [attendance, setAttendance] = useState('yes');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<RsvpReceipt>();
  const [requestId] = useState(() => crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const input = {
      requestId, side, name: String(data.get('name') ?? '').trim(), phone: String(data.get('phone') ?? '').replace(/[-\s]/g, ''),
      attendance, count: attendance === 'yes' ? Number(data.get('count')) : 0,
      companions: attendance === 'yes' ? String(data.get('companions') ?? '').trim() : '',
      meal: attendance === 'yes' ? data.get('meal') : 'no', bus: attendance === 'yes' ? data.get('bus') : 'none',
      message: String(data.get('message') ?? '').trim(), consent: data.get('consent') === 'on',
    };
    const parsed = rsvpSchema.safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true); setError('');
    try { const result = await api<{ receipt: RsvpReceipt }>('/api/rsvp', { method: 'POST', body: JSON.stringify(parsed.data) }); setReceipt(result.receipt); }
    catch (error) { setError(error instanceof Error ? error.message : '저장하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <Dialog title={receipt ? '마음이 도착했어요' : '참석 여부 남기기'} onClose={() => { if (!busy) onClose(); }}>
    {receipt ? <div className="receipt"><div className="success-mark"><Check /></div><h3>전달되었습니다.</h3><p>{receipt.name} 님, 소중한 마음 감사합니다.</p><dl>
      <div><dt>전달받는 사람</dt><dd>{receipt.side === 'groom' ? '신랑 조현범' : '신부 권주영'}</dd></div>
      <div><dt>참석 여부</dt><dd>{receipt.attendance === 'yes' ? `참석 · 본인 포함 ${receipt.count}명` : '참석이 어려워요'}</dd></div>
      <div><dt>연락처</dt><dd>{receipt.phone}</dd></div>
      {receipt.attendance === 'yes' && <><div><dt>식사</dt><dd>{{ yes: '식사 예정', no: '식사 안 함', undecided: '미정' }[receipt.meal]}</dd></div><div><dt>대절버스</dt><dd>{receipt.bus === 'none' ? '이용 안 함' : `${receipt.bus} 출발`}</dd></div></>}
      {receipt.companions && <div><dt>함께 오시는 분</dt><dd>{receipt.companions}</dd></div>}
      {receipt.message && <div><dt>전할 말</dt><dd>{receipt.message}</dd></div>}
    </dl><p className="fine-print">결혼식 일주일 전까지 확인 연락드리겠습니다.</p><button className="button primary full" onClick={onClose}>닫기</button></div> : <form onSubmit={submit} className="rsvp-form">
      <fieldset disabled={busy} className="form-fieldset"><legend className="sr-only">참석 정보</legend>
      <div className="segmented"><button type="button" className={side === 'groom' ? 'selected' : ''} aria-pressed={side === 'groom'} onClick={() => setSide('groom')}>신랑측</button><button type="button" className={side === 'bride' ? 'selected' : ''} aria-pressed={side === 'bride'} onClick={() => setSide('bride')}>신부측</button></div>
      <div className="side-guide" aria-live="polite"><Flower /><div><h3>{wedding.rsvp[side].title}</h3><p>{wedding.rsvp[side].description}</p></div></div>
      <label>성함 <span className="required">*</span><input name="name" autoComplete="name" placeholder="성함을 남겨 주세요" maxLength={30} required /></label>
      <label>연락처 <span className="required">*</span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="010-0000-0000" maxLength={14} required /><small>예식 안내와 참석 확인을 위해 사용합니다.</small></label>
      <label>참석 여부<select name="attendance" value={attendance} onChange={event => setAttendance(event.target.value)}><option value="yes">기쁜 마음으로 참석할게요</option><option value="no">멀리서 마음을 전할게요</option></select></label>
      {attendance === 'yes' && <><div className="form-columns"><label>참석 인원<select name="count" defaultValue="1">{Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}명{i === 0 ? ' (본인)' : ' (본인 포함)'}</option>)}</select></label><label>식사 여부<select name="meal" defaultValue="yes"><option value="yes">식사 예정</option><option value="no">식사 안 함</option><option value="undecided">아직 미정</option></select></label></div>
      <label>함께 오시는 분 <span className="optional">선택</span><input name="companions" placeholder="동행인 성함" maxLength={100} /></label>
      <label>대절버스<select name="bus" defaultValue="none"><option value="none">이용 안 함</option><option value="대전">대전 출발 · 이용 희망</option><option value="경주">경주 출발 · 이용 희망</option></select><small>이용 희망을 남겨 주시면 확정된 일정을 안내드릴게요.</small></label></>}
      <label>전하고 싶은 말 <span className="optional">선택</span><textarea name="message" placeholder="짧은 인사도 반가워요" rows={2} maxLength={300} /></label>
      <details className="privacy"><summary>개인정보 수집·이용 안내</summary><p>수집 항목: 성함, 연락처, 참석·식사·동행인·버스 정보 및 남겨 주신 말. 이용 목적: 결혼식 참석 확인 및 안내. 보유 기간: 예식 후 90일까지. 신랑·신부만 확인하며, 동의를 거부하실 수 있으나 온라인 접수는 어렵습니다. 예식 후 운영자가 데이터를 삭제합니다.</p></details>
      <label className="checkbox"><input type="checkbox" name="consent" required /><span>참석 안내를 위한 개인정보 수집·이용에 동의합니다.</span></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="submit" className="button primary full" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} />전달 중이에요</> : <>마음 전달하기<ArrowRight size={17} /></>}</button>
      <p className="fine-print">결혼식 일주일 전까지 확인 연락드리겠습니다.</p>
      </fieldset>
    </form>}
  </Dialog>;
}
