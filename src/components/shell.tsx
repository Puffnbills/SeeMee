"use client";

import { signOutAction } from "@/lib/actions";
import { compact } from "@/lib/format";
import type { PublicUser } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function Shell({
  user,
  unread,
  balance,
  children,
}: {
  user: PublicUser | null;
  unread: number;
  balance: number | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const hideFab = ["/stream", "/studio", "/go-live"].some((prefix) => pathname.startsWith(prefix));
  const staff = user?.role === "moderator" || user?.role === "administrator";
  const items = [
    { href: "/home", label: "Home" },
    { href: "/search", label: "Search" },
    { href: "/notifications", label: "Alerts", count: unread },
    { href: "/wallet", label: "Wallet" },
  ];
  return (
    <div>
      <aside className="sidebar">
        <Link href="/home" className="display px-3 py-2 text-2xl font-semibold">
          SeeMee
        </Link>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={`nav-link ${pathname.startsWith(item.href) ? "active" : ""}`}>
            {item.label}
            {item.count ? <span className="count">{item.count}</span> : null}
          </Link>
        ))}
        <Link href="/go-live" className="btn btn-primary mx-2 mt-3">
          <i className="live-dot" /> Go Live
        </Link>
        <div className="mt-auto grid gap-1">
          {user ? (
            <>
              <Link href={`/u/${user.username}`} className="nav-link">
                Profile
              </Link>
              <Link href="/settings" className="nav-link">
                Settings
              </Link>
              {staff ? (
                <Link href="/moderation" className="nav-link">
                  Moderation
                </Link>
              ) : null}
              {user.role === "administrator" ? (
                <Link href="/admin" className="nav-link">
                  Admin
                </Link>
              ) : null}
              <Link href="/wallet" className="nav-link">
                {compact(balance ?? 0)} coins
              </Link>
              <form action={signOutAction}>
                <button className="nav-link w-full text-left" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary mx-2">
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <div className="app-main">
        <form action="/search" className="mb-4 hidden md:block">
          <input className="field" name="q" placeholder="Search users, titles, #tags, categories" aria-label="Search" />
        </form>
        {children}
      </div>
      <nav className="tabbar" aria-label="Primary">
        <Link href="/home" className={`tab-link ${pathname.startsWith("/home") ? "active" : ""}`}>
          Home
        </Link>
        <Link href="/search" className={`tab-link ${pathname.startsWith("/search") ? "active" : ""}`}>
          Search
        </Link>
        <Link href="/go-live" className="tab-link">
          Live
        </Link>
        <Link href="/notifications" className={`tab-link ${pathname.startsWith("/notifications") ? "active" : ""}`}>
          Alerts{unread ? ` ${unread}` : ""}
        </Link>
        <Link href={user ? `/u/${user.username}` : "/login"} className="tab-link">
          {user ? "Me" : "In"}
        </Link>
      </nav>
      {hideFab ? null : (
        <Link href="/go-live" className="fab">
          <i /> Go Live
        </Link>
      )}
    </div>
  );
}
