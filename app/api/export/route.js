import ExcelJS from 'exceljs';
import { loadAll, loadEdition } from '@/lib/server-data';
import { buildWorkbook } from '@/lib/workbook';

export const dynamic = 'force-dynamic';

// Public download: every stat until now as an Excel file.
export async function GET(request) {
  try {
    // ?edition=N downloads one edition of the archive (hidden editions only for admins)
    const n = new URL(request.url).searchParams.get('edition');
    const data = n ? await loadEdition(n) : await loadAll();
    if (!data) return new Response('Not found', { status: 404 });
    const wb = buildWorkbook(ExcelJS, data);
    const buf = await wb.xlsx.writeBuffer();
    const slug = n && data.edition ? `-${data.edition.number}-${data.edition.club.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '';
    const name = `youth-edition-stats${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
