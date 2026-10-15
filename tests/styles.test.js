/** @vitest-environment jsdom */
import { beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const css=readFileSync('src/design-system.css','utf8');
beforeEach(()=>{document.head.innerHTML=`<style>${css}</style>`;document.body.innerHTML='';});
it('keeps the floating top action square despite legacy content-button sizing',()=>{
 document.body.innerHTML='<button class="floating-top to-top"><i class="ti ti-arrow-up"></i><span>맨 위로</span></button>';
 const style=getComputedStyle(document.querySelector('button'));
 for(const prop of ['width','minWidth','maxWidth','height','minHeight','maxHeight'])expect(style[prop]).toBe('48px');
 expect(style.position).toBe('fixed');expect(style.padding).toBe('0px');expect(getComputedStyle(document.querySelector('button span')).display).toBe('none');
});
it('prevents the countdown label from wrapping one character per line',()=>{
 document.body.innerHTML='<section class="trip-countdown"><div class="countdown-copy"><p>출발까지</p></div><div class="countdown-clock"><span>05일</span></div></section>';
 expect(getComputedStyle(document.querySelector('.trip-countdown')).display).toBe('grid');
 expect(getComputedStyle(document.querySelector('.countdown-copy p')).whiteSpace).toBe('nowrap');
 expect(getComputedStyle(document.querySelector('.countdown-clock')).flexBasis).toBe('auto');
});
it('uses the self-hosted Korean UI font and motion preferences',()=>{
 expect(css).toContain("font-family:'SUIT Variable'");expect(css).toContain("url('/fonts/SUIT-Variable.woff2')");
 expect(readFileSync('public/fonts/SUIT-Variable.woff2').subarray(0,4).toString()).toBe('wOF2');
 expect(css).toContain('prefers-reduced-motion:reduce');expect(css).toContain('env(safe-area-inset-bottom');
});
