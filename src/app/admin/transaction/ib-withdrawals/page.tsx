"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { Clock, CheckCircle, XCircle, Search, X } from "lucide-react";

interface IBWithdrawal {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
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

export default function PendingIBWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<IBWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState<{ item: IBWithdrawal; action: "approve" | "reject" } | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "ib_withdraw" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/withdrawals?${params.toString()}`);
      if (res.ok) setWithdrawals(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: actionModal.item.id, action: actionModal.action, comment }),
      });
      if (res.ok) {
        setActionModal(null);
        setComment("");
        fetchData();
      }
    } catch { /* ignore */ } finally {
      setProcessing(false);
    }
  };

  const filtered = withdrawals.filter((w) => {
    const q = search.toLowerCase();
    return w.userName.toLowerCase().includes(q) || w.userEmail.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <PageShell title="Pending IB Withdrawals" description="Review and approve IB commission withdrawal requests" icon={Clock}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{withdrawals.length}</p>
          </div>
        </div>
        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${withdrawals.reduce((s, w) => s + w.amount, 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{withdrawals.filter((w) => w.status === "pending").length}</p>
          </div>
        </div>
        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Approved</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{withdrawals.filter((w) => w.status === "approved").length}</p>
          </div>
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
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5">
              {["pending", "approved", "rejected", "all"].map((s) => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No IB withdrawal requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">IB Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Withdraw To</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((w) => (
                  <tr key={w.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3">
                      <p className="text-gray-900 font-medium text-xs">{w.userName}</p>
                      <p className="text-gray-400 text-xs">{w.userEmail}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700 text-xs capitalize">{w.paymentMethod?.replace(/_/g, " ") || "-"}</td>
                    <td className="px-3 py-3 text-gray-900 font-semibold">${w.amount.toFixed(2)}</td>
                    <td className="px-3 py-3 text-gray-700 text-xs">{w.paymentMethod || "-"}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs max-w-[150px] truncate">{w.notes || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(w.status)}`}>{w.status}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      {w.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setActionModal({ item: w, action: "approve" }); setComment(""); }} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => { setActionModal({ item: w, action: "reject" }); setComment(""); }} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium bg-red-50 px-2.5 py-1 rounded-lg">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">{w.adminComment || "-"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm hover:bg-sky-50 disabled:opacity-30">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === i + 1 ? "bg-sky-500 text-white" : "text-gray-600 hover:bg-sky-50"}`}>{i + 1}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-sm hover:bg-sky-50 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {actionModal.action === "approve" ? "Approve IB Withdrawal" : "Reject IB Withdrawal"}
              </h3>
              <button onClick={() => setActionModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">IB</span>
                <span className="font-medium text-gray-900">{actionModal.item.userName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-gray-900">${actionModal.item.amount.toFixed(2)}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {actionModal.action === "approve" ? "Comment (optional)" : "Rejection Reason"}
              </label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none" placeholder={actionModal.action === "approve" ? "Add a comment..." : "Enter reason for rejection..."} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setActionModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAction} disabled={processing || (actionModal.action === "reject" && !comment)} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 ${actionModal.action === "approve" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}>
                {processing ? "Processing..." : actionModal.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
