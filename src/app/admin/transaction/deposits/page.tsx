"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { ArrowDownToLine, Search, Download } from "lucide-react";

interface Deposit {
  id: string;
  userName: string;
  userEmail: string;
  mt5Account: string | null;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/transactions?type=deposit")
      .then((r) => r.ok ? r.json() : [])
      .then(setDeposits)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = deposits.filter((d) => {
    const q = search.toLowerCase();
    return d.userName.toLowerCase().includes(q) || d.userEmail.toLowerCase().includes(q) || (d.reference || "").toLowerCase().includes(q) || (d.mt5Account || "").toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCSV = () => {
    const headers = ["ID", "Client", "Email", "MT5", "Amount", "Currency", "Method", "Reference", "Status", "Date"];
    const rows = filtered.map((d) => [d.id, d.userName, d.userEmail, d.mt5Account || "", d.amount, d.currency, d.paymentMethod || "", d.reference || "", d.status, new Date(d.createdAt).toLocaleDateString()]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "deposits.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell title="Deposits" description="All deposit transactions" icon={ArrowDownToLine}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
            <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search deposits..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ArrowDownToLine className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No deposits found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">MT5</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3 text-gray-500 text-xs font-mono">{d.id.slice(0, 8)}...</td>
                    <td className="px-3 py-3">
                      <p className="text-gray-900 font-medium text-xs">{d.userName}</p>
                      <p className="text-gray-400 text-xs">{d.userEmail}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700 text-xs font-mono">{d.mt5Account || "-"}</td>
                    <td className="px-3 py-3 text-gray-900 font-semibold">${d.amount.toFixed(2)}</td>
                    <td className="px-3 py-3 text-gray-700 text-xs">{d.paymentMethod || "-"}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs font-mono">{d.reference || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(d.status)}`}>{d.status}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm hover:bg-sky-50 disabled:opacity-30">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === i + 1 ? "bg-sky-500 text-white" : "text-gray-600 hover:bg-sky-50"}`}>{i + 1}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-sm hover:bg-sky-50 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
