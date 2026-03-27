"use client";

import { useState, useEffect } from "react";
import { FileBarChart, Search, DollarSign, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from "lucide-react";

interface Summary { walletBalance: number; totalDeposits: number; totalWithdrawals: number; netDeposit: number; depositCount: number; withdrawalCount: number; pendingCount: number; totalCommission: number; availableCommission: number; isIB: boolean; mt5Account: string | null; }

export default function SummaryReportPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = (f?: string, t?: string) => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    let url = `/api/portal/summary?userId=${userId}`;
    if (f) url += `&from=${f}`;
    if (t) url += `&to=${t}`;
    fetch(url).then((r) => r.ok ? r.json() : null).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(from, to); }, []);
  const handleSearch = () => { setLoading(true); fetchData(from, to); };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20"><FileBarChart className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">Summary Report</h1><p className="text-sm text-gray-500">Overview of your account performance</p></div></div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <button onClick={handleSearch} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1"><Search className="w-4 h-4" />Search</button>
        </div>
      </div>

      {!data ? <div className="p-10 text-center"><p className="text-sm text-gray-400">No data yet!</p></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-sky-200" /><span className="text-xs font-medium text-sky-100 uppercase">Wallet Balance</span></div>
            <p className="text-3xl font-bold">${data.walletBalance.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-2"><ArrowDownToLine className="w-4 h-4 text-emerald-500" /><span className="text-xs font-semibold text-gray-500 uppercase">Total Deposits</span></div>
            <p className="text-2xl font-bold text-emerald-600">${data.totalDeposits.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{data.depositCount} transactions</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-2"><ArrowUpFromLine className="w-4 h-4 text-red-500" /><span className="text-xs font-semibold text-gray-500 uppercase">Total Withdrawals</span></div>
            <p className="text-2xl font-bold text-red-600">${data.totalWithdrawals.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{data.withdrawalCount} transactions</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-blue-500" /><span className="text-xs font-semibold text-gray-500 uppercase">Net Deposit</span></div>
            <p className={`text-2xl font-bold ${data.netDeposit >= 0 ? "text-emerald-600" : "text-red-600"}`}>${data.netDeposit.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{data.pendingCount} pending</p>
          </div>

          {data.isIB && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-purple-500" /><span className="text-xs font-semibold text-gray-500 uppercase">Total Commission</span></div>
                <p className="text-2xl font-bold text-purple-600">${data.totalCommission.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-indigo-500" /><span className="text-xs font-semibold text-gray-500 uppercase">Available Commission</span></div>
                <p className="text-2xl font-bold text-indigo-600">${data.availableCommission.toLocaleString()}</p>
              </div>
            </>
          )}

          {data.mt5Account && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">MT5 Account</p>
              <p className="text-lg font-bold text-gray-900">{data.mt5Account}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
