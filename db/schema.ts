import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';

// 배포용 D1 스키마입니다. 로컬 Node 서버의 DDL은 server/schema.sql에 있습니다.
export const rsvp = sqliteTable('rsvp', {
  id: text('id').primaryKey(), request_id: text('request_id').notNull().unique(),
  side: text('side').notNull(), name: text('name').notNull(), phone: text('phone').notNull(),
  attendance: text('attendance').notNull(), guest_count: integer('guest_count').notNull(),
  companions: text('companions').notNull(), meal: text('meal').notNull(), bus: text('bus').notNull(),
  message: text('message').notNull(), consent: integer('consent').notNull(), created_at: text('created_at').notNull(),
}, table => [
  index('idx_rsvp_created_at').on(table.created_at),
  check('rsvp_side', sql`${table.side} IN ('groom', 'bride')`),
  check('rsvp_attendance', sql`${table.attendance} IN ('yes', 'no')`),
  check('rsvp_count', sql`typeof(${table.guest_count}) = 'integer' AND ${table.guest_count} BETWEEN 0 AND 20`),
  check('rsvp_meal', sql`${table.meal} IN ('yes', 'no', 'undecided')`),
  check('rsvp_bus', sql`${table.bus} IN ('none', '대전', '경주')`), check('rsvp_consent', sql`${table.consent} = 1`),
  check('rsvp_attendance_fields', sql`(${table.attendance} = 'yes' AND ${table.guest_count} >= 1) OR (${table.attendance} = 'no' AND ${table.guest_count} = 0 AND ${table.meal} = 'no' AND ${table.bus} = 'none' AND ${table.companions} = '')`),
]);
export const snapshots = sqliteTable('snapshots', {
  id: text('id').primaryKey(), uploader: text('uploader').notNull(), file_name: text('file_name').notNull().unique(),
  byte_size: integer('byte_size').notNull(), width: integer('width').notNull(), height: integer('height').notNull(),
  consent: integer('consent').notNull(), created_at: text('created_at').notNull(),
}, table => [index('idx_snapshots_created_at').on(table.created_at), check('snapshot_consent', sql`${table.consent} = 1`), check('snapshot_dimensions', sql`${table.byte_size} > 0 AND ${table.width} > 0 AND ${table.height} > 0`)]);
export const adminSessions = sqliteTable('admin_sessions', {
  token_hash: text('token_hash').primaryKey(), expires_at: integer('expires_at').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(), hits: integer('hits').notNull(), reset_at: integer('reset_at').notNull(),
});
