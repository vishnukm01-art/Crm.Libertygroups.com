"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { Users, Plus, Pencil, Trash2, Download, Search } from "lucide-react";

interface MarketingUser {
  id: string; name: string; email: string; phone: string | null; role: string;
  incentive: number; netDeposit: number; totalWithdraw: number; isActive: boolean;
  _count?: { leads: number }; createdAt: string;
}

export default function MarketingListPage() {
  const [users, setUsers] = useState<MarketingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing/users");
      if (res.ok) setUsers(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await fetch("/api/marketing/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      fetchUsers();
    } catch {}
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || "").includes(search)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportExcel = () => {
    const headers = ["S.No", "Name", "Email", "Phone", "Wallet Balance", "Incentive (%)", "Net Deposit (Monthly)", "Total Clients", "Total Deposit", "Total Withdraw", "Role", "Manager Name"];
    const rows = filtered.map((u, i) => [i + 1, u.name, u.email, u.phone || "", 0, u.incentive, u.netDeposit, u._count?.leads || 0, 0, u.totalWithdraw, u.role.replace("_", " "), "-"]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "marketing-list.csv"; a.click();
  };

  if (loading) return <PageShell title="Marketing List" description="All marketing team members" icon={Users}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Marketing List" description="All marketing team members" icon={Users}
      actions={<a href="/admin/marketing/add" className="flex items-center gap-2 text-sm px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-medium"><Plus className="w-4 h-4" />Add Marketing</a>}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
            <button onClick={exportExcel} className="ml-2 px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {["S.No","Name","Email","Phone","Wallet Balance","Incentive (%)","Net Deposit (Monthly)","Total Clients","Total Deposit","Total Withdraw","Password","Role","Manager Name","Action","Permission"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={15} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
              ) : paginated.map((u, idx) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{u.name}</td>
                  <td className="px-3 py-3 text-gray-700">{u.email}</td>
                  <td className="px-3 py-3 text-gray-700">{u.phone || "-"}</td>
                  <td className="px-3 py-3 text-gray-700">$0.00</td>
                  <td className="px-3 py-3 text-gray-700">{u.incentive}%</td>
                  <td className="px-3 py-3 text-gray-700">${u.netDeposit.toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-700">{u._count?.leads || 0}</td>
                  <td className="px-3 py-3 text-gray-700">$0.00</td>
                  <td className="px-3 py-3 text-gray-700">${u.totalWithdraw.toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs">****</td>
                  <td className="px-3 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 capitalize">{u.role.replace("_", " ")}</span></td>
                  <td className="px-3 py-3 text-gray-700">-</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-sky-600 hover:text-sky-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                  <td className="px-3 py-3"><button className="text-xs text-sky-600 hover:text-sky-700 font-medium">Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </PageShell>
  );
}
