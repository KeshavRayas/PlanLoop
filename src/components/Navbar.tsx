"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-outline-variant">
      <div className="max-w-container-max mx-auto flex justify-between items-center px-margin-desktop h-20">
        <div className="flex items-center gap-12">
          <Link href="/" className="text-headline-md font-bold text-on-surface">
            {APP_NAME}
          </Link>
          <nav className="hidden md:flex gap-8">
            <Link
              href="/"
              className={`font-label-md text-label-md pb-1 transition-colors ${
                isActive("/")
                  ? "text-on-surface border-b-2 border-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Discover
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="bg-on-surface text-surface px-6 py-2.5 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
          >
            Post a Job
          </Link>
        </div>
      </div>
    </header>
  );
}
