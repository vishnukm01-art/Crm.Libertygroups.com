"use client";

import { useState, useEffect } from "react";
import { DollarSign, Search, Clock } from "lucide-react";

interface CommissionData { totalCommission: number; availableCommission: number; totalWithdrawn: number; commissionConfig: { id: string; level: number; commissionType: string; value: number; groupName: string | null }[]; history: { id: string; action: string; details: string | null; createdAt: string }[]; }

export default function MyCommissionPage() {
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = (f?: string, t?: string) => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    let url = `/api/portal/ib-commission-details?userId=${userId}`;
    if (f) url += `&from=${f}`;
    if (t) url += `&to=${t}`;
    fetch(url).then((r) => r.ok ? r.json() : null).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(from, to); }, []);
  const handleSearch = () => { setLoading(true); fetchData(from, to); };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20"><DollarSign className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">IB User Commission</h1><p className="text-sm text-gray-500">Your commission earnings and history</p></div></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
          <p className="text-emerald-100 text-xs uppercase font-medium">Total Earned</p>
          <p className="text-3xl font-bold mt-1">${(data?.totalCommission || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Available</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${(data?.availableCommission || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Withdrawn</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${(data?.totalWithdrawn || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* History section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">History</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <button onClick={handleSearch} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1"><Search className="w-4 h-4" />Search</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Commission History</h3></div>
        {!data?.history?.length ? <div className="p-10 text-center"><Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No commission yet!</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
          </tr></thead><tbody>
            {data.history.map((h) => (<tr key={h.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(h.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-gray-700">{h.action}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{h.details || "-"}</td>
            </tr>))}
          </tbody></table></div>
        )}
      </div>

      {/* Top 5 Earnings of Sub IBs */}
      <Top5Earnings />
    </div>
  );
}

function Top5Earnings() {
  const [period, setPeriod] = useState<"all" | "yearly" | "monthly" | "weekly">("all");
  const [topIBs, setTopIBs] = useState<{ name: string; email: string; earnings: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const userId = localStorage.getItem("portalUserId") || "demo";
    fetch(`/api/portal/ib-top-earnings?userId=${userId}&period=${period}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setTopIBs)
      .catch(() => setTopIBs([]))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Top 5 Earnings of Sub IBs</h3>
        <div className="flex gap-1">
          {(["all", "yearly", "monthly", "weekly"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${period === p ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : topIBs.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No data yet!</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {topIBs.map((ib, i) => (
            <div key={ib.email} className="px-4 py-3 flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"}`}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{ib.name}</p>
                <p className="text-xs text-gray-400">{ib.email}</p>
              </div>
              <span className="text-sm font-bold text-emerald-600">${ib.earnings.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
