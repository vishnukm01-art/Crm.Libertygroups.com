"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { CreditCard, Plus, Search, Pencil, Trash2 } from "lucide-react";

interface PSPEntry {
  id: string; gateway: string; countryType: string; status: string;
  type: string; orderNo: number;
}

export default function PSPSettingPage() {
  const [entries, setEntries] = useState<PSPEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ gateway: "", countryType: "All", status: "active", type: "deposit", orderNo: "1" });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : [])
      .then((settings: any[]) => {
        const psp = settings.find((s) => s.key === "psp_entries");
        if (psp) { try { setEntries(JSON.parse(psp.value)); } catch {} }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveEntries = async (list: PSPEntry[]) => {
    await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: [{ key: "psp_entries", value: JSON.stringify(list), group: "psp" }] }),
    });
    setEntries(list);
  };

  const handleAdd = async () => {
    if (!form.gateway) return;
    setSaving(true);
    const newEntry: PSPEntry = {
      id: Date.now().toString(), gateway: form.gateway, countryType: form.countryType,
      status: form.status, type: form.type, orderNo: parseInt(form.orderNo) || 1,
    };
    await saveEntries([...entries, newEntry]);
    setForm({ gateway: "", countryType: "All", status: "active", type: "deposit", orderNo: "1" });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this PSP entry?")) return;
    await saveEntries(entries.filter((e) => e.id !== id));
  };

  const filtered = entries.filter((e) => e.gateway.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <PageShell title="PSP Setting" description="Payment service provider settings" icon={CreditCard}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="PSP Setting" description="Payment service provider settings" icon={CreditCard}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Add Payment Gateway</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Gateway *</label>
            <select value={form.gateway} onChange={(e) => setForm({ ...form, gateway: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none">
              <option value="">Select Gateway</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit Card">Credit Card</option>
              <option value="UPI">UPI</option>
              <option value="PayPal">PayPal</option>
              <option value="Skrill">Skrill</option>
              <option value="Neteller">Neteller</option>
              <option value="Crypto">Crypto</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country Type</label>
            <select value={form.countryType} onChange={(e) => setForm({ ...form, countryType: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none">
              <option value="All">All</option>
              <option value="India">India</option>
              <option value="International">International</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none">
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order No.</label>
            <input type="number" value={form.orderNo} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" />
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving} className="mt-4 px-6 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-medium text-sm disabled:opacity-50">
          {saving ? "Saving..." : "Submit"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
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
                {["S.No", "Payment Gateway", "Country Type", "Status", "Type", "Order No.", "Action"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
              ) : paginated.map((e, idx) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{e.gateway}</td>
                  <td className="px-3 py-3 text-gray-700">{e.countryType}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${e.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{e.status}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-700 capitalize">{e.type}</td>
                  <td className="px-3 py-3 text-gray-700">{e.orderNo}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-sky-600 hover:text-sky-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
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
