/** @vitest-environment jsdom */
import { expect,it } from 'vitest';
import {createGoogleDirectionsUrl,renderDayRoute} from '../src/day-route.js';
import {getDayRouteSegments,getDayMapPoints} from '../src/map.js';
import {trip} from '../src/data.js';
it('offers complete day maps with every located stop and real Google directions links',()=>{
 for(const day of trip.days){document.body.innerHTML=renderDayRoute(day);expect(document.querySelectorAll('[data-inline-map-focus]').length).toBe(getDayMapPoints(day).length);expect(document.querySelectorAll('.google-route-link').length).toBe(getDayRouteSegments(day).length);expect(document.querySelector('[data-inline-map-play]')).not.toBeNull();expect(document.querySelector('.day-route-note').textContent).toContain('안내 동선');}
});
it('uses official origin/destination/mode parameters without fabricating a Google route',()=>{
 const url=new URL(createGoogleDirectionsUrl({mode:'train',label:'JR',coordinates:[[35,135],[35.1,135.2],[35.2,135.3]]}));
 expect(url.origin).toBe('https://www.google.com');expect(url.pathname).toBe('/maps/dir/');expect(url.searchParams.get('api')).toBe('1');expect(url.searchParams.get('origin')).toBe('35,135');expect(url.searchParams.get('destination')).toBe('35.2,135.3');expect(url.searchParams.get('travelmode')).toBe('transit');expect(url.searchParams.has('waypoints')).toBe(false);
 const walk=new URL(createGoogleDirectionsUrl({mode:'walk',coordinates:[[35,135],[35.1,135.2],[35.2,135.3]]}));expect(walk.searchParams.get('travelmode')).toBe('walking');expect(walk.searchParams.get('waypoints')).toBe('35.1,135.2');
});
