"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Mic,
  Home,
  Headphones,
  List,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Bookmark,
  FileText,
  Trash2,
  BarChart3,
  Activity,
  LayoutGrid,
  ChevronDown,
  LogOut,
  Users,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { VJAuthProvider, useVJAuth } from "./VJAuthContext";

const navItems = [
  { name: "Home", href: "/voice-jar", icon: Home, exact: true },
  { name: "Interactions", href: "/voice-jar", icon: Headphones, exact: true },
  { name: "Lists", href: "/voice-jar/lists", icon: List, adminOnly: true },
  { name: "Agents", href: "/voice-jar/agents", icon: Users, adminOnly: true },
];

const evalItems = [
  { name: "Completed", href: "/voice-jar?status=COMPLETED", icon: CheckCircle2 },
  { name: "Pending", href: "/voice-jar?status=PENDING", icon: Clock },
];

const midItems = [
  { name: "Saved", href: "/voice-jar/saved", icon: Bookmark },
  { name: "Templates", href: "/voice-jar/templates", icon: FileText },
  { name: "Trash", href: "/voice-jar/trash", icon: Trash2, adminOnly: true },
];

const bottomItems = [
  { name: "Reporting", href: "/voice-jar/reporting", icon: BarChart3 },
  { name: "Activity Logs", href: "/voice-jar/activity", icon: Activity },
  { name: "Overviews", href: "/voice-jar/overviews", icon: LayoutGrid },
  { name: "Settings", href: "/voice-jar/settings", icon: Settings, adminOnly: true },
];

export default function VoiceJarLayout({ children }: { children: React.ReactNode }) {
  return (
    <VJAuthProvider>
      <VoiceJarShell>{children}</VoiceJarShell>
    </VJAuthProvider>
  );
}

function VoiceJarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [evalOpen, setEvalOpen] = useState(true);
  const { user, isAdmin } = useVJAuth();

  useEffect(() => {
    document.title = "Voice Jar";
  }, []);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const displayName = user?.name || "User";
  const displayInitial = displayName.charAt(0).toUpperCase();

  const activeClass = "bg-violet-50 text-violet-700 font-medium dark:bg-violet-950/40 dark:text-violet-300";
  const inactiveClass = "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200";

  const renderNavItem = (item: { name: string; href: string; icon: React.ElementType; exact?: boolean; adminOnly?: boolean }) => {
    if (item.adminOnly && !isAdmin) return null;
    const active = isActive(item.href, item.exact);
    return (
      <button
        key={item.name}
        onClick={() => router.push(item.href)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${active ? activeClass : inactiveClass}`}
      >
        <item.icon className={`h-4 w-4 ${active ? "text-violet-500" : "text-gray-400"}`} />
        {item.name}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <Toaster richColors position="top-right" />
      <aside className="fixed inset-y-0 left-0 w-[240px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-30">
        {/* Brand */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-100 dark:border-gray-800">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Voice Jar</span>
            <span className="block text-[10px] text-gray-400 -mt-0.5 uppercase tracking-wider">Call Analytics</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(renderNavItem)}

          {/* Evaluations section */}
          <div className="pt-2">
            <button
              onClick={() => setEvalOpen(!evalOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <ClipboardCheck className="h-4 w-4 text-gray-400" />
                Evaluations
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${evalOpen ? "" : "-rotate-90"}`} />
            </button>
            {evalOpen && (
              <div className="ml-3 space-y-0.5 mt-0.5">
                {evalItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <item.icon className="h-3.5 w-3.5 text-gray-400" />
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {midItems.map(renderNavItem)}

          {/* Start Evaluation CTA */}
          <div className="pt-3 px-1">
            <button
              onClick={() => router.push("/voice-jar/evaluate/new")}
              className="w-full py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              Start an Evaluation
            </button>
          </div>

          {/* Bottom section */}
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
            {bottomItems.map(renderNavItem)}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1">
          <button
            onClick={() => {
              document.cookie = "authjs.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
              document.cookie = "authjs.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Domain=" + window.location.hostname;
              document.cookie = "next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
              window.location.href = "/voice-jar/login";
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-20">
          <div />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-bold text-violet-600">
              {displayInitial}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{displayName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
