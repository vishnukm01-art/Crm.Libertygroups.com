"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface MT5User {
  id: string;
  name: string;
  email: string;
  mt5Account: string | null;
  mt5Group: string | null;
  leverage: string | null;
  status: string;
}

export default function MT5UserList() {
  const [users, setUsers] = useState<MT5User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?mt5Only=true");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter((u: MT5User) => u.mt5Account));
      }
    } catch (err) {
      console.error("Failed to fetch MT5 users:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.mt5Account && u.mt5Account.includes(search))
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 animate-fade-in">
        <div className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-5 h-5 text-sky-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading MT5 accounts...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="p-4 border-b border-gray-100 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or MT5 login..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none transition-all duration-300"
          />
        </div>
        <span className="text-sm text-gray-400 font-medium">{filtered.length} accounts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MT5 Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Leverage</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="table-row-hover border-b border-gray-50 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3 font-mono text-xs text-sky-600 font-semibold">{user.mt5Account}</td>
                <td className="px-4 py-3 text-gray-600">{user.mt5Group || "--"}</td>
                <td className="px-4 py-3 text-gray-600">{user.leverage || "--"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {user.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No MT5 accounts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
