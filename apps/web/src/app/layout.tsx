import { colors } from '@tripnote/design-tokens';
import '@tripnote/design-tokens/tokens.css';
import type { Metadata, Viewport } from 'next';
import { Gowun_Batang, IBM_Plex_Mono, IBM_Plex_Sans_KR } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

// 한글 서체 파일은 크기가 커서 미리 불러오지 않는다. 글자 범위별로 나뉜 파일을 화면에 필요한 만큼만 받는다.
const display = Gowun_Batang({
  weight: ['400', '700'],
  variable: '--font-display-web',
  display: 'swap',
  preload: false,
});
const sans = IBM_Plex_Sans_KR({
  weight: ['400', '500', '600'],
  variable: '--font-sans-web',
  display: 'swap',
  preload: false,
});
const mono = IBM_Plex_Mono({ weight: ['500'], subsets: ['latin'], variable: '--font-mono-web', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_ORIGIN ?? 'http://localhost:3000'),
  title: { default: '여행노트', template: '%s · 여행노트' },
  description: '예약은 어디서든, 일정은 여기서. 여행 당일 손에 들고 보는 일정표예요.',
  icons: { icon: '/brand/favicon.svg', apple: '/brand/app-icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: colors.light.canvas },
    { media: '(prefers-color-scheme: dark)', color: colors.dark.canvas },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          본문으로 건너뛰기
        </a>
        {process.env.TRIPNOTE_FREE_HOSTING === '1' && (
          <p role="status" style={{ padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
            무료 체험 서버는 쉬고 있을 수 있어요. 처음 연결할 때 몇 분 걸릴 수 있어요. 저장 중 연결이 끊기면 결과를
            확인한 뒤 다시 시도해 주세요.
          </p>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
