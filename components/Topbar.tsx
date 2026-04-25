"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

interface Props {
  role: Role;
}

const snegLinks = [
  { href: "/snegu", label: "today" },
  { href: "/snegu/study", label: "study" },
  { href: "/snegu/calendar", label: "calendar" },
  { href: "/snegu/cycle", label: "cycle" },
  { href: "/snegu/notes", label: "letters" }
];

const ribtuLinks = [
  { href: "/ribtu", label: "her day" },
  { href: "/ribtu/study", label: "study" },
  { href: "/ribtu/calendar", label: "calendar" },
  { href: "/ribtu/cycle", label: "cycle" },
  { href: "/ribtu/notes", label: "send love" }
];

export default function Topbar({ role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const links = role === "snegu" ? snegLinks : ribtuLinks;

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl bg-bg-0/70 border-b border-accent/10">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 py-3">
        <Link href={role === "snegu" ? "/snegu" : "/ribtu"} className="font-script text-xl text-accent flex items-center gap-2">
          <span className="beat">❤</span>
          <span>{role === "snegu" ? "for snegu" : "watching over snegu"}</span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm text-ink-soft">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative transition hover:text-accent ${pathname === l.href ? "text-accent" : ""}`}
            >
              {l.label}
              {pathname === l.href && (
                <span className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-accent rounded-full" />
              )}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="text-xs text-ink-mute hover:text-accent tracking-[0.15em] uppercase">
          sign out
        </button>
      </div>
      <div className="md:hidden flex overflow-x-auto gap-4 px-4 pb-2 text-sm text-ink-soft">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`whitespace-nowrap ${pathname === l.href ? "text-accent" : ""}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
