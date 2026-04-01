"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import {
  UserCheck, CheckCircle, XCircle, X, Clock, Search, Eye,
  User, Mail, Phone, MapPin, AlertCircle,
} from "lucide-react";

interface IBRequestItem {
  id: string;
  userId: string;
  reason: string | null;
  status: string;
  adminComment: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewedByRole: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    country: string | null;
    mt5Account: string | null;
    status: string;
    kycStatus: string;
    isIB: boolean;
    ibParent?: { id: string; name: string } | null;
  };
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function IBRequestsPage() {
  const [requests, setRequests] = useState<IBRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Modals
  const [actionModal, setActionModal] = useState<{ request: IBRequestItem; action: "approve" | "reject" } | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [detailModal, setDetailModal] = useState<IBRequestItem | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/ib-requests?${params.toString()}`);
      if (res.ok) setRequests(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/ib-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: actionModal.request.id,
          action: actionModal.action,
          adminComment: comment,
        }),
      });
      if (res.ok) {
        setActionModal(null);
        setComment("");
        fetchRequests();
      }
    } catch { /* ignore */ } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.user.name.toLowerCase().includes(q) ||
      r.user.email.toLowerCase().includes(q) ||
      (r.user.phone || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <PageShell title="IB Requests" description="Review and manage IB applications" icon={UserCheck}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Applications</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{requests.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{requests.filter((r) => r.status === "pending").length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Approved</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{requests.filter((r) => r.status === "approved").length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{requests.filter((r) => r.status === "rejected").length}</p>
        </div>
      </div>

      {/* Filters & Table */}
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
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <UserCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No IB applications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Applicant</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Phone</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Country</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">MT5</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Reason</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Submitted</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((req) => (
                  <tr key={req.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-3 py-3">
                      <button onClick={() => setDetailModal(req)} className="text-left hover:text-sky-600 transition-colors">
                        <p className="text-gray-900 font-medium text-xs">{req.user.name}</p>
                        <p className="text-gray-400 text-xs">{req.user.email}</p>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-gray-700 text-xs">{req.user.phone || "-"}</td>
                    <td className="px-3 py-3 text-gray-700 text-xs">{req.user.country || "-"}</td>
                    <td className="px-3 py-3 text-gray-700 text-xs font-mono">{req.user.mt5Account || "-"}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs max-w-[200px] truncate" title={req.reason || ""}>{req.reason || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      {req.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setActionModal({ request: req, action: "approve" }); setComment(""); }}
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => { setActionModal({ request: req, action: "reject" }); setComment(""); }}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDetailModal(req)}
                          className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
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

      {/* Approve/Reject Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {actionModal.action === "approve" ? "Approve IB Application" : "Reject IB Application"}
              </h3>
              <button onClick={() => setActionModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Applicant</span>
                <span className="font-medium text-gray-900">{actionModal.request.user.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-700">{actionModal.request.user.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">MT5 Account</span>
                <span className="text-gray-700 font-mono text-xs">{actionModal.request.user.mt5Account || "Not assigned"}</span>
              </div>
              {actionModal.request.reason && (
                <div className="text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-500">Reason:</span>
                  <p className="text-gray-700 mt-1">{actionModal.request.reason}</p>
                </div>
              )}
            </div>

            {actionModal.action === "approve" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 text-xs text-emerald-700">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                This will promote the user to IB status and generate their referral link.
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {actionModal.action === "approve" ? "Comment (optional)" : "Rejection Reason"}
                {actionModal.action === "reject" && <span className="text-red-500"> *</span>}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none"
                placeholder={actionModal.action === "approve" ? "Add a comment (optional)..." : "Enter reason for rejection..."}
              />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setActionModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing || (actionModal.action === "reject" && !comment)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  actionModal.action === "approve" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {processing ? "Processing..." : actionModal.action === "approve" ? "Approve & Promote to IB" : "Reject Application"}
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
              <h3 className="text-lg font-bold text-gray-900">IB Application Details</h3>
              <button onClick={() => setDetailModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Applicant</h4>
                <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{detailModal.user.name}</span></div>
                <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{detailModal.user.email}</span></div>
                {detailModal.user.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{detailModal.user.phone}</span></div>}
                {detailModal.user.country && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{detailModal.user.country}</span></div>}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Application</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(detailModal.status)}`}>{detailModal.status}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Submitted</span>
                  <span className="text-gray-700">{new Date(detailModal.createdAt).toLocaleString()}</span>
                </div>
                {detailModal.reviewedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Reviewed</span>
                    <span className="text-gray-700">{new Date(detailModal.reviewedAt).toLocaleString()}</span>
                  </div>
                )}
                {detailModal.reason && (
                  <div className="text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Reason:</span>
                    <p className="text-gray-700 mt-1">{detailModal.reason}</p>
                  </div>
                )}
                {detailModal.adminComment && (
                  <div className="text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Admin Comment:</span>
                    <p className="text-gray-700 mt-1">{detailModal.adminComment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
