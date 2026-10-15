const posts = [
 {label:'스탠다드 프로덕츠 · 여행 소품',url:'https://www.instagram.com/reel/DbrwhpZyoEz/',status:'@god_seunghee · 2026.08.05',text:'보냉백·휴대용 실내화·식기·컬러 수건을 확인할 수 있어요. 게시물 당시 가격보다 현재 매장 가격과 크기를 우선해요.'},
 {label:'돈키호테 · PB·과자·생활·뷰티',url:'https://www.instagram.com/p/DdsH6Gzkkee/?img_index=2',status:'@monster_travel__ · 2026.09.14 · 카드뉴스 사진 확인',text:'요청하신 두 번째 장의 PB 상품을 먼저 넣고 다른 장의 선물 과자·생활·뷰티 소품도 묶었어요. 게시물 추천을 참고한 구매 후보입니다.'},
 {label:'스탠다드 프로덕츠 · 확장형 숄더백',url:'https://www.instagram.com/reel/DdoFswJN8ZJ/',status:'@trip_japan_momo · 2026.09.23',text:'작게 접었다가 펼쳐 쓰는 여행 보조가방을 확인할 수 있어요. 브랜드는 소개글로 확인했고 정확한 품번·크기는 원본 영상과 매장에서 비교해요.'},
 {label:'몽벨 · 작은 동전지갑',url:'https://www.instagram.com/reel/DcYnVJmS93_/',status:'@_su.rok · 2026.08.23',text:'작은 동전지갑을 확인할 수 있어요. 사진·공식 링크는 카드와 현금도 수납하는 트레일 월렛 예시입니다. 영상과 같은 품번인지 확인해요.'},
 {label:'몽벨 · 원통형 미니 더플백',url:'https://www.instagram.com/reel/DcKoXj4Bz4m/',status:'@manggu_pick · 2026.08.17',text:'토트·크로스로 쓰는 원통형 가방을 확인할 수 있어요. 공식 예시는 L.W. 더플 5이며 정확한 품번과 색상은 원본·매장에서 비교해요.'},
];
export function renderSharedShopping() {
 return `<section class="shared-shopping"><h2>쇼핑 참고 영상</h2><p>상품 크기와 사용 모습을 영상에서 확인하세요. 일부 공식 제품 링크는 참고용 예시입니다.</p><div class="shared-shopping-grid">${posts.map((post,index)=>`<article><small>참고 ${index+1} · ${post.status}</small><h3>${post.label}</h3><p>${post.text}</p><a class="source-link" href="${post.url}" target="_blank" rel="noopener noreferrer">원본 게시물 보기</a></article>`).join('')}</div></section>`;
}
