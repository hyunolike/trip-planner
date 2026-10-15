export function renderDotonboriHighlight(stopId) {
  if (stopId !== 'd1-dotonbori-walk') return '';
  return `<aside class="dotonbori-highlight" data-dotonbori-highlight aria-labelledby="glico-highlight-title">
    <a class="glico-photo" href="/images/dotonbori/glico-shared.jpeg" target="_blank" rel="noreferrer" aria-label="글리코 간판 안내 이미지 보기 (새 탭)"><img src="/images/dotonbori/glico-shared.jpeg" alt="도톤보리 글리코 간판 안내 이미지. 이미지 속 1월 30일 표기는 아래 공식 일정과 다릅니다." width="1170" height="1536" loading="lazy" decoding="async"><span>사진 크게 보기 ↗</span></a>
    <div class="glico-highlight-copy"><span class="glico-badge">이번 여행 사진 포인트</span><h4 id="glico-highlight-title">6대 글리코 간판과<br>가족사진 남기기</h4><p>10월 21일 도톤보리 산책 때, 에비스바시에서 두 팔을 들고 함께 찍어 보세요.</p><div class="glico-official-note"><b>공식 일정 · 2026년 11월 말까지 게시</b><p>현재 간판은 11월 말 게시 종료 후 12월부터 공사에 들어가며, 새 간판은 2027년 봄 공개 예정이에요. 여행일은 게시 종료 전입니다.</p></div><p class="glico-image-correction">안내 이미지의 ‘1월 30일’과 공식 발표가 달라요. 방문 계획은 아래 공식 안내를 기준으로 확인해 주세요.</p><div class="source-row"><button type="button" class="map-focus-link" data-map-stop="d1-dotonbori-walk">에비스바시 위치 보기</button><a class="source-link" href="https://prtimes.jp/main/html/rd/p/000000671.000001124.html" target="_blank" rel="noreferrer">글리코 공식 발표 ↗</a></div><small>2026.10.14 공식 발표 확인</small></div>
  </aside>`;
}

// Observe the new DOM after each itinerary render; animation runs once per card.
export function observeDotonboriHighlight(root) {
  const card = root.querySelector('[data-dotonbori-highlight]');
  if (!card || !globalThis.IntersectionObserver) return null;
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      card.classList.add('is-in-view');
      observer.disconnect();
    }
  }, { threshold: 0.12 });
  observer.observe(card);
  return observer;
}
