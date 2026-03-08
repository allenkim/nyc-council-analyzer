"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/quiz", label: "Quiz" },
  { href: "/profile", label: "Profile" },
  { href: "/discover", label: "Discover" },
  { href: "/check", label: "Check" },
];

export default function Nav() {
  const pathname = usePathname();

  // Strip basePath prefix (/style) for matching
  const path = pathname.replace(/^\/style/, "") || "/";

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-2 sm:gap-2">
        <a
          href="/"
          className="mr-1 flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          &larr; Portal
        </a>
        <Link
          href="/"
          className="mr-3 flex-shrink-0 text-sm font-bold tracking-wide text-white sm:mr-5 sm:text-base"
        >
          Style
        </Link>

        {links.map(({ href, label }) => {
          const isActive =
            href === "/" ? path === "/" : path.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
