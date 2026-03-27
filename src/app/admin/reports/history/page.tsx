"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { History, Calendar, Download, Search } from "lucide-react";

interface HistoryRecord {
  login: string; date: string; ticket: string; symbol: string; price: number;
  profit: number; volume: number; commission: number; expertPositionId: string;
  entry: string; action: string; comment: string;
}

export default function HistoryReportPage() {
  const [data, setData] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [mt5Id, setMt5Id] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stats, setStats] = useState({ deposit: 0, withdrawal: 0, swap: 0, commission: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mt5Id) params.set("mt5Id", mt5Id);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/reports/history?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result.history || []);
        setStats(result.stats || { deposit: 0, withdrawal: 0, swap: 0, commission: 0 });
      }
    } catch {} finally { setLoading(false); }
  }, [mt5Id, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((r) =>
    r.login.toLowerCase().includes(search.toLowerCase()) ||
    r.symbol.toLowerCase().includes(search.toLowerCase()) ||
    r.ticket.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportExcel = () => {
    const headers = ["Login", "Date", "Ticket", "Symbol", "Price", "Profit", "Volume", "Commission", "ExpertPosition ID", "Entry", "Action", "Comment"];
    const rows = filtered.map((r) => [r.login, r.date, r.ticket, r.symbol, r.price, r.profit, r.volume, r.commission, r.expertPositionId, r.entry, r.action, r.comment]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "history-report.csv"; a.click();
  };

  return (
    <PageShell title="History Report" description="Trading history report" icon={History}>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">MT5 ID</label>
            <input type="text" value={mt5Id} onChange={(e) => setMt5Id(e.target.value)} placeholder="Enter MT5 ID" className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
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
          <button onClick={() => { setMt5Id(""); setDateFrom(""); setDateTo(""); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 font-medium">Clear</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <span className="text-xs text-emerald-600">Deposit</span>
          <p className="text-lg font-bold text-emerald-700">${stats.deposit.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <span className="text-xs text-red-600">Withdrawal</span>
          <p className="text-lg font-bold text-red-700">${stats.withdrawal.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <span className="text-xs text-amber-600">Swap</span>
          <p className="text-lg font-bold text-amber-700">${stats.swap.toLocaleString()}</p>
        </div>
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
          <span className="text-xs text-sky-600">Commission</span>
          <p className="text-lg font-bold text-sky-700">${stats.commission.toLocaleString()}</p>
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
                {["Login", "Date", "Ticket", "Symbol", "Price", "Profit", "Volume", "Commission", "ExpertPosition ID", "Entry", "Action", "Comment"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent mx-auto" /></td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
              ) : paginated.map((r, idx) => (
                <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-700">{r.login}</td>
                  <td className="px-3 py-3 text-gray-500">{r.date}</td>
                  <td className="px-3 py-3 text-gray-500">{r.ticket}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{r.symbol}</td>
                  <td className="px-3 py-3 text-gray-700">{r.price}</td>
                  <td className="px-3 py-3"><span className={`font-medium ${r.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>${r.profit.toFixed(2)}</span></td>
                  <td className="px-3 py-3 text-gray-700">{r.volume}</td>
                  <td className="px-3 py-3 text-gray-700">${r.commission.toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-500">{r.expertPositionId || "-"}</td>
                  <td className="px-3 py-3 text-gray-700">{r.entry}</td>
                  <td className="px-3 py-3 text-gray-700">{r.action}</td>
                  <td className="px-3 py-3 text-gray-500">{r.comment || "-"}</td>
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
