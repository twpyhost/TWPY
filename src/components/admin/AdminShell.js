"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  {
    href: "/admin/identidades",
    label: "Identidades",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7h7l3 3" />
        <path d="M4 17h7l3-3" />
        <circle cx="18" cy="12" r="3" />
      </svg>
    ),
  },
  {
    href: "/admin/jugadores",
    label: "Jugadores",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <path d="M16 8.2a3 3 0 0 1 0 5.6" />
        <path d="M17.5 19c0-2 .5-3.4-1-4.6" />
      </svg>
    ),
  },
  {
    href: "/admin/torneos",
    label: "Torneos",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h5v6H4z" />
        <path d="M4 15h5v4H4z" />
        <path d="M9 8h4v9h-4" />
        <path d="M13 12.5h6" />
      </svg>
    ),
  },
  {
    href: "/admin/rankings",
    label: "Rankings",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 19V11" />
        <path d="M12 19V5" />
        <path d="M19 19v-6" />
      </svg>
    ),
  },
  {
    href: "/admin/sistema",
    label: "Sistema",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 12h4l2.5-6 3 12 2.5-6h6" />
      </svg>
    ),
  },
];

function initialesDe(email) {
  const local = (email || "").split("@")[0] || "?";
  return local.slice(0, 2).toUpperCase();
}

// Se alimenta del ultimo evento real en sistema_eventos (via /api/health),
// no de un placeholder estatico -- ver Hito 14 del plan de go-live.
function SupabaseStatusPill({ ok }) {
  if (ok === null || ok === undefined) {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap border border-white/20 bg-white/[.04] px-3 py-1.5 text-[11px] font-bold tracking-[0.06em] text-white/50">
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        SIN DATOS DE SALUD
      </span>
    );
  }

  if (ok) {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap border border-success/35 bg-success/[.12] px-3 py-1.5 text-[11px] font-bold tracking-[0.06em] text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        SUPABASE OK
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap border border-warning/35 bg-warning/[.12] px-3 py-1.5 text-[11px] font-bold tracking-[0.06em] text-warning">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      SUPABASE ATENCIÓN
    </span>
  );
}

export default function AdminShell({
  children,
  pendingCount = 0,
  userEmail = "",
  supabaseOk = null,
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeItem = NAV_ITEMS.find((item) => pathname?.startsWith(item.href));
  const sectionTitle = activeItem?.label ?? "Admin";

  return (
    <div className="flex min-h-screen bg-black text-white">
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 max-[899px]:block min-[900px]:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-[250px] flex-none flex-col overflow-y-auto border-r border-white/[.08] bg-black transition-transform duration-300 max-[899px]:z-[60] min-[900px]:sticky min-[900px]:top-0 min-[900px]:h-screen min-[900px]:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2.5 border-b border-white/[.08] px-[18px] py-[18px] pt-[22px]">
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-[25px] italic leading-none tracking-[0.02em]">TEKKEN PY</span>
            <span className="font-body text-[10px] font-bold tracking-[0.22em] text-primary-500">PANEL ADMIN</span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menu"
            className="flex h-9 w-9 items-center justify-center bg-white/[.06] text-xl text-white min-[900px]:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 py-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-[11px] border-l-[3px] px-4 py-3 font-display text-lg uppercase tracking-[0.05em] transition-colors duration-200 ${
                  active
                    ? "border-l-primary-500 bg-white/[.06] text-white"
                    : "border-l-transparent text-white/60 hover:bg-white/[.06] hover:text-white"
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin/identidades" && pendingCount > 0 && (
                  <span className="bg-primary-500 px-2 py-0.5 font-body text-[11px] font-bold text-white [clip-path:var(--clip-banner-right)]">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-[11px] border-t border-white/[.08] p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 font-display text-[17px]">
            {initialesDe(userEmail)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-bold">{userEmail}</span>
            <span className="text-[11px] text-white/45">Admin · TWPY</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col min-[900px]:ml-0">
        <header className="sticky top-0 z-30 flex items-center gap-3.5 border-b border-white/[.08] bg-black/[.88] px-4 py-3.5 backdrop-blur-sm sm:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="flex h-11 w-11 flex-none items-center justify-center border border-white/[.12] bg-white/[.06] text-white min-[900px]:hidden"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/40">LIGA TEKKEN PARAGUAY</span>
            <span className="truncate font-display text-[22px] leading-[1.1] tracking-[0.03em]">
              {sectionTitle}
            </span>
          </div>
          <SupabaseStatusPill ok={supabaseOk} />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
