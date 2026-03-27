"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, Globe, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();
  const [searchFocused, setSearchFocused] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = session?.user?.name || "Admin";
  const userEmail = session?.user?.email || "admin@libertymarkets.com";

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 h-16 flex items-center px-6 gap-4 shadow-header">
      {/* Search */}
      <div className={`relative flex-1 max-w-md transition-all duration-300 ${searchFocused ? "max-w-lg" : ""}`}>
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${searchFocused ? "text-sky-500" : "text-gray-400"}`} />
        <input
          type="text"
          placeholder="Search..."
          className="search-input w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:bg-white focus:border-sky-300 focus:outline-none transition-all duration-300"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Language */}
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-sky-50 hover:text-sky-600 transition-all duration-200 border border-transparent hover:border-sky-100">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">English</span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl text-gray-500 hover:bg-sky-50 hover:text-sky-600 transition-all duration-200 border border-transparent hover:border-sky-100"
          >
            <Bell className="w-5 h-5" />
            <span className="notification-badge">13</span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scale-in origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <span className="text-xs text-sky-600 font-medium cursor-pointer hover:text-sky-700">Mark all read</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {[
                  { title: "New deposit request", desc: "Client #1234 requested $500 deposit", time: "2 min ago", unread: true },
                  { title: "KYC document uploaded", desc: "User john@example.com submitted KYC", time: "15 min ago", unread: true },
                  { title: "Withdrawal approved", desc: "Withdrawal #5678 has been processed", time: "1 hour ago", unread: false },
                  { title: "New IB request", desc: "Partner application from Sarah K.", time: "3 hours ago", unread: false },
                ].map((notif, i) => (
                  <div key={i} className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors duration-200 hover:bg-sky-50/50 ${notif.unread ? "bg-sky-50/30" : ""}`}>
                    <div className="flex items-start gap-2">
                      {notif.unread && <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />}
                      <div className={notif.unread ? "" : "ml-4"}>
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.desc}</p>
                        <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                <span className="text-xs text-sky-600 font-medium cursor-pointer hover:text-sky-700">View all notifications</span>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-sky-50 transition-all duration-200 border border-transparent hover:border-sky-100"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-sky-500/20">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{userEmail}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 hidden md:block transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scale-in origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-400">{userEmail}</p>
              </div>
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-sky-50 hover:text-sky-700 transition-colors duration-200">
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-sky-50 hover:text-sky-700 transition-colors duration-200">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
