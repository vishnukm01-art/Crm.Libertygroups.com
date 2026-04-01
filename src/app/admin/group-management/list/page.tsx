"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { Layers, Pencil, Download, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  leverage: string | null;
  commission: number | null;
  isActive: boolean;
  users: number;
  createdAt: string;
}

export default function GroupListPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchGroups(); }, []);

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, filtered.length);

  const exportCSV = () => {
    const headers = ["ID", "Name", "MT5 Group Name", "Status"];
    const rows = filtered.map((g, i) => [i + 1, g.name, g.description || "", g.isActive ? "Active" : "Inactive"]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "group-list.csv"; a.click();
  };

  return (
    <PageShell title="Group List" description="Manage trading groups" icon={Layers}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <a href="/admin/group-management/add" className="btn-primary text-sm">+ Add Group</a>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">Loading groups...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Show</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-sm text-gray-500">entries</span>
              <button onClick={exportCSV} className="ml-2 px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Search:</span>
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none w-48" />
            </div>
          </div>

          {/* Table - matching Reference CRM columns */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {["ID", "Name", "MT5 Group Name", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No groups found</td></tr>
                ) : paginated.map((g, idx) => (
                  <tr key={g.id} className="table-row-hover border-b border-gray-50 last:border-0">
                    <td className="px-3 py-3 text-gray-500">{startIdx + idx}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{g.name}</td>
                    <td className="px-3 py-3 text-gray-600">{g.description || "--"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${g.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {g.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <a href={`/admin/group-management/add?edit=${g.id}`}
                        className="px-2.5 py-1 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-colors inline-flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">Showing {filtered.length === 0 ? "0 to 0 of 0" : `${startIdx} to ${endIdx}`} of {filtered.length} entries</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30">Previous</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pn = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === pn ? "bg-sky-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{pn}</button>;
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
