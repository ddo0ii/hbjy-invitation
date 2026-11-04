import type { RsvpReceipt } from './contracts.ts';

export type RsvpRow = {
  id: string; request_id: string; side: 'groom' | 'bride'; name: string; phone: string;
  attendance: 'yes' | 'no'; guest_count: number; companions: string; meal: 'yes' | 'no' | 'undecided';
  bus: 'none' | '대전' | '경주'; message: string; created_at: string;
};
export function receiptFromRow(row: RsvpRow): RsvpReceipt {
  return { id: row.id, requestId: row.request_id, side: row.side, name: row.name, phone: row.phone, attendance: row.attendance, count: row.guest_count, companions: row.companions, meal: row.meal, bus: row.bus, message: row.message, consent: true, createdAt: row.created_at };
}
