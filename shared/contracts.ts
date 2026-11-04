import { z } from 'zod';

const cleanText = (max: number) => z.string().trim().max(max).refine(value => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value), '사용할 수 없는 문자가 있습니다.');
export const rsvpSchema = z.object({
  requestId: z.uuid(),
  side: z.enum(['groom', 'bride']),
  name: cleanText(30).pipe(z.string().min(1, '성함을 입력해 주세요.')),
  phone: z.string().regex(/^01[016789][0-9]{7,8}$/, '휴대전화 번호를 확인해 주세요.'),
  attendance: z.enum(['yes', 'no']),
  count: z.number().int().min(0).max(20),
  companions: cleanText(100),
  meal: z.enum(['yes', 'no', 'undecided']),
  bus: z.enum(['none', '대전', '경주']),
  message: cleanText(300),
  consent: z.literal(true),
}).strict().superRefine((value, ctx) => {
  if (value.attendance === 'yes' && value.count < 1) ctx.addIssue({ code: 'custom', path: ['count'], message: '본인을 포함한 인원을 입력해 주세요.' });
  if (value.attendance === 'no' && (value.count !== 0 || value.meal !== 'no' || value.bus !== 'none' || value.companions !== '')) ctx.addIssue({ code: 'custom', message: '불참 시 인원·식사·버스·동행인 정보를 다시 확인해 주세요.' });
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
export type RsvpReceipt = RsvpInput & { id: string; createdAt: string };
export type SnapStatus = { state: 'scheduled' | 'open' | 'closed'; opensAt: string; closesAt: string | null; count: number; maxFiles: number; maxFileBytes: number };
