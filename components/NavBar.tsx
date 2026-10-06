"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import { initialsOf } from "@/lib/pattern";
import { useEffect, useState, type ReactElement } from "react";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const ICONS: Record<string, ReactElement> = {
  calendario: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-5 h-5">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v3M16 3v3" strokeLinecap="round" />
    </svg>
  ),
  tablon: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-5 h-5">
      <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
      <path d="M7.5 9h9M7.5 13h9M7.5 17h5.5" strokeLinecap="round" />
    </svg>
  ),
  entrenadores: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-5 h-5">
      <circle cx="8.5" cy="8" r="2.75" />
      <circle cx="16" cy="9.5" r="2.25" />
      <path d="M3.5 19c.5-3 2.4-4.8 5-4.8s4.5 1.8 5 4.8M14 19c.4-2.3 1.8-3.7 3.7-3.7s3.3 1.4 3.7 3.7" strokeLinecap="round" />
    </svg>
  ),
  miembros: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-5 h-5">
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <circle cx="9" cy="10.5" r="2" />
      <path d="M5.8 16c.4-1.7 1.5-2.5 3.2-2.5s2.8.8 3.2 2.5M14.5 9.5h3.5M14.5 12.5h3.5" strokeLinecap="round" />
    </svg>
  ),
  "mis-reservas": (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-5 h-5">
      <path d="M9 12.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
    </svg>
  ),
  perfil: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-5 h-5">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5 19.5c.7-3.6 3.2-5.5 7-5.5s6.3 1.9 7 5.5" strokeLinecap="round" />
    </svg>
  ),
};

export default function NavBar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isTrainer = profile.role === "trainer";

  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  const links = [
    { href: "/calendario", label: "Calendario", key: "calendario" },
    { href: "/tablon", label: "Tablón", key: "tablon" },
    { href: "/entrenadores", label: "Entrenadores", key: "entrenadores" },
    ...(isTrainer
      ? [{ href: "/miembros", label: "Miembros", key: "miembros" }]
      : [{ href: "/mis-reservas", label: "Mis reservas", key: "mis-reservas" }]),
    { href: "/perfil", label: "Mi perfil", key: "perfil" },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = initialsOf(profile.full_name);

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        className={`hidden sm:flex sm:flex-col sm:shrink-0 sm:h-screen sm:sticky sm:top-0 border-r border-line bg-bg-raised/40 py-6 ${
          hydrated ? "transition-[width] duration-200" : ""
        } ${collapsed ? "sm:w-[68px] sm:px-2" : "sm:w-60 sm:px-4"}`}
      >
        <div className={`mb-8 flex items-center ${collapsed ? "flex-col gap-3 px-0" : "justify-between px-2"}`}>
          {collapsed ? (
            <span className="w-8 h-8 rounded bg-bg-raised-hover flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
              <img src="/Bibelo.jpg" alt="Bíbelo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </span>
          ) : (
            <img src="/Bibelo.jpg" alt="Bíbelo" className="h-10 w-auto max-w-40 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          )}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Mostrar menú" : "Ocultar menú"}
            title={collapsed ? "Mostrar menú" : "Ocultar menú"}
            className="text-text-dim hover:text-text p-1.5 rounded-md hover:bg-bg-raised-hover transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-4.5 h-4.5">
              {collapsed ? (
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
        {!collapsed && <div className="hazard h-1.5 -mt-4 mb-4 mx-2 opacity-90" aria-hidden />}

        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={`relative flex items-center gap-3 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${
                  active
                    ? "bg-accent text-accent-ink"
                    : "text-text-dim hover:bg-bg-raised-hover hover:text-text"
                }`}
              >
                {ICONS[link.key]}
                {!collapsed && link.label}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-auto pt-6 border-t border-line flex items-center gap-3 ${collapsed ? "flex-col px-0" : "px-2"}`}>
          <Link
            href="/perfil"
            title={collapsed ? profile.full_name : undefined}
            className={`flex items-center gap-3 min-w-0 group ${collapsed ? "" : "flex-1"}`}
          >
            <span className="w-9 h-9 rounded-full border border-text flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                  {profile.full_name}
                </p>
                <p className="label-mono">
                  {profile.role === "trainer" ? "Entrenador" : "Cliente"}
                </p>
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="text-text-dim hover:text-text p-1.5 rounded-md hover:bg-bg-raised-hover transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" className="w-4.5 h-4.5">
              <path d="M15.5 8V6.5A2.5 2.5 0 0013 4H6.5A2.5 2.5 0 004 6.5v11A2.5 2.5 0 006.5 20H13a2.5 2.5 0 002.5-2.5V16" strokeLinecap="round" />
              <path d="M9.5 12H21M21 12l-3-3M21 12l-3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Barra superior + inferior móvil */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b border-line bg-bg-raised/60 backdrop-blur">
          <img src="/Bibelo.jpg" alt="Bíbelo" className="h-8 w-auto max-w-32 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <button onClick={handleLogout} className="label-mono hover:text-text">
            Salir
          </button>
        </div>
        <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-stretch justify-around border-t border-line bg-bg-raised/95 backdrop-blur pb-[env(safe-area-inset-bottom,0px)]">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 text-[10px] font-medium uppercase tracking-wider transition-colors border-t-2 ${
                  active ? "text-text border-accent" : "text-text-dim border-transparent"
                }`}
              >
                {ICONS[link.key]}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
