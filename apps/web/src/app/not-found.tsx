import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="page">
      <h1>일정을 찾을 수 없어요</h1>
      <p>링크가 바뀌었거나 공개가 끝난 일정이에요. 주소를 다시 확인해 주세요.</p>
      <p>
        <Link href="/">홈으로 가기</Link>
      </p>
    </main>
  );
}
