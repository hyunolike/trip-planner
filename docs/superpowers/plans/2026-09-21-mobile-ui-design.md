# Mobile UI Design

## Goal

Make the existing Osaka–Kyoto family itinerary comfortable to use one-handed on 390–430 px phones without changing itinerary content or the desktop layout.

## Design system

- Color: ticket paper `#f5f1e3`, ink `#20252b`, Osaka red `#c94235`, transit blue `#3e87a8`, Kyoto orange `#e9853c`, route yellow `#f2c84b`.
- Type: Noto Sans KR for Korean guidance and Montserrat for route codes, times, and day numbers.
- Layout: the desktop timeline stays rail-based; below 600 px it becomes a stack of full-width ticket cards with the time and transport emoji as the ticket header.
- Touch: actionable controls use at least 44 px of height and clear pressed/focus states.
- Motion: the family route remains the single expressive motion; other controls stay quiet and honor reduced-motion preferences.

## Mobile wireframes

```text
┌ OSAKA/KYOTO ─── [🗺 지도] [✈ 공항] ┐
├ 3박 4일 가족여행                       ┤
│  ←  GMP ━ KIX ━ OSA ━ KYO  →          │
├ [DAY 1] [DAY 2] [DAY 3] [DAY 4] →    ┤
│ ┌ 09:50  🚌 ─────────── [찍기] ┐       │
│ │ 간사이공항 도착                         │
│ │ 설명 / 교통 / 지도 버튼                  │
│ └──────────────────────────────┘       │
```

```text
┌ 실제 이동 지도                    [×] ┐
├ [D1] [D2] [D3] [D4] →                ┤
├ [▶ 하루 경로 재생]                    ┤
│              MAP 45vh                │
├ 1 09:50 간사이공항                ↗  │
│ 2 11:40 호텔                      ↗  │
└────────────────────────────────────┘
```

## Review against the brief

The ticket-paper palette and heavy route typography come directly from the existing family travel pass, so the mobile version does not introduce a generic card kit or a new visual language. The only structural change is density: horizontal elements become swipeable, the timeline rail disappears below 600 px, and both guides become edge-to-edge sheets. The family route remains the memorable element rather than adding decorative animation.

