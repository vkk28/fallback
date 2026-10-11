import type { AnchorHTMLAttributes } from 'react';
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) { return <a {...props} />; }
export function useRouter() { return { push: (href: string) => { document.body.dataset.navigatedTo = href; } }; }
