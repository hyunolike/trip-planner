import type { NextConfig } from 'next';

const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:8080';

const config: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  transpilePackages: ['@tripnote/design-tokens'],
  // 브라우저는 같은 출처로만 요청한다. 세션 쿠키(__Host-SESSION)와 CSRF 쿠키가 웹 출처에 붙는다.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
      { source: '/oauth2/:path*', destination: `${apiOrigin}/oauth2/:path*` },
      { source: '/login/oauth2/:path*', destination: `${apiOrigin}/login/oauth2/:path*` },
    ];
  },
};

export default config;
