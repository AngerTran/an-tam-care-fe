import { Bell, Clock, Heart, LogOut, Menu, X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { inbox, lookups } from "../../api";
import { HOME, ROLE_LABEL, useAuth, useMe } from "../../auth/AuthContext";
import { POSITION_LABEL } from "../../domain/catalog";
import type { Role } from "../../types/models";
import { Avatar, ConfirmDialog, cn } from "../ui";
import { NAV } from "./nav";

const DrawerCtx = createContext<() => void>(() => {});

function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const me = useMe();
  const position = lookups.position(me.id);
  return (
    <nav className="flex h-full w-60 flex-col bg-navy px-3 pt-4 pb-3 text-[13px] text-sidebar-text">
      <Link to={HOME[role]} className="mb-1 flex items-center gap-2 px-2 text-[17px] font-bold text-white" onClick={onNavigate}>
        <Heart size={18} className="text-orange" strokeWidth={2.4} /> An Tâm Care
      </Link>
      <div className="mb-3 px-2 text-[10.5px] text-sidebar-sub">
        {role === "STAFF" && position ? POSITION_LABEL[position] : ROLE_LABEL[role]}
      </div>
      <div className="-mr-1 flex-1 space-y-3 overflow-y-auto pr-1">
        {NAV[role].map((sec, i) => {
          const items = sec.items.filter((it) => !it.only || it.only === position);
          if (!items.length) return null;
          return (
            <div key={i} className="space-y-0.5">
              {sec.title && <div className="px-3 pb-0.5 text-[10px] font-semibold tracking-wide text-sidebar-sub uppercase">{sec.title}</div>}
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => cn("flex items-center gap-2.5 rounded-[10px] px-3 py-1.5 transition", isActive ? "bg-orange font-semibold text-white" : "hover:bg-white/8")}>
                  <item.icon size={15} strokeWidth={2} />
                  <span className="leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export function PortalLayout({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const { expired, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <DrawerCtx.Provider value={() => setOpen(true)}>
      <div className="flex h-full bg-canvas">
        <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <Sidebar role={role} />
        </aside>
        {open && (
          <div className="fixed inset-0 z-40 flex lg:hidden" onClick={() => setOpen(false)}>
            <div className="h-full" onClick={(e) => e.stopPropagation()}>
              <Sidebar role={role} onNavigate={() => setOpen(false)} />
            </div>
            <div className="flex-1 bg-black/40">
              <button className="m-3 rounded-lg bg-white p-1.5" aria-label="Đóng menu"><X size={18} /></button>
            </div>
          </div>
        )}
        <main className="min-w-0 flex-1" key={loc.pathname}>
          <Outlet />
        </main>
      </div>
      <ConfirmDialog
        open={expired}
        onClose={() => { logout(); nav("/login"); }}
        onConfirm={() => { logout(); nav("/login"); }}
        icon={Clock}
        tone="blue"
        title="Phiên đăng nhập đã hết hạn"
        desc="Bạn đã không thao tác trong 30 phút. Vui lòng đăng nhập lại để tiếp tục."
        confirmLabel="Đăng nhập lại"
        confirmVariant="primary"
      />
    </DrawerCtx.Provider>
  );
}

const BASE: Record<Role, string> = { ADMIN: "/admin", MANAGER: "/manager", STAFF: "/staff", FAMILY: "/family" };

/** Top bar (title + bell + user) and padded content. Every portal page renders inside one. */
export function Page({ title, actions, children, back, sub }: { title: ReactNode; actions?: ReactNode; children: ReactNode; back?: string; sub?: ReactNode }) {
  const me = useMe();
  const openDrawer = useContext(DrawerCtx);
  const { logout } = useAuth();
  const nav = useNavigate();
  const { data: notes = [] } = useQuery({ queryKey: ["notifications", me.id], queryFn: () => inbox.notifications(me) });
  const unread = notes.filter((n) => !n.isRead).length;
  const base = BASE[me.role];
  const profile = me.role === "FAMILY" ? "/family/account" : `${base}/profile`;
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4 sm:px-5">
        <button className="rounded-lg p-1.5 text-navy hover:bg-canvas lg:hidden" onClick={openDrawer} aria-label="Mở menu"><Menu size={20} /></button>
        {back && <Link to={back} className="text-[12px] font-semibold whitespace-nowrap text-subtle hover:text-orange">‹ Quay lại</Link>}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] leading-tight font-bold text-navy">{title}</h1>
          {sub && <div className="truncate text-[11px] text-subtle">{sub}</div>}
        </div>
        <span className="hidden rounded-full bg-canvas px-2.5 py-1 text-[10.5px] font-semibold text-subtle md:inline">Demo: T6 09/10/2026 · 10:15</span>
        <Link to={`${base}/notifications`} className="relative rounded-lg p-1.5 text-orange hover:bg-orange-soft" aria-label="Thông báo">
          <Bell size={18} />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-ink text-[9px] font-bold text-white">{unread}</span>}
        </Link>
        <Link to={profile} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-canvas">
          <Avatar name={me.fullName} size={26} tone={me.role === "ADMIN" ? "purple" : me.role === "STAFF" ? "teal" : "blue"} />
          <span className="hidden text-[12px] text-muted sm:inline">{me.fullName}</span>
        </Link>
        <button onClick={() => { logout(); nav("/login"); }} className="rounded-lg p-1.5 text-subtle hover:bg-canvas hover:text-red-ink" title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={17} /></button>
      </header>
      {actions && <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-5">{actions}</div>}
      <div className="flex-1 space-y-4 p-4 sm:p-5">{children}</div>
    </div>
  );
}
