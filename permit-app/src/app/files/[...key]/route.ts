import { NextRequest } from 'next/server';
import { readFile, contentTypeFor } from '@/lib/storage';

// Serves files saved under /storage (township PDF templates, employee photos, batches).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const relKey = key.join('/');
  try {
    const buf = await readFile(relKey);
    const download = relKey.endsWith('.pdf') ? 'inline' : 'inline';
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': contentTypeFor(relKey),
        'Content-Disposition': `${download}; filename="${relKey.split('/').pop()}"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
