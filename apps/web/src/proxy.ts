import { type NextRequest, NextResponse } from 'next/server';

/** A disconnected UI preview must never execute application routes or forward API requests. */
export function proxy(request: NextRequest) {
  if (process.env.TRIPNOTE_UI_PREVIEW !== '1') return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (path === '/api' || path.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method)) {
    return NextResponse.json(
      { code: 'backend_unavailable', detail: '화면 미리보기입니다. 백엔드 연결 후 사용할 수 있어요.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  }
  if (path.startsWith('/_next/static/') || path.startsWith('/brand/')) return NextResponse.next();

  const response = path === '/preview' ? NextResponse.next() : NextResponse.rewrite(new URL('/preview', request.url));
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
