"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { TrendingUp, Download, Search } from "lucide-react";

interface PositionRecord {
  login: string; symbol: string; ticket: string; date: string; type: string;
  volume: number; openPrice: number; sl: number; tp: number; currentPrice: number; profit: number;
}

export default function PositionReportPage() {
  const [data, setData] = useState<PositionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [mt5Id, setMt5Id] = useState("");
  const [stats, setStats] = useState({ balance: 0, equity: 0, profit: 0, freeMargin: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mt5Id) params.set("mt5Id", mt5Id);
      const res = await fetch(`/api/reports/position?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result.positions || []);
        setStats(result.stats || { balance: 0, equity: 0, profit: 0, freeMargin: 0 });
      }
    } catch {} finally { setLoading(false); }
  }, [mt5Id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((r) =>
    r.login.toLowerCase().includes(search.toLowerCase()) ||
    r.symbol.toLowerCase().includes(search.toLowerCase()) ||
    r.ticket.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportExcel = () => {
    const headers = ["Login", "Symbol", "Ticket", "Date", "Type", "Volume", "Open Price", "S/L", "T/P", "Current Price", "Profit"];
    const rows = filtered.map((r) => [r.login, r.symbol, r.ticket, r.date, r.type, r.volume, r.openPrice, r.sl, r.tp, r.currentPrice, r.profit]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "position-report.csv"; a.click();
  };

  return (
    <PageShell title="Position Report" description="Open positions report" icon={TrendingUp}>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">MT5 ID</label>
            <input type="text" value={mt5Id} onChange={(e) => setMt5Id(e.target.value)} placeholder="Enter MT5 ID" className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm hover:bg-sky-600 font-medium">Search</button>
          <button onClick={() => setMt5Id("")} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 font-medium">Clear</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Balance", value: stats.balance, color: "sky" },
          { label: "Equity", value: stats.equity, color: "emerald" },
          { label: "Profit", value: stats.profit, color: stats.profit >= 0 ? "emerald" : "red" },
          { label: "Free Margin", value: stats.freeMargin, color: "amber" },
        ].map((s) => (
          <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl p-4`}>
            <span className={`text-xs text-${s.color}-600`}>{s.label}</span>
            <p className={`text-lg font-bold text-${s.color}-700`}>${s.value.toLocaleString()}</p>
          </div>
        ))}
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
                {["Login", "Symbol", "Ticket", "Date", "Type", "Volume", "Open Price", "S/L", "T/P", "Current Price", "Profit"].map((h) => (
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
                <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-700">{r.login}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{r.symbol}</td>
                  <td className="px-3 py-3 text-gray-500">{r.ticket}</td>
                  <td className="px-3 py-3 text-gray-500">{r.date}</td>
                  <td className="px-3 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.type === "Buy" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.type}</span></td>
                  <td className="px-3 py-3 text-gray-700">{r.volume}</td>
                  <td className="px-3 py-3 text-gray-700">{r.openPrice}</td>
                  <td className="px-3 py-3 text-gray-500">{r.sl}</td>
                  <td className="px-3 py-3 text-gray-500">{r.tp}</td>
                  <td className="px-3 py-3 text-gray-700">{r.currentPrice}</td>
                  <td className="px-3 py-3"><span className={`font-medium ${r.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>${r.profit.toFixed(2)}</span></td>
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
