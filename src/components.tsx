import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X, Plus, ArrowUpRight } from 'lucide-react';

export function SectionHeading({ number, eyebrow, children, description }: { number: string; eyebrow: string; children: ReactNode; description?: ReactNode }) {
  return <header className="section-heading"><span className="eyebrow"><span aria-hidden="true">{number}</span>{eyebrow}</span><h2>{children}</h2>{description && <p>{description}</p>}</header>;
}

export function Accordion({ title, children, trailing }: { title: string; children: ReactNode; trailing?: string }) {
  return <details className="accordion"><summary><span>{title}</span><span className="accordion-end">{trailing && <small>{trailing}</small>}<Plus size={17} /></span></summary><div className="accordion-content">{children}</div></details>;
}

export function Dialog({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`dialog ${className}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-inner"><header className="dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="창 닫기" onClick={onClose}><X size={22} /></button></header>{children}</div>
  </dialog>;
}

export function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> (새 창)</span></a>;
}

export function PhotoPlaceholder({ index = 0, hero = false }: { index?: number; hero?: boolean }) {
  return <div className={`photo-placeholder palette-${index % 5} ${hero ? 'hero-placeholder' : ''}`}>
    <div className="paper-plane" aria-hidden="true" />
    {hero ? <><span className="placeholder-edition">THE WEDDING OF</span><div className="placeholder-monogram" aria-hidden="true"><span>H</span><span className="monogram-ampersand">&</span><span>J</span></div><div className="placeholder-caption"><span>HYUNBUM & JUYOUNG</span><span>20 FEBRUARY 2027</span></div></> : <><span className="gallery-monogram" aria-hidden="true">H<span>&</span>J</span><span className="photo-number">{String(index + 1).padStart(2, '0')}</span></>}
  </div>;
}
