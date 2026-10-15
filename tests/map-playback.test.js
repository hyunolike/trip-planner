import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountTripMap } from '../src/map.js';

function setup(reducedMotion = false, options = {}) {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', cb => setTimeout(() => cb(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', id => clearTimeout(id));
  const map = Object.fromEntries(['fitBounds','setView','flyTo','flyToBounds','stop','invalidateSize','remove','on'].map(key => [key, vi.fn()]));
  const markers = [];
  const layer = () => { const value = { addTo: () => value, bindTooltip: () => value, on: () => value }; return value; };
  const L = {
    map: () => map, tileLayer: layer, polyline: layer, divIcon: vi.fn(value => value),
    marker: (position, options) => { const value = { addTo: () => value, bindTooltip: () => value, on: () => value, setIcon: vi.fn(), setLatLng: vi.fn(), options }; markers.push(value); return value; },
  };
  const onSelect = vi.fn();
  const onPlaybackState = vi.fn();
  const day = { stops: [
    { id:'a', title:'Start', time:'09:00', coordinates:[35,135] },
    { id:'b', title:'Finish', time:'10:00', coordinates:[35.1,135.2], transport:'🚆' },
  ] };
  const controller = mountTripMap({ L, container:{}, day, reducedMotion, onSelect, onPlaybackState, ...options });
  return { controller, map, family:markers[0], onSelect, onPlaybackState };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('map playback lifecycle', () => {
  it('settles interrupted playback and prevents late updates after close', async () => {
    const { controller, map, family, onSelect, onPlaybackState } = setup();
    expect(family.options.icon.html).toContain('travel-duri.png');
    const playing = controller.play();
    await vi.advanceTimersByTimeAsync(1000);
    expect(map.flyToBounds).toHaveBeenCalled();
    controller.focus('b');
    await playing;
    expect(family.setLatLng).toHaveBeenLastCalledWith([35.1,135.2]);
    expect(map.flyTo).toHaveBeenLastCalledWith([35.1,135.2],15,{duration:0.9});
    expect(onPlaybackState).toHaveBeenLastCalledWith(false);
    const replay = controller.play();
    controller.destroy();
    await replay;
    const calls = onSelect.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(onSelect).toHaveBeenCalledTimes(calls);
    expect(map.remove).toHaveBeenCalledOnce();
  });
  it('repeats from the first stop and cancels the loop without late updates', async () => {
    const {controller,onSelect,onPlaybackState}=setup(false,{loop:true,followCamera:false});
    const playing=controller.play();
    await vi.advanceTimersByTimeAsync(10000);
    expect(onSelect.mock.calls.filter(([id])=>id==='a').length).toBeGreaterThan(1);
    expect(onSelect.mock.calls.filter(([id])=>id==='b').length).toBeGreaterThan(1);
    controller.stop();await playing;
    const count=onSelect.mock.calls.length;await vi.advanceTimersByTimeAsync(10000);
    expect(onSelect).toHaveBeenCalledTimes(count);expect(onPlaybackState).toHaveBeenLastCalledWith(false);controller.destroy();
  });
  it('finishes reduced-motion playback without animated camera changes', async () => {
    const { controller, map, onSelect, onPlaybackState } = setup(true,{loop:true});
    const playing = controller.play();
    await vi.advanceTimersByTimeAsync(40);
    await playing;
    expect(onSelect).toHaveBeenLastCalledWith('b');
    expect(map.flyToBounds).not.toHaveBeenCalled();
    expect(onPlaybackState).toHaveBeenLastCalledWith(false);
    controller.destroy();
  });
});
