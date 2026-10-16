import type { Metadata } from 'next';
import home from '@/components/home/Home.module.css';
import header from '@/components/layout/SiteHeader.module.css';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: '화면 미리보기',
  robots: { index: false, follow: false },
};

export default function Preview() {
  return (
    <>
      <header className={header.header}>
        <div className={header.inner}>
          <a href="/" className={header.brand} aria-label="여행노트 홈">
            {/* biome-ignore lint/performance/noImgElement: 로고 SVG */}
            <img src="/brand/lockup-horizontal.svg" alt="" width={120} height={28} />
          </a>
          <span>화면 미리보기</span>
        </div>
      </header>
      <main id="main" className="page">
        <section className={home.hero} aria-labelledby="preview-title">
          <h1 id="preview-title" className={home.headline}>
            예약은 어디서든, 일정은 여기서.
          </h1>
          <p className={home.lead}>
            여행 당일 손에 들고 보는 일정표예요. 시간과 동선, 메모와 준비물을 한 화면에서 확인해요.
          </p>
        </section>
        <section className={home.section} aria-labelledby="preview-status">
          <h2 id="preview-status" className={home.sectionTitle}>
            백엔드 연결 준비 중
          </h2>
          <p className={home.message}>
            지금은 웹 화면만 미리 볼 수 있어요. 로그인과 샘플 조회, 여행 만들기·편집·공유는 아직 사용할 수 없어요.
          </p>
          <p className={home.message}>이 미리보기에서는 계정 정보나 여행 내용을 입력하거나 저장하지 않아요.</p>
          <div className={home.actions}>
            <Button disabled>로그인 준비 중</Button>
            <Button disabled>샘플 일정 준비 중</Button>
            <Button disabled variant="primary">
              여행 만들기 준비 중
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
