import withSerwistInit from '@serwist/next';
const withSerwist = withSerwistInit({ swSrc: 'app/sw.ts', swDest: 'public/sw.js', disable: process.env.NODE_ENV !== 'production', additionalPrecacheEntries: [{ url: '/offline.html', revision: 'v1' }] });
export default withSerwist({ poweredByHeader: false, experimental: { cpus: 2 }, serverExternalPackages: ['postgres', '@privy-io/node'], webpack(config) { config.resolve.extensionAlias = { ...(config.resolve.extensionAlias || {}), '.js': ['.ts', '.tsx', '.js'], '.mjs': ['.mts', '.mjs'] }; return config; }, async headers() {
  return [{ source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, private' }, { key: 'X-Content-Type-Options', value: 'nosniff' }] }, { source: '/:path*', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Frame-Options', value: 'DENY' }] }];
} });
