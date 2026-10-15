import { renderCastleMap } from './castle-course.js';

// Native dialog keeps focus inside the viewer and restores it on dismissal.
export function openIllustratedMapViewer(opener, config) {
  if (document.querySelector('.castle-map-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'castle-map-dialog';
  dialog.setAttribute('aria-labelledby', 'castle-viewer-heading');
  const [mapW, mapH] = config.size;
  dialog.innerHTML = `<div class="castle-viewer-shell"><header class="castle-viewer-header"><div><h2 id="castle-viewer-heading">${config.title}</h2><p>${config.summary}</p></div><button type="button" data-castle-close aria-label="전체 지도 닫기"><i class="ti ti-x" aria-hidden="true"></i></button></header><div class="castle-viewer-tools" aria-label="지도 확대 조작"><button type="button" data-castle-zoom="out" aria-label="지도 축소"><i class="ti ti-minus" aria-hidden="true"></i></button><output data-castle-scale aria-live="polite">100%</output><button type="button" data-castle-zoom="in" aria-label="지도 확대"><i class="ti ti-plus" aria-hidden="true"></i></button><button type="button" data-castle-zoom="fit">전체 보기</button></div><div class="castle-viewer-viewport" tabindex="0" role="region" aria-label="전체 이동 지도. 확대한 후 위아래 또는 좌우로 밀어 이동하세요."><div class="castle-viewer-canvas">${config.render('castle-viewer')}</div></div><p class="castle-viewer-note">${config.note}</p></div>`;
  document.body.append(dialog);
  const wasLocked = document.body.classList.contains('modal-open');
  document.body.classList.add('modal-open');
  const viewport = dialog.querySelector('.castle-viewer-viewport');
  const canvas = dialog.querySelector('.castle-viewer-canvas');
  let zoom = 1;
  function sizeMap(reset = false) {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    const mapWidth = Math.min(width, height * mapW / mapH) * zoom;
    const mapHeight = mapWidth * mapH / mapW;
    canvas.style.width = `${mapWidth}px`;
    canvas.style.height = `${mapHeight}px`;
    canvas.style.marginTop = `${Math.max(0, (height - mapHeight) / 2)}px`;
    dialog.querySelector('[data-castle-scale]').textContent = `${Math.round(zoom * 100)}%`;
    dialog.querySelector('[data-castle-zoom="out"]').disabled = zoom <= 1;
    dialog.querySelector('[data-castle-zoom="in"]').disabled = zoom >= 4;
    if (reset) { viewport.scrollTop = 0; viewport.scrollLeft = 0; }
  }
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-castle-close]')) { dialog.close(); return; }
    const control = event.target.closest('[data-castle-zoom]');
    if (!control) return;
    const beforeWidth = canvas.offsetWidth;
    const beforeHeight = canvas.offsetHeight;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / Math.max(1, beforeWidth);
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2 - parseFloat(canvas.style.marginTop || 0)) / Math.max(1, beforeHeight);
    zoom = control.dataset.castleZoom === 'fit' ? 1 : Math.min(4, Math.max(1, zoom * (control.dataset.castleZoom === 'in' ? 1.5 : 1 / 1.5)));
    sizeMap(zoom === 1);
    if (zoom > 1) {
      viewport.scrollLeft = centerX * canvas.offsetWidth - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * canvas.offsetHeight - viewport.clientHeight / 2;
    }
  });
  const resize = new ResizeObserver(() => sizeMap());
  resize.observe(viewport);
  dialog.addEventListener('close', () => {
    resize.disconnect();
    dialog.remove();
    if (!wasLocked) document.body.classList.remove('modal-open');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }, { once: true });
  dialog.showModal();
  sizeMap(true);
  dialog.querySelector('[data-castle-close]').focus();
}

export function openCastleMapViewer(opener) {
  openIllustratedMapViewer(opener, {size:[1800,1273],title:'역부터 천수각까지 · 전체 지도',summary:'다니마치욘초메역 → 오테몬 → 사쿠라몬 → 휴식 → 천수각',render:renderCastleMap,note:'파란 실선: 역부터 방문 동선 · 보라 점선: 공원 복귀 · 4번: 10분 휴식. 확대 후 지도를 밀어 이동해요. 경로는 개략 표시입니다.'});
}
