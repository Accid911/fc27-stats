import ExcelJS from 'exceljs';
import { loadAll } from '@/lib/server-data';
import { buildWorkbook } from '@/lib/workbook';

export const dynamic = 'force-dynamic';

// Public download: every stat until now as an Excel file.
export async function GET() {
  try {
    const data = await loadAll();
    const wb = buildWorkbook(ExcelJS, data);
    const buf = await wb.xlsx.writeBuffer();
    const name = `youth-edition-stats-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('The stats are temporarily unavailable. Please try again in a minute.', { status: 503 });
  }
}
