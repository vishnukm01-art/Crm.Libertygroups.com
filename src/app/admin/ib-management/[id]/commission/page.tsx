"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { DollarSign, Search, Download } from "lucide-react";

interface TradeCommission {
  id: string;
  mt5Id: string;
  date: string;
  order: string;
  symbol: string;
  price: number;
  profit: number;
  volume: number;
  myCommission: number;
  type: string;
}

export default function IBCommissionViewPage() {
  const params = useParams();
  const ibId = params.id as string;
  const [commissions, setCommissions] = useState<TradeCommission[]>([]);
  const [ibName, setIbName] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ib/${ibId}/commission-history?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setCommissions(data.commissions || []);
        setIbName(data.ibName || "");
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchCommissions(); }, [ibId, from, to]);

  const filtered = commissions.filter((c) =>
    c.mt5Id.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.toLowerCase().includes(search.toLowerCase()) ||
    c.order.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalEarned = filtered.reduce((sum, c) => sum + c.myCommission, 0);

  const exportCSV = () => {
    const headers = ["ID", "MT5 ID", "Date", "Order", "Symbol", "Price", "Profit", "Volume", "My Commission", "Type"];
    const rows = filtered.map((c, i) => [i + 1, c.mt5Id, c.date, c.order, c.symbol, c.price, c.profit, c.volume, c.myCommission, c.type]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ib-commission-detail.csv"; a.click();
  };

  return (
    <PageShell title="IB User Commission List" description={`Commission details for ${ibName}`} icon={DollarSign}>
      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
          </div>
          <button onClick={fetchCommissions}
            className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1">
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
      </div>

      {/* Commission Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
            <button onClick={exportCSV} className="ml-2 px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Search:</span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none w-48" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {["ID", "MT5 ID", "Date", "Order", "Symbol", "Price", "Profit", "Volume", "My Commission", "Type"].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr> :
               filtered.length === 0 ? <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr> :
               paginated.map((c, i) => (
                <tr key={c.id} className="table-row-hover border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-3 py-3 text-gray-600 font-mono">{c.mt5Id}</td>
                  <td className="px-3 py-3 text-gray-600">{c.date}</td>
                  <td className="px-3 py-3 text-gray-600">{c.order}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{c.symbol}</td>
                  <td className="px-3 py-3 text-gray-700">{c.price.toFixed(2)}</td>
                  <td className={`px-3 py-3 font-medium ${c.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{c.profit.toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-700">{c.volume.toFixed(2)}</td>
                  <td className="px-3 py-3 text-emerald-700 font-bold">${c.myCommission.toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-600 capitalize">{c.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
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
