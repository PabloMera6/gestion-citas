"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export default function NavBar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const links = [
    { href: "/calendario", label: "Calendario" },
    { href: "/tablon", label: "Tablón" },
    { href: "/entrenadores", label: "Entrenadores" },
    { href: "/mis-reservas", label: "Mis reservas" },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-neutral-900">🏋️ MiGym</span>
          <div className="hidden sm:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  pathname === link.href
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500 hidden sm:inline">
            {profile.full_name}{" "}
            <span className="text-neutral-400">
              ({profile.role === "trainer" ? "Entrenador" : "Cliente"})
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            Salir
          </button>
        </div>
      </div>
      {/* Nav móvil */}
      <div className="flex sm:hidden items-center gap-1 px-4 pb-2 overflow-x-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition ${
              pathname === link.href
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
