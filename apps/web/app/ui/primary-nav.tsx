import Link from 'next/link';
import { House, Info, List, UserRound } from 'lucide-react';

export function PrimaryNav({ active }: { active: 'home' | 'activity' | 'account' | 'about' }) {
  const routes = [
    { href: '/dashboard', title: 'Home', icon: House, key: 'home' },
    { href: '/activity', title: 'Activity', icon: List, key: 'activity' },
    { href: '/account', title: 'Account', icon: UserRound, key: 'account' },
    { href: '/about', title: 'About', icon: Info, key: 'about' },
  ];
  return <nav className="primary-nav" aria-label="Main navigation">{routes.map(route => <Link key={route.key} href={route.href} prefetch={false} aria-current={active === route.key ? 'page' : undefined}><route.icon size={19} aria-hidden="true" />{route.title}</Link>)}<span>FBTEST · test tokens, no real value</span></nav>;
}
