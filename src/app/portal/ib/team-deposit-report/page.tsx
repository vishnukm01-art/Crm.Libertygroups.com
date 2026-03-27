"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, Clock, CheckCircle, XCircle, Search } from "lucide-react";

interface TeamTx { id: string; userId: string; clientName: string; clientEmail: string; amount: number; status: string; paymentMethod: string; reference: string; createdAt: string; }

const statusBadge = (status: string) => ({ approved: "bg-emerald-100 text-emerald-700", completed: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700" }[status] || "bg-gray-100 text-gray-600");

export default function TeamDepositReportPage() {
  const [data, setData] = useState<{ transactions: TeamTx[]; summary: { total: number; count: number; average: number } }>({ transactions: [], summary: { total: 0, count: 0, average: 0 } });
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = (f?: string, t?: string) => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    let url = `/api/portal/team-reports?userId=${userId}&type=deposit`;
    if (f) url += `&from=${f}`;
    if (t) url += `&to=${t}`;
    fetch(url).then((r) => r.ok ? r.json() : { transactions: [], summary: { total: 0, count: 0, average: 0 } }).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(from, to); }, []);
  const handleSearch = () => { setLoading(true); fetchData(from, to); };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20"><ArrowDownToLine className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">My Team Deposit Report</h1><p className="text-sm text-gray-500">Deposits from your referred clients</p></div></div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <button onClick={handleSearch} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1"><Search className="w-4 h-4" />Search</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Total</p><p className="text-2xl font-bold text-emerald-600 mt-1">${data.summary.total.toLocaleString()}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Count</p><p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.count}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Average</p><p className="text-2xl font-bold text-gray-900 mt-1">${data.summary.average.toFixed(2)}</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Deposit Report</h3></div>
        {data.transactions.length === 0 ? <div className="p-10 text-center"><Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No transactions yet!</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
          </tr></thead><tbody>
            {data.transactions.map((t) => (<tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="px-4 py-3"><p className="text-gray-900 font-medium text-sm">{t.clientName}</p><p className="text-gray-400 text-xs">{t.clientEmail}</p></td>
              <td className="px-4 py-3 text-gray-900 font-medium">${t.amount.toFixed(2)}</td>
              <td className="px-4 py-3 text-gray-700 text-xs">{t.paymentMethod || "-"}</td>
              <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(t.status)}`}>{t.status === "approved" || t.status === "completed" ? <CheckCircle className="w-3 h-3" /> : t.status === "rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{t.status}</span></td>
              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
            </tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
