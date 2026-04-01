"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Download, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";

interface MT5User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  mt5Account: string | null;
  mt5Group: string | null;
  marketingName: string | null;
  createdAt: string;
}

interface MT5Details {
  login: string;
  currency: string;
  digits: number;
  createdAt: string;
  balance: number;
  margin: number;
  leverage: number;
  credit: number;
  profit: number;
  assets: number;
  marginLevel: number;
  equity: number;
  equityPrevDay: number;
}

export default function MT5UserList() {
  const [users, setUsers] = useState<MT5User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Details modal state
  const [detailsUser, setDetailsUser] = useState<MT5User | null>(null);
  const [details, setDetails] = useState<MT5Details | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?mt5Only=true");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter((u: MT5User) => u.mt5Account));
      }
    } catch (err) { console.error("Failed to fetch MT5 users:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.mt5Account && u.mt5Account.includes(search))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, filtered.length);

  const fetchDetails = async (user: MT5User) => {
    setDetailsUser(user);
    setDetailsLoading(true);
    setDetails(null);
    try {
      const res = await fetch(`/api/mt5/accounts/${user.mt5Account}`);
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
      }
    } catch { /* ignore */ }
    finally { setDetailsLoading(false); }
  };

  const exportCSV = useCallback(() => {
    const headers = ["ID", "MT5 ID", "Name", "Email", "Phone", "Group", "Country", "Registration Date", "Marketing Name"];
    const rows = filtered.map((u, i) => [i + 1, u.mt5Account, u.name, u.email, u.phone || "", u.mt5Group || "", u.country || "", new Date(u.createdAt).toLocaleDateString(), u.marketingName || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mt5-users.csv"; a.click();
  }, [filtered]);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {["ID", "MT5 ID", "Name", "Email", "Phone", "Group", "Country", "Registration Date", "Marketing Name", "Action"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">No MT5 accounts found</td></tr>
              ) : paginated.map((user, idx) => (
                <tr key={user.id} className="table-row-hover border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3 text-gray-500">{startIdx + idx}</td>
                  <td className="px-3 py-3 text-sky-600 font-mono font-semibold whitespace-nowrap">{user.mt5Account}</td>
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{user.name}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{user.email}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{user.phone || "--"}</td>
                  <td className="px-3 py-3 text-gray-600">{user.mt5Group || "--"}</td>
                  <td className="px-3 py-3 text-gray-600">{user.country || "--"}</td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString("en-CA")}</td>
                  <td className="px-3 py-3 text-gray-600">{user.marketingName || "--"}</td>
                  <td className="px-3 py-3">
                    <button onClick={() => fetchDetails(user)} title="Details"
                      className="px-2.5 py-1 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-colors flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Details
                    </button>
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

      {/* Details Modal */}
      {detailsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailsUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Account Details - {detailsUser.name}</h3>
              <button onClick={() => setDetailsUser(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" /></div>
              ) : details ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Login", value: details.login },
                    { label: "Currency", value: details.currency },
                    { label: "Digits", value: details.digits },
                    { label: "Created At", value: details.createdAt },
                    { label: "Balance", value: `$${details.balance?.toFixed(2)}` },
                    { label: "Margin Leverage", value: `${details.leverage}:1` },
                    { label: "Leverage", value: `1:${details.leverage}` },
                    { label: "Credit", value: `$${details.credit?.toFixed(2)}` },
                    { label: "Profit", value: `$${details.profit?.toFixed(2)}` },
                    { label: "Assets", value: `$${details.assets?.toFixed(2)}` },
                    { label: "Margin", value: `$${details.margin?.toFixed(2)}` },
                    { label: "Equity", value: `$${details.equity?.toFixed(2)}` },
                    { label: "Equity Pev Day", value: `$${details.equityPrevDay?.toFixed(2)}` },
                    { label: "Margin Level", value: details.marginLevel ? `${details.marginLevel}%` : "--" },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.value ?? "--"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">Unable to fetch account details</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
