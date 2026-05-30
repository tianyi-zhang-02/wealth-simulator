'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ChartIcon, GearIcon, HomeIcon, WalletIcon } from './nav-icons';
import PlusMenu from './plus-menu';

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
};

const LEFT: readonly NavItem[] = [
  { href: '/', label: 'Dashboard', icon: HomeIcon },
  { href: '/accounts', label: 'Accounts', icon: WalletIcon },
];

const RIGHT: readonly NavItem[] = [
  { href: '/portfolio', label: 'Portfolio', icon: ChartIcon },
  { href: '/settings', label: 'Settings', icon: GearIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/70 fixed inset-x-0 bottom-0 z-40 border-t pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2">
        {LEFT.map((item) => (
          <NavTab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}

        {/* Raised center "+" opens a sheet with four shortcuts so any "add"
            surface is reachable from anywhere — see plus-menu.tsx. */}
        <li className="relative flex justify-center">
          <PlusMenu />
        </li>

        {RIGHT.map((item) => (
          <NavTab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </ul>
    </nav>
  );
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li className="flex">
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] tracking-wide uppercase transition-colors ${
          active ? 'text-foreground' : 'text-muted hover:text-foreground'
        }`}
      >
        <Icon className="h-[22px] w-[22px]" />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
