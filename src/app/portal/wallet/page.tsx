"use client";

import { useState, useEffect } from "react";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle, XCircle, Search } from "lucide-react";

interface WalletData {
  walletBalance: number;
  totalIn: number;
  totalOut: number;
  transactions: { id: string; type: string; amount: number; currency: string; status: string; paymentMethod: string; reference: string; createdAt: string }[];
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = { approved: "bg-emerald-100 text-emerald-700", completed: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700" };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchData = (fromDate?: string, toDate?: string) => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    let url = `/api/portal/wallet?userId=${userId}`;
    if (fromDate) url += `&from=${fromDate}`;
    if (toDate) url += `&to=${toDate}`;
    fetch(url).then((r) => r.ok ? r.json() : null).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = () => { setLoading(true); fetchData(from, to); };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md"><Wallet className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">My Wallet</h1><p className="text-sm text-gray-500">Wallet balance and transaction history</p></div></div>
      <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20"><Wallet className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">My Wallet</h1><p className="text-sm text-gray-500">Wallet balance and transaction history</p></div></div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl p-5 text-white">
          <p className="text-sky-100 text-xs uppercase font-medium">Wallet Balance</p>
          <p className="text-3xl font-bold mt-1">${(data?.walletBalance || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2"><ArrowDownToLine className="w-4 h-4 text-emerald-500" /><span className="text-xs font-semibold text-gray-500 uppercase">Total In</span></div>
          <p className="text-2xl font-bold text-emerald-600">${(data?.totalIn || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2"><ArrowUpFromLine className="w-4 h-4 text-red-500" /><span className="text-xs font-semibold text-gray-500 uppercase">Total Out</span></div>
          <p className="text-2xl font-bold text-red-600">${(data?.totalOut || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
          <button onClick={handleSearch} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1"><Search className="w-4 h-4" />Search</button>
        </div>
      </div>

      {/* Wallet History */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Wallet History</h3></div>
        {!data?.transactions?.length ? (
          <div className="p-10 text-center"><Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No transactions yet!</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr></thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3"><div className="flex items-center gap-2">{tx.type === "deposit" ? <ArrowDownToLine className="w-4 h-4 text-emerald-500" /> : <ArrowUpFromLine className="w-4 h-4 text-red-500" />}<span className="capitalize text-gray-700">{tx.type.replace("_", " ")}</span></div></td>
                    <td className={`px-4 py-3 font-medium ${tx.type === "deposit" ? "text-emerald-600" : "text-red-600"}`}>{tx.type === "deposit" ? "+" : "-"}${tx.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">{tx.paymentMethod || "-"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(tx.status)}`}>{tx.status === "approved" || tx.status === "completed" ? <CheckCircle className="w-3 h-3" /> : tx.status === "rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{tx.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{tx.reference || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
