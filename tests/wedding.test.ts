import test from 'node:test';
import assert from 'node:assert/strict';
import { weddingDaysLeft, snapshotState, galleryRows } from '../shared/wedding.ts';

test('D-DAY는 한국 시각의 자정에 바뀐다', () => {
  assert.equal(weddingDaysLeft(new Date('2027-02-19T14:59:59Z')), 1);
  assert.equal(weddingDaysLeft(new Date('2027-02-19T15:00:00Z')), 0);
  assert.equal(weddingDaysLeft(new Date('2027-02-20T15:00:00Z')), -1);
  assert.equal(weddingDaysLeft(new Date('2026-11-04T03:00:00Z')), 108);
});
test('현장 스냅은 한국 시각에 개시하며 마감일은 선택 설정이다', () => {
  assert.equal(snapshotState(new Date('2027-02-19T14:59:59.999Z')), 'scheduled');
  assert.equal(snapshotState(new Date('2027-02-19T15:00:00.000Z')), 'open');
  assert.equal(snapshotState(new Date('2027-03-21T14:59:59.999Z')), 'open');
  assert.equal(snapshotState(new Date('2027-03-21T15:00:00.000Z')), 'open');
  assert.equal(snapshotState(new Date('2027-03-21T15:00:00.000Z'), '2027-03-22T00:00:00+09:00'), 'closed');
});
test('갤러리는 순서를 유지하며 2장·3장·2장 단위로 나눈다', () => {
  const photos = Array.from({ length: 14 }, (_, i) => i);
  const rows = galleryRows(photos);
  assert.deepEqual(rows.map(row => row.length), [2, 3, 2, 2, 3, 2]);
  assert.deepEqual(rows.flat(), photos);
  assert.equal(rows.slice(0, 3).flat().length, 7);
});
