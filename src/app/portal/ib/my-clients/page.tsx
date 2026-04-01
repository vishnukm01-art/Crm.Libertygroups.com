"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Search, CheckCircle, XCircle } from "lucide-react";

interface Client {
  id: string; name: string; email: string; phone: string; status: string;
  isIB: boolean; mt5Account: string | null; walletBalance: number;
  parentName: string | null; createdAt: string;
}
interface Stats { total: number; active: number; inactive: number; subIBs: number; }

const statusBadge = (status: string) => ({
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  blocked: "bg-red-100 text-red-700",
  inactive: "bg-gray-100 text-gray-600",
}[status] || "bg-gray-100 text-gray-600");

export default function MyClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, subIBs: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeLevel, setActiveLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(1);

  const fetchData = useCallback(async (level: number, searchQuery?: string) => {
    setLoading(true);
    try {
      let url = `/api/portal/ib-clients?level=${level}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setClients(d.clients || []);
        setStats(d.stats || { total: 0, active: 0, inactive: 0, subIBs: 0 });
        if (d.maxLevel) setMaxLevel(d.maxLevel);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(activeLevel); }, [activeLevel, fetchData]);

  const handleLevelChange = (level: number) => {
    setActiveLevel(level);
    setSearch("");
  };

  const handleSearch = () => { fetchData(activeLevel, search); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
          <p className="text-sm text-gray-500">View your referral network by level</p>
        </div>
      </div>

      {/* Level Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {Array.from({ length: Math.max(maxLevel, 20) }, (_, i) => i + 1).map((level) => (
            <button key={level} onClick={() => handleLevelChange(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeLevel === level
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-sky-100 text-sky-700 hover:bg-sky-200"
              }`}>
              Client Level <span className="text-lg font-bold">{level}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
          <div className="text-sm text-gray-500 border-t-2 border-sky-400 pt-2 mt-2 inline-block px-4">Total Team Member</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">${(stats as any).teamInvestment?.toLocaleString() || "0"}</div>
          <div className="text-sm text-gray-500 border-t-2 border-sky-400 pt-2 mt-2 inline-block px-4">My Team Investment</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name or email..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
          <button onClick={handleSearch}
            className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1">
            <Search className="w-4 h-4" />Search
          </button>
        </div>
      </div>

      {/* Client Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            Level {activeLevel} Clients
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeLevel === 1 ? "Your direct referrals" : `Users ${activeLevel} levels deep in your network`}
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">No clients at Level {activeLevel}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MT5 ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Lots</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Commissions</th>
              </tr></thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{c.email}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{c.phone || "-"}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-mono">{c.mt5Account || "-"}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{(c as any).totalLots || 0}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">${(c as any).totalCommission?.toFixed(2) || "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
