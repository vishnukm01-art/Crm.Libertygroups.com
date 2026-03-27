"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { navigationItems, type NavigationItem } from "@/lib/navigation";
import {
  LayoutDashboard, Users, UserPlus, Monitor, PlusCircle, LogOut, Menu, X,
  BarChart3, Gift, Network, Layers, ArrowLeftRight, Megaphone, Mail,
  Newspaper, Bell, Trophy, FileBarChart, ShieldAlert, Ticket, Settings,
  UserCog, ChevronRight, List, FileCheck, ArrowUpCircle, ArrowDownCircle,
  History, UserCheck, GitBranch, Plus, Sliders, ArrowDownToLine,
  ArrowUpFromLine, Clock, Wallet, Target, Link as LinkIcon, Send,
  FileText, TrendingUp, AlertTriangle, CheckCircle, CreditCard,
  Server, Lock, Shield, Handshake, UserX, XCircle,
  PhoneCall, Upload, Building, KeyRound, ShieldCheck, MailCheck, MailPlus,
  Pencil, Eye, Trash2, Copy, UserRoundPlus, UserPlus2,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, UserPlus, Monitor, PlusCircle, BarChart3, Gift,
  Network, Layers, ArrowLeftRight, Megaphone, Mail, Newspaper, Bell,
  Trophy, FileBarChart, ShieldAlert, Ticket, Settings, UserCog, List,
  FileCheck, ArrowUpCircle, ArrowDownCircle, History, UserCheck, GitBranch,
  Plus, Sliders, ArrowDownToLine, ArrowUpFromLine, Clock, Wallet, Target,
  Link: LinkIcon, Send, FileText, TrendingUp, AlertTriangle, CheckCircle,
  CreditCard, Server, Lock, Shield, Handshake, UserX, XCircle,
  PhoneCall, Upload, Building, KeyRound, ShieldCheck, MailCheck, MailPlus,
  Pencil, Eye, Trash2, Copy, UserRoundPlus, UserPlus2,
};

function SidebarMenuItem({ item, isCollapsed }: { item: NavigationItem; isCollapsed: boolean }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const contentRef = useRef<HTMLDivElement>(null);

  const isActive = pathname === item.href ||
    (hasChildren && item.children!.some(child => pathname === child.href));
  const isChildActive = hasChildren && item.children!.some(child => pathname === child.href);

  useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  const Icon = iconMap[item.icon] || LayoutDashboard;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsOpen(prev => !prev);
    }
  }, [hasChildren]);

  return (
    <div className="mb-0.5">
      {hasChildren ? (
        <button
          onClick={handleClick}
          className={`menu-item-3d w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group
            ${isActive
              ? "bg-sky-50 text-sky-700 active border border-sky-100"
              : "text-gray-600 hover:bg-sky-50/50 hover:text-sky-700 border border-transparent"
            }`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300
            ${isActive ? "bg-sky-500 text-white shadow-md shadow-sky-500/30" : "bg-gray-100 text-gray-500 group-hover:bg-sky-100 group-hover:text-sky-600"}`}>
            <Icon className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.name}</span>
              {item.badge && (
                <span className="badge-pulse bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {item.badge}
                </span>
              )}
              <ChevronRight className={`w-4 h-4 text-gray-400 chevron-rotate ${isOpen ? "open" : ""}`} />
            </>
          )}
        </button>
      ) : (
        <Link
          href={item.href}
          className={`menu-item-3d flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group
            ${isActive
              ? "bg-sky-50 text-sky-700 active border border-sky-100"
              : "text-gray-600 hover:bg-sky-50/50 hover:text-sky-700 border border-transparent"
            }`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300
            ${isActive ? "bg-sky-500 text-white shadow-md shadow-sky-500/30" : "bg-gray-100 text-gray-500 group-hover:bg-sky-100 group-hover:text-sky-600"}`}>
            <Icon className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">{item.name}</span>
              {item.badge && (
                <span className="badge-pulse bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </Link>
      )}

      {/* Submenu */}
      {hasChildren && !isCollapsed && (
        <div
          ref={contentRef}
          className={`submenu-container ${isOpen ? "open" : "closed"}`}
          style={isOpen ? { maxHeight: contentRef.current?.scrollHeight ? contentRef.current.scrollHeight + 20 + "px" : "600px" } : { maxHeight: 0 }}
        >
          <div className="ml-5 mt-1 pl-4 border-l-2 border-sky-100 space-y-0.5">
            {item.children!.map((child, idx) => {
              const ChildIcon = iconMap[child.icon || ""] || ChevronRight;
              const isSubActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`submenu-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                    ${isSubActive
                      ? "bg-sky-50 text-sky-700 border-l-2 border-sky-500 -ml-[2px] pl-[14px]"
                      : "text-gray-500 hover:bg-sky-50/50 hover:text-sky-600"
                    }`}
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  <ChildIcon className="w-3.5 h-3.5" />
                  <span>{child.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg shadow-sky-500/10 sidebar-toggle border border-sky-100"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <X className="w-5 h-5 text-sky-600" />
        ) : (
          <Menu className="w-5 h-5 text-sky-600" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 overlay-blur z-30 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white z-40 flex flex-col
          shadow-sidebar border-r border-gray-100
          transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isCollapsed ? "w-[72px]" : "w-[260px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{
          transformOrigin: "left center",
        }}
      >
        {/* Logo/Header */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white font-bold text-sm shadow-md shadow-sky-500/30 flex-shrink-0">
            LM
          </div>
          {!isCollapsed && (
            <div className="min-w-0 animate-fade-in">
              <h2 className="text-sm font-bold text-gray-900 truncate">Liberty Markets</h2>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">CRM Panel</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex ml-auto p-1.5 rounded-lg hover:bg-sky-50 text-gray-400 hover:text-sky-600 transition-all duration-200 flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-3 perspective-container">
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Footer / Sign out */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="menu-item-3d flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group border border-transparent hover:border-red-100"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-red-100 group-hover:text-red-500 transition-all duration-300">
              <LogOut className="w-4 h-4" />
            </div>
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
