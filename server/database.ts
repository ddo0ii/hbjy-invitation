import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { RsvpInput, RsvpReceipt } from '../shared/contracts.ts';

type RsvpRow = {
  id: string; request_id: string; side: 'groom' | 'bride'; name: string; phone: string;
  attendance: 'yes' | 'no'; guest_count: number; companions: string; meal: 'yes' | 'no' | 'undecided';
  bus: 'none' | '대전' | '경주'; message: string; created_at: string;
};
export type SnapRow = { id: string; uploader: string; file_name: string; byte_size: number; width: number; height: number; created_at: string };

function receipt(row: RsvpRow): RsvpReceipt {
  return { id: row.id, requestId: row.request_id, side: row.side, name: row.name, phone: row.phone, attendance: row.attendance, count: row.guest_count, companions: row.companions, meal: row.meal, bus: row.bus, message: row.message, consent: true, createdAt: row.created_at };
}

export function createStore(dataDir: string) {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(resolve(dataDir, 'wedding.sqlite'));
  db.exec(readFileSync(resolve('server/schema.sql'), 'utf8'));
  return {
    db,
    getRsvp(requestId: string) {
      const row = db.prepare('SELECT * FROM rsvp WHERE request_id = ?').get(requestId) as RsvpRow | undefined;
      return row ? receipt(row) : undefined;
    },
    addRsvp(input: RsvpInput, now: Date): RsvpReceipt {
      const id = randomUUID();
      const createdAt = now.toISOString();
      db.prepare('INSERT INTO rsvp (id, request_id, side, name, phone, attendance, guest_count, companions, meal, bus, message, consent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)')
        .run(id, input.requestId, input.side, input.name, input.phone, input.attendance, input.count, input.companions, input.meal, input.bus, input.message, createdAt);
      return { ...input, id, createdAt };
    },
    listRsvp() { return (db.prepare('SELECT * FROM rsvp ORDER BY created_at DESC').all() as RsvpRow[]).map(receipt); },
    snapCount() { return (db.prepare('SELECT COUNT(*) AS count FROM snapshots').get() as { count: number }).count; },
    addSnaps(rows: SnapRow[]) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const insert = db.prepare('INSERT INTO snapshots (id, uploader, file_name, byte_size, width, height, consent, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)');
        for (const row of rows) insert.run(row.id, row.uploader, row.file_name, row.byte_size, row.width, row.height, row.created_at);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    listSnaps() { return db.prepare('SELECT * FROM snapshots ORDER BY created_at DESC').all() as SnapRow[]; },
    getSnap(id: string) { return db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id) as SnapRow | undefined; },
    close() { db.close(); },
  };
}
