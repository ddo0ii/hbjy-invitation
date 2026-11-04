import writeXlsxFile, { type SheetData } from 'write-excel-file/universal';
import type { RsvpReceipt } from './contracts.ts';

export function rsvpWorkbook(rows: RsvpReceipt[]): Promise<Blob> {
  const headers = ['접수 일시 (한국)', '구분', '성함', '연락처', '참석', '인원 (본인 포함)', '동행인', '식사', '대절버스', '전할 말', '수집 동의', '접수 번호'];
  const data: SheetData = [headers.map(value => ({ value, fontWeight: 'bold', color: '#FFFFFF', backgroundColor: '#3962A4' }))];
  for (const row of rows) {
    const cells = [new Date(row.createdAt).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }), row.side === 'groom' ? '신랑측' : '신부측', row.name, row.phone, row.attendance === 'yes' ? '참석' : '불참', row.count, row.companions, { yes: '예정', no: '안 함', undecided: '미정' }[row.meal], row.bus === 'none' ? '이용 안 함' : row.bus, row.message, '동의', row.id];
    // 연락처의 앞자리 0을 보존하고 사용자 입력을 수식으로 해석하지 않습니다.
    data.push(cells.map(value => typeof value === 'number' ? { value, type: Number } : { value, type: String }));
  }
  return writeXlsxFile(data, { sheet: '참석 응답', stickyRowsCount: 1, columns: [24, 10, 16, 18, 10, 18, 24, 12, 12, 40, 12, 38].map(width => ({ width })) }).toBlob();
}
