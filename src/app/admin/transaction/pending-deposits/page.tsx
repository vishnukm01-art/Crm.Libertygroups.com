"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import {
  Clock, CheckCircle, XCircle, Eye, X, Image, Search,
  AlertCircle, User, Mail, Phone, DollarSign,
} from "lucide-react";

interface PendingDeposit {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  mt5Account: string | null;
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

export default function PendingDepositsPage() {
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Modals
  const [viewProof, setViewProof] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ deposit: PendingDeposit; action: "approve" | "reject" } | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [detailModal, setDetailModal] = useState<PendingDeposit | null>(null);

  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/deposits?${params.toString()}`);
      if (res.ok) setDeposits(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/deposits/${actionModal.deposit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionModal.action, comment }),
      });
      if (res.ok) {
        setActionModal(null);
        setComment("");
        fetchDeposits();
      }
    } catch { /* ignore */ } finally {
      setProcessing(false);
    }
  };

  const filtered = deposits.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.userName.toLowerCase().includes(q) ||
      d.userEmail.toLowerCase().includes(q) ||
      (d.reference || "").toLowerCase().includes(q) ||
      (d.mt5Account || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <PageShell title="Pending Deposits" description="Review and approve user deposit requests" icon={Clock}>
      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{deposits.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${deposits.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">With Proof</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">
            {deposits.filter((d) => d.proofFilePath).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Without Proof</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {deposits.filter((d) => !d.proofFilePath).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5">
              {["pending", "approved", "rejected", "all"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    statusFilter === s ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, reference..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No deposit requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Client</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">MT5</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Amount</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Method</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Reference</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Proof</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Notes</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Date</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((dep) => (
                  <tr key={dep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setDetailModal(dep)}
                        className="text-left hover:text-sky-600 transition-colors"
                      >
                        <p className="text-gray-900 font-medium text-xs">{dep.userName}</p>
                        <p className="text-gray-400 text-xs">{dep.userEmail}</p>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-gray-700 text-xs font-mono">{dep.mt5Account || "-"}</td>
                    <td className="px-3 py-3 text-gray-900 font-semibold">${dep.amount.toFixed(2)}</td>
                    <td className="px-3 py-3 text-gray-700 text-xs">{dep.paymentMethod || "-"}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs font-mono">{dep.reference || "-"}</td>
                    <td className="px-3 py-3">
                      {dep.proofFilePath ? (
                        <button
                          onClick={() => setViewProof(dep.proofFilePath)}
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 text-xs font-medium bg-sky-50 px-2 py-1 rounded-lg"
                        >
                          <Eye className="w-3 h-3" /> View Proof
                        </button>
                      ) : (
                        <span className="text-amber-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> No proof
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs max-w-[150px] truncate" title={dep.notes || ""}>{dep.notes || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(dep.status)}`}>
                        {dep.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(dep.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      {dep.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setActionModal({ deposit: dep, action: "approve" }); setComment(""); }}
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => { setActionModal({ deposit: dep, action: "reject" }); setComment(""); }}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">{dep.adminComment || "-"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm hover:bg-sky-50 disabled:opacity-30">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === p ? "bg-sky-500 text-white" : "text-gray-600 hover:bg-sky-50"}`}>{p}</button>
              );
            })}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-sm hover:bg-sky-50 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>

      {/* Proof Viewer Modal */}
      {viewProof && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setViewProof(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Image className="w-5 h-5 text-sky-500" />
                Deposit Proof
              </h3>
              <button onClick={() => setViewProof(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {viewProof.endsWith(".pdf") ? (
              <iframe src={viewProof} className="w-full h-[70vh] rounded-xl border border-gray-100" />
            ) : (
              <img src={viewProof} alt="Deposit proof" className="max-w-full rounded-xl border border-gray-100" />
            )}
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {actionModal.action === "approve" ? "Approve Deposit" : "Reject Deposit"}
              </h3>
              <button onClick={() => setActionModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Client</span>
                <span className="font-medium text-gray-900">{actionModal.deposit.userName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-gray-900">${actionModal.deposit.amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Method</span>
                <span className="text-gray-700">{actionModal.deposit.paymentMethod || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Reference</span>
                <span className="text-gray-700 font-mono text-xs">{actionModal.deposit.reference || "-"}</span>
              </div>
              {actionModal.deposit.proofFilePath && (
                <button
                  onClick={() => setViewProof(actionModal.deposit.proofFilePath)}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 text-sky-600 hover:text-sky-700 text-xs font-medium bg-sky-50 px-3 py-2 rounded-lg"
                >
                  <Eye className="w-3.5 h-3.5" /> View Deposit Proof
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {actionModal.action === "approve" ? "Approval Comment (optional)" : "Rejection Reason"}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none"
                placeholder={
                  actionModal.action === "approve"
                    ? "Add a comment (optional)..."
                    : "Enter reason for rejection..."
                }
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing || (actionModal.action === "reject" && !comment)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  actionModal.action === "approve"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {processing
                  ? "Processing..."
                  : actionModal.action === "approve"
                  ? "Approve Deposit"
                  : "Reject Deposit"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Deposit Details</h3>
              <button onClick={() => setDetailModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Client info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Client Information</h4>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{detailModal.userName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{detailModal.userEmail}</span>
                </div>
                {detailModal.userPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{detailModal.userPhone}</span>
                  </div>
                )}
                {detailModal.mt5Account && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 font-mono">MT5: {detailModal.mt5Account}</span>
                  </div>
                )}
              </div>

              {/* Transaction info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Transaction Details</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-gray-900">${detailModal.amount.toFixed(2)} {detailModal.currency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Method</span>
                  <span className="text-gray-700">{detailModal.paymentMethod || "-"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Reference</span>
                  <span className="text-gray-700 font-mono text-xs">{detailModal.reference || "-"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(detailModal.status)}`}>
                    {detailModal.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-700">{new Date(detailModal.createdAt).toLocaleString()}</span>
                </div>
                {detailModal.notes && (
                  <div className="text-sm">
                    <span className="text-gray-500">Notes:</span>
                    <p className="text-gray-700 mt-1">{detailModal.notes}</p>
                  </div>
                )}
              </div>

              {/* Proof */}
              {detailModal.proofFilePath && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Deposit Proof</h4>
                  {detailModal.proofFilePath.endsWith(".pdf") ? (
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
                      <a
                        href={detailModal.proofFilePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium text-sm"
                      >
                        <Eye className="w-4 h-4" /> Open PDF Proof
                      </a>
                    </div>
                  ) : (
                    <img
                      src={detailModal.proofFilePath}
                      alt="Deposit proof"
                      className="w-full rounded-xl border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => { setViewProof(detailModal.proofFilePath); setDetailModal(null); }}
                    />
                  )}
                </div>
              )}

              {/* Admin comment */}
              {detailModal.adminComment && (
                <div className="bg-sky-50 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-sky-700 uppercase mb-1">Admin Comment</h4>
                  <p className="text-sm text-sky-800">{detailModal.adminComment}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
