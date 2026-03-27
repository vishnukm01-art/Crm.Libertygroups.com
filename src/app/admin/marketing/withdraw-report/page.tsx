"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { ArrowUpFromLine, Download, Search } from "lucide-react";

interface WithdrawRecord {
  id: string; name: string; email: string; withdrawFrom: string; withdrawTo: string;
  amount: number; note: string; comment: string; status: string; date: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700", completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function MarketingWithdrawReportPage() {
  const [data, setData] = useState<WithdrawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/users?type=withdraw");
      if (res.ok) {
        const users = await res.json();
        setData(users.map((u: any) => ({
          id: u.id, name: u.name, email: u.email, withdrawFrom: "Wallet",
          withdrawTo: "Bank", amount: u.totalWithdraw || 0, note: "", comment: "",
          status: "approved", date: u.createdAt,
        })));
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportExcel = () => {
    const headers = ["S.No", "Name", "Email", "Withdraw From", "Withdraw To", "Amount", "Note", "Comment", "Status", "Date"];
    const rows = filtered.map((r, i) => [i + 1, r.name, r.email, r.withdrawFrom, r.withdrawTo, r.amount, r.note, r.comment, r.status, new Date(r.date).toLocaleDateString()]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "marketing-withdraw-report.csv"; a.click();
  };

  if (loading) return <PageShell title="Marketing Withdraw Report" description="Marketing team withdrawal report" icon={ArrowUpFromLine}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Marketing Withdraw Report" description="Marketing team withdrawal report" icon={ArrowUpFromLine}>
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
                {["S.No", "Name / Email", "Withdraw From", "Withdraw To", "Amount", "Note", "Comment", "Status", "Date", "Action"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
              ) : paginated.map((r, idx) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="text-gray-700 font-medium">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.email}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{r.withdrawFrom}</td>
                  <td className="px-3 py-3 text-gray-700">{r.withdrawTo}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">${r.amount.toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-500">{r.note || "-"}</td>
                  <td className="px-3 py-3 text-gray-500">{r.comment || "-"}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">Approve</button>
                      <button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
                    </div>
                  </td>
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
