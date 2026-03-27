"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Pencil, Eye, ArrowDownToLine, ArrowUpFromLine,
  Key, Trash2, Download, ChevronLeft, ChevronRight,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  walletBalance: number;
  isIB: boolean;
  ibParent: { name: string } | null;
  twoFactorEnabled: boolean;
  marketingName: string | null;
  createdAt: string;
}

export default function UserList() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch (err) { console.error("Failed to fetch users:", err); }
    finally { setLoading(false); }
  };

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone && u.phone.includes(search))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, filtered.length);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    } catch (err) { console.error("Delete failed:", err); }
    setDeleteTarget(null);
  }, [deleteTarget]);

  const handlePromoteIB = useCallback(async (user: User) => {
    setPromoting(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/promote-ib`, { method: "POST" });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isIB: true } : u));
      }
    } catch (err) { console.error("Promote IB failed:", err); }
    setPromoting(null);
  }, []);

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Name", "Email", "Phone", "Country", "Wallet Balance", "IB Name", "Registration Date", "2FA", "Marketing Name"];
    const rows = filtered.map((u, i) => [
      i + 1, u.name, u.email, u.phone || "", u.country || "",
      u.walletBalance || 0, u.ibParent?.name || "", new Date(u.createdAt).toLocaleDateString(),
      u.twoFactorEnabled ? "Enabled" : "Disabled", u.marketingName || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "user-list.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 animate-fade-in">
        <div className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-5 h-5 text-sky-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
        {/* Toolbar */}
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
            <button onClick={exportCSV} className="ml-2 px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
          <div className="relative flex-1 max-w-xs">
            <span className="text-sm text-gray-500 mr-2">Search:</span>
            <input
              type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none w-48"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {["ID", "Name", "Email", "Phone", "Country", "Wallet Balance", "IB Name", "Registration Date", "Google 2FA", "Marketing Name", "Action", "Create IB"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-12 text-center text-gray-400">No users found</td></tr>
              ) : paginated.map((user, idx) => (
                <tr key={user.id} className="table-row-hover border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3 text-gray-500 font-medium">{startIdx + idx}</td>
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{user.name}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{user.email}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{user.phone || "--"}</td>
                  <td className="px-3 py-3 text-gray-600">{user.country || "--"}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{user.walletBalance || 0}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{user.ibParent?.name || "--"}</td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString("en-CA")}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.twoFactorEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{user.marketingName || "--"}</td>
                  {/* Action icons */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => router.push(`/admin/user-management/add-user?edit=${user.id}`)} title="Edit" className="p-1.5 rounded-lg hover:bg-sky-50 text-gray-400 hover:text-sky-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => router.push(`/admin/user-management/user-list?view=${user.id}`)} title="View" className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => router.push(`/admin/user-management/deposit?user=${user.id}`)} title="Deposit" className="p-1.5 rounded-lg hover:bg-sky-50 text-gray-400 hover:text-sky-600 transition-colors"><ArrowDownToLine className="w-4 h-4" /></button>
                      <button onClick={() => router.push(`/admin/user-management/withdraw?user=${user.id}`)} title="Withdraw" className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"><ArrowUpFromLine className="w-4 h-4" /></button>
                      <button onClick={() => router.push(`/admin/user-management/change-password?user=${user.id}`)} title="Change Password" className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"><Key className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(user)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                  {/* Create IB */}
                  <td className="px-3 py-3">
                    {user.isIB ? (
                      <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500">Already IB</span>
                    ) : (
                      <button
                        onClick={() => handlePromoteIB(user)}
                        disabled={promoting === user.id}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
                      >
                        {promoting === user.id ? "..." : "Promote As IB"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing {filtered.length === 0 ? 0 : startIdx} to {endIdx} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === pageNum ? "bg-sky-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">Next</button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
