"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { Wallet, Calendar, Download, Search } from "lucide-react";

interface IBWithdrawRecord {
  id: string; userName: string; userEmail: string; withdrawTo: string;
  amount: number; paymentMethod: string; note: string; comment: string;
  status: string; createdAt: string; marketingName: string; approvedBy: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700", approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function IBWithdrawReportPage() {
  const [data, setData] = useState<IBWithdrawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "ib_withdraw" });
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (statusFilter) params.set("status", statusFilter);
      if (methodFilter) params.set("method", methodFilter);
      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) setData(await res.json());
      else setData([]);
    } catch {} finally { setLoading(false); }
  }, [dateFrom, dateTo, statusFilter, methodFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((r) =>
    (r.userName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.userEmail || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportExcel = () => {
    const headers = ["ID", "Name/Email", "Withdraw To", "Amount", "Payment Method", "Note", "Comment", "Status", "Date", "Marketing Name", "Approved/Rejected By"];
    const rows = filtered.map((r, i) => [i + 1, `${r.userName} (${r.userEmail})`, r.withdrawTo || "-", r.amount, r.paymentMethod || "-", r.note || "", r.comment || "", r.status, new Date(r.createdAt).toLocaleDateString(), r.marketingName || "-", r.approvedBy || "-"]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ib-withdraw-report.csv"; a.click();
  };

  return (
    <PageShell title="IB Withdraw Report" description="IB commission withdrawal report" icon={Wallet}>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none bg-white">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none bg-white">
              <option value="">All Methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="crypto">Crypto</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1"><Calendar className="w-3 h-3 inline mr-1" />From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1"><Calendar className="w-3 h-3 inline mr-1" />To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm hover:bg-sky-600 font-medium">Filter</button>
          <button onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter(""); setMethodFilter(""); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 font-medium">Clear</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
            <button onClick={exportExcel} className="ml-2 px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {["ID", "Name / Email", "Withdraw To", "Amount", "Payment Method", "Note", "Comment", "Status", "Date", "Marketing Name", "Approved/Rejected By"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent mx-auto" /></td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
              ) : paginated.map((r, idx) => (
                <tr key={r.id || idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="text-gray-700 font-medium">{r.userName}</div>
                    <div className="text-xs text-gray-400">{r.userEmail}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{r.withdrawTo || "-"}</td>
                  <td className="px-3 py-3 text-orange-600 font-medium">${Number(r.amount).toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-700">{r.paymentMethod || "-"}</td>
                  <td className="px-3 py-3 text-gray-500">{r.note || "-"}</td>
                  <td className="px-3 py-3 text-gray-500">{r.comment || "-"}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-3 text-gray-700">{r.marketingName || "-"}</td>
                  <td className="px-3 py-3 text-gray-700">{r.approvedBy || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
