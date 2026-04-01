"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { Users, Search, CheckCircle, XCircle } from "lucide-react";

interface Client {
  id: string; name: string; email: string; phone: string | null;
  mt5Account: string | null; totalCommission: number; ibName: string | null;
  isIB: boolean; status: string; createdAt: string;
}
interface Stats { totalMembers: number; totalInvestment: number; totalWithdraw: number; }

const statusBadge = (s: string) => ({ active: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", blocked: "bg-red-100 text-red-700" }[s] || "bg-gray-100 text-gray-600");

export default function IBClientsPage() {
  const params = useParams();
  const ibId = params.id as string;
  const [ibName, setIbName] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, totalInvestment: 0, totalWithdraw: 0 });
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(1);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const fetchClients = useCallback(async (level: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ib/${ibId}/clients?level=${level}`);
      if (res.ok) {
        const data = await res.json();
        setIbName(data.ib?.name || "");
        setStats(data.stats);
        setClients(data.clients);
        if (data.maxLevel) setMaxLevel(data.maxLevel);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [ibId]);

  useEffect(() => { fetchClients(activeLevel); }, [activeLevel, fetchClients]);

  const handleLevelChange = (level: number) => {
    setActiveLevel(level);
    setPage(1);
    setSearch("");
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <PageShell title="My Clients" description={`Referral Clients of IB :- ${ibName}`} icon={Users}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Team Member", value: stats.totalMembers },
          { label: "My Team Investment", value: `$${stats.totalInvestment.toLocaleString()}` },
          { label: "My Team Withdraw", value: `$${stats.totalWithdraw.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 text-center animate-fade-in-up">
            <div className="text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
            <div className="text-sm text-gray-500 border-t-2 border-sky-400 pt-2 mt-2 inline-block px-4">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Level Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {Array.from({ length: Math.max(maxLevel, 20) }, (_, i) => i + 1).map((level) => (
            <button key={level} onClick={() => handleLevelChange(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeLevel === level ? "bg-sky-500 text-white shadow-sm" : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`}>
              Client Level <span className="text-lg font-bold">{level}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level Sub-stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Lot", value: clients.reduce((sum, c: any) => sum + (c.totalLots || 0), 0) },
          { label: "Commission", value: `$${clients.reduce((sum, c: any) => sum + (c.totalCommission || 0), 0).toLocaleString()}` },
          { label: "Deposit", value: `$${clients.reduce((sum, c: any) => sum + (c.totalDeposit || 0), 0).toLocaleString()}` },
          { label: "Withdraw", value: `$${clients.reduce((sum, c: any) => sum + (c.totalWithdraw || 0), 0).toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center animate-fade-in-up">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Client Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Search:</span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none w-48" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {["ID", "Name", "Email", "Phone", "MT5 ID", "Total Lots", "Total Commission", "IB Name", "Registration Date"].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr> :
               paginated.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No data available at Level {activeLevel}</td></tr> :
               paginated.map((c, i) => (
                <tr key={c.id} className="table-row-hover border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-3 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-3 py-3 text-gray-600">{c.email}</td>
                  <td className="px-3 py-3 text-gray-600">{c.phone || "--"}</td>
                  <td className="px-3 py-3 text-gray-600 font-mono">{c.mt5Account || "--"}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{(c as any).totalLots || 0}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{c.totalCommission}</td>
                  <td className="px-3 py-3 text-gray-600">{c.ibName || ibName}</td>
                  <td className="px-3 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString("en-CA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">Showing {filtered.length === 0 ? "0 to 0 of 0" : `${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`} entries</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
              return <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === pageNum ? "bg-sky-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{pageNum}</button>;
            })}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
