from pathlib import Path
from html import escape
root=Path(__file__).resolve().parents[2]/'docs/assets';root.mkdir(exist_ok=True)
class Diagram:
 def __init__(self,title,desc):
  self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="930" viewBox="0 0 1200 930" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#53657c"/></marker></defs><rect width="1200" height="930" fill="#f8fafc"/>']
  self.text(54,52,title,29,'#152b46',True)
 def text(self,x,y,t,size=18,color='#42546a',bold=False):
  self.s.append(f'<text x="{x}" y="{y}" font-family="Arial, Noto Sans CJK KR, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{escape(t)}</text>')
 def box(self,x,y,w,h,title,lines,kind='current'):
  color={'current':'#304d73','live':'#087d73','proposed':'#b27715'}[kind];fill={'current':'#ffffff','live':'#e8f7f2','proposed':'#fff8e7'}[kind]
  dash=' stroke-dasharray="8 5"' if kind=='proposed' else ''
  self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" stroke="{color}" stroke-width="2"{dash}/>')
  self.text(x+19,y+32,title,21,color,True)
  for i,line in enumerate(lines):self.text(x+19,y+62+i*26,line,17)
 def path(self,d):self.s.append(f'<path d="{d}" fill="none" stroke="#53657c" stroke-width="2.5" marker-end="url(#arrow)"/>')
 def frame(self,x,y,w,h,title,kind):
  color='#087d73' if kind=='live' else '#b27715';self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" fill="none" stroke="{color}" stroke-width="2" stroke-dasharray="9 6"/>');self.text(x+20,y+31,title,22,color,True)
 def save(self,name):
  self.s.append('</svg>');(root/name).write_text('\n'.join(self.s))
for ko in [False,True]:
 suffix='ko' if ko else 'en'
 d=Diagram('여행노트 · 현재 코드의 시스템 구조' if ko else 'Tripnote · implemented system architecture','Arrows reflect source code; local implementation is distinct from deployed infrastructure.')
 d.text(54,86,'구현된 로컬 흐름 · 외부 제공자 설정과 운영 검증은 별도' if ko else 'Implemented local flows · provider setup and production validation are separate',18)
 d.box(90,140,300,110,'브라우저' if ko else 'Browser',['일정 읽기 · 편집 · 공유' if ko else 'Read, edit and share trips','세션 쿠키 + CSRF' if ko else 'Session cookie + CSRF'])
 d.box(470,140,300,110,'Next.js 웹' if ko else 'Next.js web',['서버 렌더링 · API client' if ko else 'Server rendering + API client','동일 출처 rewrite' if ko else 'Same-origin rewrites'])
 d.path('M390 195 H470');d.text(404,180,'HTTPS',15)
 d.box(90,380,300,150,'브라우저 저장소' if ko else 'Browser storage',['localStorage: 사용자별 편집 큐' if ko else 'localStorage: per-user edit queue','localStorage: 준비물/방문 상태' if ko else 'localStorage: local checks','충돌 시 전송 중지·초안 유지' if ko else 'Pause on conflict; retain drafts'])
 d.path('M240 250 V380')
 d.box(470,350,300,210,'Kotlin / Spring Boot API',['auth · trip · weather','Spring Modulith','권한 · 버전 · 작업 ID 검증' if ko else 'Access, versions, mutation IDs','bounded readiness: DB + Redis','메일 이벤트 → 전송 인터페이스' if ko else 'Mail events → transport'])
 d.path('M620 250 V350');d.text(650,295,'/api · /oauth2',16);d.text(650,321,'/login/oauth2',16)
 d.box(860,350,260,210,'외부 연동' if ko else 'External integrations',['Open-Meteo: 날씨' if ko else 'Open-Meteo: forecasts','Pwned Passwords: 범위 조회' if ko else 'Pwned Passwords: range API','Google OIDC: 설정 필요' if ko else 'Google OIDC: setup required'])
 d.path('M770 435 H860')
 d.box(860,140,260,110,'지도 타일' if ko else 'Map tiles',['OpenFreeMap','브라우저에서 직접 조회' if ko else 'Fetched by browser'])
 d.path('M300 140 V115 H990 V140')
 d.box(90,690,300,130,'Valkey / Redis',['HTTP 세션 · 요청 제한' if ko else 'HTTP sessions + rate limits','날씨 캐시 · indexed 세션 취소' if ko else 'Weather cache + session indexes'])
 d.box(470,690,300,130,'PostgreSQL + PostGIS',['사용자 · 여행 · 공유 토큰 해시' if ko else 'Users, trips, share token hashes','트랜잭션 · 미완료 메일 이벤트' if ko else 'Transactions + durable events'])
 d.path('M520 560 V610 H240 V690');d.text(120,594,'세션 상태' if ko else 'Session state',17)
 d.path('M620 560 V690');d.text(642,637,'SQL / TX',17)
 d.box(860,690,260,130,'메일 전송' if ko else 'Mail delivery',['로컬: SMTP / Mailpit' if ko else 'Local: SMTP / Mailpit','HTTPS: 제공자 미선정' if ko else 'HTTPS: provider not selected'],'proposed')
 d.path('M770 510 H810 V755 H860')
 d.text(54,878,'실선: 구현된 코드 경로  |  점선: 승인·연결 대기  |  현재 공개 API 운영 구성도가 아님' if ko else 'Solid: implemented code path  |  Dashed: approval/setup pending  |  Not a live production topology',17)
 d.save('system-architecture-'+suffix+'.svg')
 d=Diagram('여행노트 · 배포 상태와 제안 구성' if ko else 'Tripnote · deployment status and proposed topology','Existing protected UI-only Preview is separate from proposed free services; no Render/Neon/Upstash production connection.')
 d.frame(40,100,1120,190,'현재: 보호된 화면 미리보기' if ko else 'CURRENT: protected UI-only Preview','live')
 d.box(80,155,270,100,'브라우저' if ko else 'Browser',['Vercel 접근 보호 적용' if ko else 'Vercel access protection applies'],'live')
 d.box(450,155,340,100,'Vercel Preview',['TRIPNOTE_UI_PREVIEW=1'],'live')
 d.box(900,155,210,100,'API 미연결' if ko else 'No connected API',['요청: 503 안내' if ko else 'Requests: 503 notice'],'live')
 d.path('M350 205 H450');d.path('M790 205 H900')
 d.frame(40,330,1120,510,'제안: 무료 플랜 연결 · 아직 운영 배포되지 않음' if ko else 'PROPOSED: free-plan integration · not deployed to production','proposed')
 d.box(80,400,220,110,'브라우저' if ko else 'Browser',['세션 + CSRF' if ko else 'Session + CSRF'],'proposed')
 d.box(400,400,270,110,'Vercel Hobby',['Next.js 연결 대상' if ko else 'Next.js connected web target','후보: tripnote 하위 도메인' if ko else 'Candidate: tripnote subdomain'],'proposed')
 d.box(800,400,300,110,'Render Free API',['Java 25 · 512MB / 0.1CPU','bounded readiness < 5s'],'proposed')
 d.path('M300 452 H400');d.path('M670 452 H800');d.text(685,431,'HTTPS',16)
 d.box(80,675,280,125,'HTTPS 메일 제공자' if ko else 'HTTPS email provider',['미선정 · 가입/키 발급 안 함' if ko else 'Not selected; no account/key','발신 도메인 검증 승인 필요' if ko else 'Sender-domain approval needed'],'proposed')
 d.box(510,675,270,125,'Neon Free',['PG18 + PostGIS','runtime pool / direct Flyway'],'proposed')
 d.box(850,675,270,125,'Upstash Free 후보' if ko else 'Upstash Free candidate',['native TCP / TLS','세션 호환성 검증 대기' if ko else 'Session compatibility pending'],'proposed')
 d.path('M900 510 V585 H645 V675');d.text(535,568,'TLS · JDBC',16)
 d.path('M1000 510 V675');d.text(1020,595,'TLS',16)
 d.path('M800 480 H755 V610 H220 V675');d.text(275,597,'HTTPS / 443',16)
 d.text(54,888,'도메인 연결·계정·새 자격증명·실서비스 검증·게시: 승인 대기' if ko else 'Domain setup, accounts, new credentials, live validation and publication require approval',18)
 d.save('deployment-architecture-'+suffix+'.svg')
