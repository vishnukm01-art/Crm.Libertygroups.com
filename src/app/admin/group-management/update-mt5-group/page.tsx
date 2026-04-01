"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { RefreshCw, Search, X, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface MT5User { id: string; mt5Account: string; name: string; mt5Group: string | null; }
interface Group { id: string; name: string; description: string | null; isActive: boolean; }

export default function UpdateMT5GroupPage() {
  const router = useRouter();
  const [mt5Users, setMt5Users] = useState<MT5User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search dropdown states
  const [userSearch, setUserSearch] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, groupsRes] = await Promise.all([
          fetch("/api/users?mt5Only=true"),
          fetch("/api/admin/groups?managedOnly=true"),
        ]);
        if (usersRes.ok) {
          const data = await usersRes.json();
          setMt5Users(data.filter((u: MT5User) => u.mt5Account));
        }
        if (groupsRes.ok) {
          const data = await groupsRes.json();
          setGroups(data.filter((g: Group) => g.isActive));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const filteredUsers = userSearch.length >= 3
    ? mt5Users.filter((u) => u.mt5Account.includes(userSearch) || u.name.toLowerCase().includes(userSearch.toLowerCase()))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedGroup) { setError("Please select both MT5 ID and Group"); return; }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/mt5/accounts/update-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mt5Login: selectedUser, groupName: selectedGroup }),
      });
      if (res.ok) { setSuccess("MT5 Group updated successfully!"); setSelectedUser(""); setSelectedGroup(""); setUserSearch(""); }
      else { const d = await res.json(); setError(d.error || "Failed to update"); }
    } catch { setError("An error occurred"); }
    finally { setSubmitting(false); }
  };

  return (
    <PageShell title="Update MT5 Group" description="Change MT5 account group assignment" icon={RefreshCw}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl space-y-5">
        {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Select MT5 ID - Searchable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select MT5 ID <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={selectedUser ? `MT5: ${selectedUser}` : userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(""); }}
                onFocus={() => userSearch.length >= 3 && setUserDropdownOpen(true)}
                placeholder="Type at least 3 characters to search MT5 ID..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none" />
              {selectedUser && <button type="button" onClick={() => { setSelectedUser(""); setUserSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
              {!selectedUser && userDropdownOpen && userSearch.length >= 3 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? <div className="px-4 py-3 text-sm text-gray-400">No MT5 accounts found</div> : filteredUsers.map((u) => (
                    <button key={u.mt5Account} type="button" onClick={() => { setSelectedUser(u.mt5Account); setUserSearch(""); setUserDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-sky-50 transition-colors border-b border-gray-50 last:border-0">
                      <span className="font-medium text-sky-600">{u.mt5Account}</span> <span className="text-gray-400">- {u.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Select Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Group <span className="text-red-500">*</span></label>
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none">
              <option value="">Please Choose...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.description || g.name}>{g.name} ({g.description || g.name})</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? "Updating..." : "Submit"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
