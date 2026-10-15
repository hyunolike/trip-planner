# 여행 일정 서비스 · Design system

## Direction
A practical consumer travel itinerary for adults 30+. The previous cream/forest-green theme is replaced with a white canvas, charcoal typography, neutral separators and a single blue action accent. Structure is chronological and list-led. Existing itinerary content, bookings, source links, maps, videos, photos, local completion state and preparation checks remain intact.

The travel-bird mascot 두리 remains in contextual guidance and maps. The page header uses a standard route icon, and the trip summary uses the existing Osaka Castle photograph. Neither illustrations nor colored cards dominate the schedule.

## Reference patterns inspected on 2026-10-15
- Naver Travel: destination/category separation and place content. https://travel.naver.com/overseas
- NOL: clear travel categories and product information. https://nol.yanolja.com/
- HanaTour: day-by-day itinerary and separate travel information sections. https://www.hanatour.com/trp/pkg/CHPC0PKG0200M200?pkgCd=AKP565250330000
- Modetour: 간략일정 / 상세일정 and daily itinerary structure. https://www.modetour.com/package/103719164?ANO=81202&sno=M112828
These inform information architecture; this app does not reproduce their logos, brand assets, or claim affiliation. Reference review was based on retrieved official page content, not a full visual audit.

## Tokens
| Role | Value |
| --- | --- |
| Canvas and surface | #ffffff |
| Section background | #f7f8fa |
| Primary text | #202124 |
| Supporting text | #62666e |
| Divider | #e5e7eb |
| Primary action | #1765d1 |
| Primary hover | #1051b0 |
| Control radius | 5–6px |
| Image radius | 6–8px |
| Modal radius | 12px; full-screen on phones |

Use one action accent; transport map colors retain their distinct route meaning. Avoid gradients, large pastel blocks, floating decorative badges, soft oversized cards and repeated mascot illustrations.

## Type and spacing
Self-hosted SUIT Variable with Korean system fallbacks. Detail body 16px/1.75; stop title 18px mobile and 20px desktop; section title 20–23px; supporting controls 14px. Small timestamps and status labels are subordinate to the primary content. Use 20px mobile gutters (16px under 360px), 24px desktop gutters and 8/12/16/20/24/32px spacing.

## Components and behavior
- Header: compact title, share action and desktop map/airport actions.
- Trip summary: destination, dates, duration and family size. Existing photo gallery, route, flights and countdown remain available.
- Navigation: five persistent mobile destinations with icon/label and clear selected state. No pill-shaped selected backgrounds.
- Date bar: four day/date/location columns, sticky below the header, blue underline selection.
- Schedule view: native segmented 간략 일정 / 상세 일정 controls. Default is compact. Selecting detailed mode expands all stops and carries the mode to other days.
- Stop row: time column, place title, completion action, duration and location. Native disclosure contains every existing photo, description, source link, reservation and guide. Manual expansion survives same-day redraws.
- Navigation to a place or guide opens the corresponding stop before scrolling/focusing it.
- Supporting weather, photo index, daily notes, tour information and place guides are below the chronological schedule.
- Secondary pages use white list sections, dividers, compact descriptions, consistent buttons and restrained notice surfaces.
- Keep existing safe-area handling, keyboard focus, modal inert/focus trap, reduced motion, and non-blocking startup.

## Verification
All 50 itinerary stops retain their titles and full details. Against the previous render, all links and image/video references remain available across all four days (482 link checks and 72 media checks, including repeated references). Data and guide source files were not modified. Interaction tests cover compact/detail modes, mode persistence across days, manual disclosure persistence after completion, guide reveal, navigation, maps and preparation. Browser visual QA is unavailable in this execution environment and is not implied by DOM tests.

## Implementation
src/design-system.css is the single canonical stylesheet for structure, feature components, typography, countdown layout, motion and responsive corrections. Four earlier stylesheet layers were consolidated and removed; 1,398 shadowed declarations were pruned. src/render.js supplies markup and native disclosures; src/main.js owns navigation and view state. Existing mascot asset: public/illustrations/travel-duri.png.


## Mobile refinement · 2026-10-15
The supplied iPhone screenshot revealed a vertical-wrapping countdown label. A legacy mobile flex-basis:100% rule on the timer squeezed the label. Countdown selectors have been removed from the three legacy stylesheets; experience.css now exclusively owns a nonshrinking label and a flexible numeric row. Travelling/finished states and 320px screens have explicit layouts. CSS source checks do not replace real-device rendering QA.

SUIT Variable is stored at public/fonts/SUIT-Variable.woff2, preloaded from the same origin, with its SIL OFL license included. All mixed Montserrat/legacy UI font declarations now use the shared font token. Body text is 16px, controls 14–16px, stop titles 18–19px on phones; variable weights use a less heavy hierarchy.

Interaction follows Toss's feedback-oriented approach: short touch compression, an animated day underline, a sliding segmented selector, brief day/content transitions, disclosure reveal, and completion feedback. Motion tokens: 140ms/220ms, cubic-bezier(.2,.8,.2,1). User actions remain immediate. Prefers-reduced-motion suppresses all decorative motion. Travel discovery uses existing destination photography and distinct quick actions, informed by Here With Me/여기어때 category and travel-product surfaces; no affiliation or asset copying is implied.
References: https://toss.tech/article/interaction · https://www.yeogi.com/air-hotel · https://github.com/sun-typeface/SUIT


## Unified system and daily routes · 2026-10-15
- Design foundation: clarity of the next action, context, predictable control geometry, one primary action, and consistent type/space/surface/motion tokens. Official references: https://tossmini-docs.toss.im/tds-mobile/ and https://toss.im/tossfeed/article/tossproductprinciples . This is an original travel service system; it does not bundle or claim to be TDS.
- Floating top regression: width/min-width/max-width and height/min-height/max-height are all 48px, padding is zero, and the label is hidden. Bottom offset includes mobile navigation and safe-area. Legacy 86/92px min-width declarations were removed.
- Every day begins with a live Leaflet/OpenStreetMap map, ordered stop controls and per-segment Google Maps URLs. Map route lines are explicitly identified as itinerary/waypoint guidance, not Google-calculated road/transit geometry. No Google Maps API key is configured. Actual Google directions open in the external Google Maps service; embedding/replaying Google-calculated routes remains blocked until a domain-restricted key and necessary map/route API access are provided.
- A companion follows the first stop through the last in a loop. Autoplay is visible-map only, stops when scrolled away or the document is hidden, has pause/replay controls, is torn down during navigation, and is disabled for reduced-motion users. Manual stop selection interrupts playback. Flight/transit/walking camera zooms retain geographic context.
- New vector identity combines a folded note with a route connecting two points. It is rendered into 32/180/192/512px icons, maskable install icon, header and sharing card. The installation sheet shows both the actual icon and an illustrative app launch preview. Preview geometry is not presented as a Google map or a device screenshot.
- Brand source and generation: scripts/build-brand-assets.py; source icons in public/icons; installed miniature in public/images/brand. The font license remains included at public/fonts/SUIT-LICENSE.txt.
- Validation includes loop cancellation, no updates after destroy, reduced-motion completion, route link origin/destination/mode parameters, complete daily stop controls, square floating action sizing, icon dimensions, navigation and all prior content behaviors. The environment still lacks the supported browser-control skill; device/browser visual QA is unverified. No claim that every design reviewer will prefer the visual treatment is made.
