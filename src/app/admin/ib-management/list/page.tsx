"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { Network, Search, Download, Copy, ChevronLeft, ChevronRight } from "lucide-react";

interface IBUser {
  id: string; name: string; email: string; phone: string | null; country: string | null;
  ibName: string | null; totalCommission: number; availableCommission: number;
  referralLink: string | null; marketingName: string | null; totalClients: number;
}

export default function IBUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<IBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ib/users").then((r) => r.ok ? r.json() : []).then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const copyLink = useCallback((id: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Name", "Email", "Phone", "Country", "IB Name", "Total Commission", "Available Commission", "Referral Link", "Marketing Name"];
    const rows = filtered.map((u, i) => [i + 1, u.name, u.email, u.phone || "", u.country || "", u.ibName || "", u.totalCommission, u.availableCommission, u.referralLink || "", u.marketingName || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ib-users.csv"; a.click();
  }, [filtered]);

  return (
    <PageShell title="IB User List" description="Manage all introducing brokers" icon={Network}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
            <button onClick={exportCSV} className="ml-2 px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Search:</span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none w-48" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {["ID", "Name", "Email", "Phone", "Country", "IB Name", "Total Commission", "Available Commission", "Referral Link", "Marketing Name", "Action"].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr> :
               paginated.length === 0 ? <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No IB users found</td></tr> :
               paginated.map((u, idx) => (
                <tr key={u.id} className="table-row-hover border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{u.name}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{u.email}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{u.phone || "--"}</td>
                  <td className="px-3 py-3 text-gray-600">{u.country || "--"}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{u.ibName || "--"}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{u.totalCommission}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{u.availableCommission}</td>
                  <td className="px-3 py-3">
                    {u.referralLink ? (
                      <button onClick={() => copyLink(u.id, u.referralLink!)} className="px-3 py-1 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-1">
                        <Copy className="w-3 h-3" /> {copiedId === u.id ? "Copied!" : "Copy"}
                      </button>
                    ) : "--"}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{u.marketingName || "--"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => router.push(`/admin/ib-management/${u.id}/clients`)} className="px-2.5 py-1 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-colors whitespace-nowrap">View Level</button>
                      <button onClick={() => router.push(`/admin/ib-management/${u.id}/commission`)} className="px-2.5 py-1 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-colors whitespace-nowrap">View Commission</button>
                      <button onClick={() => router.push(`/admin/ib-management/tree?ib=${u.id}`)} className="px-2.5 py-1 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-colors whitespace-nowrap">Tree Chart</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
              return <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === pageNum ? "bg-sky-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{pageNum}</button>;
            })}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
