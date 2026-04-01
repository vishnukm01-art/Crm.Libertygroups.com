"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, X } from "lucide-react";

interface MT5Group {
  name: string;
  description?: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  mt5Account: string | null;
}

interface MT5AccountFormProps {
  userId?: string;
  onSuccess?: () => void;
}

export default function MT5AccountForm({ userId, onSuccess }: MT5AccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [groups, setGroups] = useState<MT5Group[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserOption[]>([]);

  // Search dropdown state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    userId: userId || "",
    group: "",
    leverage: "1:200",
    password: "",
  });

  useEffect(() => {
    fetchGroups();
    if (!userId) fetchUsers();
  }, [userId]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/admin/groups");
      if (res.ok) {
        const data = await res.json();
        // Only show active groups from Group Management
        const activeGroups = Array.isArray(data) ? data.filter((g: { isActive: boolean }) => g.isActive) : [];
        setGroups(activeGroups);
        if (activeGroups.length > 0 && !form.group) {
          setForm((prev) => ({ ...prev, group: activeGroups[0].description || activeGroups[0].name }));
        }
      }
    } catch { console.error("Failed to fetch groups"); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?noMT5=true");
      if (res.ok) {
        const data = await res.json();
        const usersWithoutMT5 = data.filter((u: UserOption) => !u.mt5Account);
        setAllUsers(usersWithoutMT5);
        setFilteredUsers(usersWithoutMT5);
      }
    } catch { console.error("Failed to fetch users"); }
  };

  const handleSearchQuery = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 3) {
      const filtered = allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
      setSearchOpen(true);
    } else {
      setFilteredUsers([]);
      setSearchOpen(false);
    }
  };

  const handleSelectUser = (user: UserOption) => {
    setForm({ ...form, userId: user.id });
    setSearchQuery(`${user.name} (${user.email})`);
    setSearchOpen(false);
  };

  const handleClearUser = () => {
    setForm({ ...form, userId: "" });
    setSearchQuery("");
    setFilteredUsers([]);
    setSearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!form.userId) { setError("Please select a user"); setLoading(false); return; }

    try {
      const res = await fetch("/api/mt5/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create MT5 account"); return; }
      setSuccess(`MT5 account ${data.mt5Login} created successfully!`);
      onSuccess?.();
    } catch { setError("An error occurred"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 animate-fade-in-up max-w-3xl">
      {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!userId && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Client *</label>
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 3 && setSearchOpen(true)}
                  placeholder={searchQuery.length < 3 ? "Type at least 3 characters to search..." : "Search by name or email..."}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                />
                {form.userId && (
                  <button type="button" onClick={handleClearUser} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {!form.userId && (
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                )}
              </div>
              {searchOpen && searchQuery.length >= 3 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No users found</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-sky-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium text-gray-900">{u.name}</span>
                        <span className="text-xs text-gray-400">{u.email}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Group *</label>
          <select
            required
            value={form.group}
            onChange={(e) => setForm({ ...form, group: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.description || g.name}>{g.name} ({g.description || g.name})</option>
            ))}
            {groups.length === 0 && <option value="">Loading groups...</option>}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Leverage *</label>
          <select
            required
            value={form.leverage}
            onChange={(e) => setForm({ ...form, leverage: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
          >
            <option value="">Please Choose...</option>
            <option value="1:50">1:50</option>
            <option value="1:100">1:100</option>
            <option value="1:200">1:200</option>
            <option value="1:500">1:500</option>
            <option value="1:1000">1:1000</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">MT5 Password *</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
            placeholder="Set a trading password"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? "Creating MT5 Account..." : "Submit"}
      </button>
    </form>
  );
}
