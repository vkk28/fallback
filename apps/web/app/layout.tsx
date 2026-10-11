import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Fallback — a backup for what matters', description: 'Reserved family support for payments from your allocated money.', manifest: '/manifest.webmanifest', icons: { icon: '/icon.svg', apple: '/icons/apple.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#242424' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a href="#main" className="skip">Skip to main content</a>{children}</body></html>;
}
