"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "../components/brand-mark";
import { BUTTON, FOCUS_RING } from "../styles";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "What you get" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      id="top"
      className={`sticky top-0 z-10 bg-white/86 backdrop-blur-md transition-[border-color] duration-150 ${
        scrolled ? "border-b border-[var(--line)]" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1120px] px-7">
        <nav className="flex h-[68px] items-center justify-between">
          <a href="#top" className={FOCUS_RING}>
            <BrandMark />
          </a>

          <ul className="hidden items-center gap-[30px] text-[15px] text-[var(--ink-2)] min-[800px]:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={`transition-colors hover:text-[var(--ink)] ${FOCUS_RING}`}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-[22px] text-[15px]">
            <Link
              href="/login"
              className={`hidden transition-colors hover:text-[var(--ink)] min-[800px]:inline ${FOCUS_RING}`}
            >
              Sign in
            </Link>
            <a href="#start" className={`${BUTTON.primarySm} ${FOCUS_RING}`}>
              Start free
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
