"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileCheck, Building, User, Ticket, LogOut,
  Menu, X, ChevronRight, DollarSign, Receipt, Users, Share2,
  ArrowUpFromLine, Wallet, Trophy, Newspaper, Shield, BarChart3,
  ArrowLeftRight, TrendingUp, GitBranch, Settings, Clock,
  ArrowDownToLine, FileBarChart, Network,
} from "lucide-react";

interface NavChild {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
}

function PortalSidebarSection({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children!.some((c) => pathname === c.href);
  const isActive = pathname === item.href || isChildActive;
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  const handleToggle = useCallback(() => {
    if (hasChildren) setIsOpen((p) => !p);
  }, [hasChildren]);

  if (hasChildren) {
    return (
      <div className="mb-0.5">
        <button
          onClick={handleToggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group
            ${isActive
              ? "bg-sky-50 text-sky-700 border border-sky-100"
              : "text-gray-600 hover:bg-sky-50/50 hover:text-sky-700 border border-transparent"
            }`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300
            ${isActive ? "bg-sky-500 text-white shadow-md shadow-sky-500/30" : "bg-gray-100 text-gray-500 group-hover:bg-sky-100 group-hover:text-sky-600"}`}>
            <item.icon className="w-4 h-4" />
          </div>
          <span className="flex-1 text-left truncate">{item.name}</span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
        </button>
        <div
          ref={contentRef}
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: isOpen ? (contentRef.current?.scrollHeight || 600) + "px" : "0px" }}
        >
          <div className="ml-5 mt-1 pl-4 border-l-2 border-sky-100 space-y-0.5">
            {item.children!.map((child) => {
              const isSubActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                    ${isSubActive
                      ? "bg-sky-50 text-sky-700 border-l-2 border-sky-500 -ml-[2px] pl-[14px]"
                      : "text-gray-500 hover:bg-sky-50/50 hover:text-sky-600"
                    }`}
                >
                  <child.icon className="w-3.5 h-3.5" />
                  <span>{child.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group
          ${isActive
            ? "bg-sky-50 text-sky-700 border border-sky-100"
            : "text-gray-600 hover:bg-sky-50/50 hover:text-sky-700 border border-transparent"
          }`}
      >
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300
          ${isActive ? "bg-sky-500 text-white shadow-md shadow-sky-500/30" : "bg-gray-100 text-gray-500 group-hover:bg-sky-100 group-hover:text-sky-600"}`}>
          <item.icon className="w-4 h-4" />
        </div>
        <span className="flex-1 truncate">{item.name}</span>
        {isActive && <ChevronRight className="w-4 h-4 text-sky-400" />}
      </Link>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; isIB?: boolean } | null>(null);

  useEffect(() => {
    // Try localStorage first for instant display
    const stored = typeof window !== "undefined" ? localStorage.getItem("portalUser") : null;
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    // Always verify/refresh from JWT session (source of truth)
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((me) => {
        if (me && me.id) {
          const userData = { name: me.name, email: me.email, isIB: me.isIB || false };
          setUser(userData);
          localStorage.setItem("portalUser", JSON.stringify({ ...userData, id: me.id, role: me.role }));
          localStorage.setItem("portalUserId", me.id);
        }
      })
      .catch(() => { /* keep localStorage data if fetch fails */ });
  }, []);

  const portalNav = useMemo(() => {
    const nav: NavItem[] = [
      { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
      { name: "Regulations", href: "/portal/regulations", icon: Shield },
      {
        name: "My Fund", href: "#fund", icon: DollarSign,
        children: [
          { name: "Deposit", href: "/portal/deposit", icon: ArrowDownToLine },
          { name: "Withdraw", href: "/portal/withdraw", icon: ArrowUpFromLine },
          { name: "Internal Transfer", href: "/portal/internal-transfer", icon: ArrowLeftRight },
        ],
      },
    ];

    if (user?.isIB) {
      nav.push({
        name: "IB Programme", href: "#ib", icon: Network,
        children: [
          { name: "IB Dashboard", href: "/portal/ib-dashboard", icon: LayoutDashboard },
          { name: "Setup Sub IB Commission", href: "/portal/ib/setup-commission", icon: Settings },
          { name: "My Clients", href: "/portal/ib/my-clients", icon: Users },
          { name: "IB Tree Chart", href: "/portal/ib/tree-chart", icon: GitBranch },
          { name: "My Commission", href: "/portal/ib/my-commission", icon: DollarSign },
          { name: "IB Withdraw", href: "/portal/ib/ib-withdraw", icon: ArrowUpFromLine },
          { name: "Team Deposit Report", href: "/portal/ib/team-deposit-report", icon: ArrowDownToLine },
          { name: "Team Withdraw Report", href: "/portal/ib/team-withdraw-report", icon: FileBarChart },
        ],
      });
    }

    nav.push(
      {
        name: "My Data", href: "#data", icon: BarChart3,
        children: [
          { name: "Deposit Report", href: "/portal/reports/deposit", icon: ArrowDownToLine },
          { name: "Withdraw Report", href: "/portal/reports/withdraw", icon: ArrowUpFromLine },
          { name: "Internal Transfers", href: "/portal/reports/internal-transfer", icon: ArrowLeftRight },
          { name: "Deal Report", href: "/portal/reports/deal", icon: TrendingUp },
          { name: "Summary Report", href: "/portal/reports/summary", icon: FileBarChart },
        ],
      },
      { name: "Trade And Win", href: "/portal/trade-and-win", icon: Trophy },
      { name: "My Wallet", href: "/portal/wallet", icon: Wallet },
      { name: "News", href: "/portal/news", icon: Newspaper },
      { name: "Support", href: "/portal/tickets", icon: Ticket },
      { name: "Profile", href: "/portal/profile", icon: User },
    );

    if (!user?.isIB) {
      nav.push({ name: "Apply for IB", href: "/portal/ib-application", icon: Share2 });
    }

    return nav;
  }, [user?.isIB]);

  const handleLogout = () => {
    localStorage.removeItem("portalUser");
    localStorage.removeItem("portalToken");
    localStorage.removeItem("portalUserId");
    router.push("/");
  };

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-sky-50 transition-colors">
          <Menu className="w-5 h-5 text-sky-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-white text-xs font-bold flex items-center justify-center shadow-sm shadow-sky-500/20">LM</div>
          <h1 className="text-base font-bold text-gray-900">Liberty Markets</h1>
        </div>
        <div className="w-9" />
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-100 shadow-xl shadow-sky-500/5 transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo Header */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white font-bold text-sm shadow-md shadow-sky-500/30 flex-shrink-0">
            LM
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 truncate">Liberty Markets</h2>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Client Portal</p>
          </div>
          <button onClick={closeSidebar} className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-sm shadow-sky-500/20 flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || "User"}</p>
              <p className="text-[11px] text-gray-500 truncate">{user?.email || ""}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-3">
          {portalNav.map((item) => (
            <PortalSidebarSection
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={closeSidebar}
            />
          ))}
        </nav>

        {/* Sign Out Footer */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group border border-transparent hover:border-red-100"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-red-100 group-hover:text-red-500 transition-all duration-300">
              <LogOut className="w-4 h-4" />
            </div>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-[260px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-screen">
        <div className="p-6 pt-6 lg:pt-6 mt-[52px] lg:mt-0 page-transition">
          {children}
        </div>
      </main>
    </div>
  );
}
