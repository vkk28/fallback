/// <reference lib="webworker" />
import { Serwist, CacheFirst, NetworkOnly, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';
declare global { interface WorkerGlobalScope extends SerwistGlobalConfig { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined } }
declare const self: ServiceWorkerGlobalScope;
const safe = (url: string) => url.startsWith('/_next/static/') || url.startsWith('/icons/') || url === '/offline.html';
const entries = (self.__SW_MANIFEST || []).filter(e => safe(typeof e === 'string' ? e : e.url));
const worker = new Serwist({ precacheEntries: entries, skipWaiting: false, clientsClaim: true, navigationPreload: true, runtimeCaching: [{ matcher: ({ request, url }) => request.method === 'GET' && url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')), handler: new CacheFirst({ cacheName: 'fallback-static-v1' }) }, { matcher: ({ request }) => request.destination === 'document', handler: new NetworkOnly() }], fallbacks: { entries: [{ url: '/offline.html', matcher: ({ request }) => request.destination === 'document' }] } });
worker.addEventListeners();
