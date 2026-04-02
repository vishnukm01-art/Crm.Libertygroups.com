"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Search, Clock } from "lucide-react";

interface Deal {
  order?: string; symbol?: string; action?: string; volume?: number;
  openPrice?: number; closePrice?: number; profit?: number; commission?: number;
  openTime?: string; closeTime?: string; login?: string;
  // Also handle PascalCase from bridge
  Order?: string; Symbol?: string; Action?: string; Volume?: number;
  Price?: number; Profit?: number; PositionID?: number;
  [key: string]: unknown;
}

export default function DealReportPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = (f?: string, t?: string) => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    let url = `/api/portal/deals?userId=${userId}`;
    if (f) url += `&from=${f}`;
    if (t) url += `&to=${t}`;
    fetch(url).then((r) => r.ok ? r.json() : []).then(setDeals).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(from, to); }, []);
  const handleSearch = () => { setLoading(true); fetchData(from, to); };

  const getProfit = (d: Deal) => d.profit ?? d.Profit ?? 0;
  const getVolume = (d: Deal) => d.volume ?? d.Volume ?? 0;
  const getOrder = (d: Deal) => d.order ?? d.Order ?? "-";
  const getSymbol = (d: Deal) => d.symbol ?? d.Symbol ?? "-";
  const getAction = (d: Deal) => d.action ?? d.Action ?? "-";
  const getPrice = (d: Deal) => d.openPrice ?? d.Price ?? 0;

  const totalProfit = deals.reduce((s, d) => s + getProfit(d), 0);
  const totalVolume = deals.reduce((s, d) => s + getVolume(d), 0);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20"><TrendingUp className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">Deal Report</h1><p className="text-sm text-gray-500">View your trading deals</p></div></div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <button onClick={handleSearch} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1"><Search className="w-4 h-4" />Search</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Total Deals</p><p className="text-2xl font-bold text-gray-900 mt-1">{deals.length}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Total Profit</p><p className={`text-2xl font-bold mt-1 ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>${totalProfit.toFixed(2)}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-semibold text-gray-500 uppercase">Total Volume</p><p className="text-2xl font-bold text-gray-900 mt-1">{totalVolume.toFixed(2)}</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Deals</h3></div>
        {deals.length === 0 ? <div className="p-10 text-center"><Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No data available in table</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Symbol</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Volume</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Profit</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Position ID</th>
          </tr></thead><tbody>
            {deals.map((d, i) => (<tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="px-4 py-3 text-gray-700 text-xs">{getOrder(d)}</td>
              <td className="px-4 py-3 text-gray-900 font-medium">{getSymbol(d)}</td>
              <td className="px-4 py-3 text-gray-700">{getAction(d)}</td>
              <td className="px-4 py-3 text-gray-700">{getVolume(d) || "-"}</td>
              <td className="px-4 py-3 text-gray-700">{getPrice(d) || "-"}</td>
              <td className={`px-4 py-3 font-medium ${getProfit(d) >= 0 ? "text-emerald-600" : "text-red-600"}`}>${getProfit(d).toFixed(2)}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{d.openTime ? new Date(d.openTime).toLocaleString() : (d.PositionID || "-")}</td>
            </tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
