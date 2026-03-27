"use client";

import { useState, useEffect } from "react";
import { Users, Search, CheckCircle, XCircle } from "lucide-react";

interface Client { id: string; name: string; email: string; phone: string; status: string; isIB: boolean; mt5Account: string | null; walletBalance: number; createdAt: string; }
interface Stats { total: number; active: number; inactive: number; subIBs: number; }

const statusBadge = (status: string) => ({ active: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", blocked: "bg-red-100 text-red-700", inactive: "bg-gray-100 text-gray-600" }[status] || "bg-gray-100 text-gray-600");

export default function MyClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, subIBs: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = (searchQuery?: string) => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    let url = `/api/portal/ib-clients?userId=${userId}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    fetch(url).then((r) => r.ok ? r.json() : { clients: [], stats: { total: 0, active: 0, inactive: 0, subIBs: 0 } }).then((d) => { setClients(d.clients); setStats(d.stats); }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);
  const handleSearch = () => { setLoading(true); fetchData(search); };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20"><Users className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">Clients Level 1</h1><p className="text-sm text-gray-500">Your direct referrals</p></div></div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Total Clients</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Active</p><p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Inactive</p><p className="text-2xl font-bold text-gray-500 mt-1">{stats.inactive}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Sub IBs</p><p className="text-2xl font-bold text-sky-600 mt-1">{stats.subIBs}</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
          <button onClick={handleSearch} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1"><Search className="w-4 h-4" />Search</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Clients</h3></div>
        {clients.length === 0 ? <div className="p-10 text-center"><p className="text-sm text-gray-400">No clients yet!</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MT5 ID</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IB</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
          </tr></thead><tbody>
            {clients.map((c) => (<tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="px-4 py-3 text-gray-900 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-gray-700 text-xs">{c.email}</td>
              <td className="px-4 py-3 text-gray-700 text-xs">{c.phone || "-"}</td>
              <td className="px-4 py-3 text-gray-700 text-xs">{c.mt5Account || "-"}</td>
              <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(c.status)}`}>{c.status === "active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{c.status}</span></td>
              <td className="px-4 py-3">{c.isIB ? <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-xs font-medium">IB</span> : <span className="text-gray-400 text-xs">-</span>}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
            </tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
