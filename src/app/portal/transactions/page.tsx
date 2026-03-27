"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle,
  Receipt, Eye, X, Image, FileText,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  proofFilePath: string | null;
  adminComment: string | null;
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

const statusIcon = (status: string) => {
  if (status === "approved" || status === "completed") return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === "rejected") return <XCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

const typeIcon = (type: string) => {
  if (type === "deposit") return <ArrowDownCircle className="w-4 h-4 text-emerald-500" />;
  return <ArrowUpCircle className="w-4 h-4 text-red-500" />;
};

export default function PortalTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [viewProof, setViewProof] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch(`/api/portal/deposits?userId=${userId}`);
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.status === filter);

  // Stats
  const totalDeposits = transactions.reduce((sum, t) => sum + t.amount, 0);
  const pendingCount = transactions.filter((t) => t.status === "pending").length;
  const approvedCount = transactions.filter((t) => t.status === "approved" || t.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20">
          <Receipt className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-sm text-gray-500">View all your deposit transactions</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Deposits</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${totalDeposits.toFixed(2)}</p>
          </div>
        </div>
        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          </div>
        </div>
        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Approved</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {["all", "pending", "approved", "completed", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No transactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Proof</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Comment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {typeIcon(t.type)}
                        <span className="capitalize text-gray-700">{t.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{t.reference || "-"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">${t.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">{t.paymentMethod || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(t.status)}`}>
                        {statusIcon(t.status)} {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.proofFilePath ? (
                        <button
                          onClick={() => setViewProof(t.proofFilePath)}
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{t.adminComment || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Viewer Modal */}
      {viewProof && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewProof(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-2xl max-h-[90vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Image className="w-4 h-4 text-sky-500" />
                Deposit Proof
              </h3>
              <button onClick={() => setViewProof(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {viewProof.endsWith(".pdf") ? (
              <iframe src={viewProof} className="w-full h-[70vh] rounded-lg border border-gray-100" />
            ) : (
              <img src={viewProof} alt="Deposit proof" className="max-w-full rounded-lg border border-gray-100" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
