"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { FileCheck, Search } from "lucide-react";

interface Document {
  id: string;
  userName: string;
  userEmail: string;
  type: string;
  createdAt: string;
  status: string;
  fileName?: string;
}

export default function PendingDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetch("/api/documents?status=pending")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(`${id}-${status}`);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `Failed to ${status === "approved" ? "approve" : "reject"} document`);
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = documents.filter(
    (d) =>
      d.userName.toLowerCase().includes(search.toLowerCase()) ||
      d.userEmail.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <PageShell title="Pending Documents" description="Documents awaiting review and approval" icon={FileCheck}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search pending documents..."
              className="search-input w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none transition-all duration-300"
            />
          </div>
          <span className="text-sm text-gray-400 font-medium">{filtered.length} pending</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No pending documents found</td></tr>
              ) : (
                paginated.map((d) => (
                  <tr key={d.id} className="table-row-hover border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.userName}</td>
                    <td className="px-4 py-3 text-gray-600">{d.userEmail}</td>
                    <td className="px-4 py-3 text-gray-600">{d.type}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Pending
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(d.id, "approved")}
                          disabled={actionLoading !== null}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {actionLoading === `${d.id}-approved` ? "Approving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleAction(d.id, "rejected")}
                          disabled={actionLoading !== null}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {actionLoading === `${d.id}-rejected` ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
