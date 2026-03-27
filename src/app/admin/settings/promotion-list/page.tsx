"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Image as ImageIcon, Plus, Pencil, Trash2, Search, Download } from "lucide-react";

interface Promotion {
  id: string; title: string; image: string; description: string;
  country: string[]; status: string; createdAt: string;
}

const statusBadge = (status: string) => status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600";

export default function PromotionListPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ title: "", image: "", description: "", country: [] as string[], status: "active" });
  const [countryInput, setCountryInput] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : [])
      .then((settings: any[]) => {
        const promo = settings.find((s) => s.key === "promotions_list");
        if (promo) {
          try { setPromotions(JSON.parse(promo.value)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const savePromotions = async (list: Promotion[]) => {
    await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: [{ key: "promotions_list", value: JSON.stringify(list), group: "promotions" }] }),
    });
    setPromotions(list);
  };

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    const newPromo: Promotion = {
      id: Date.now().toString(), title: form.title, image: form.image,
      description: form.description, country: form.country, status: form.status,
      createdAt: new Date().toISOString(),
    };
    await savePromotions([...promotions, newPromo]);
    setForm({ title: "", image: "", description: "", country: [], status: "active" });
    setShowCreate(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    await savePromotions(promotions.filter((p) => p.id !== id));
  };

  const addCountry = () => {
    if (countryInput.trim() && !form.country.includes(countryInput.trim())) {
      setForm({ ...form, country: [...form.country, countryInput.trim()] });
      setCountryInput("");
    }
  };

  const removeCountry = (c: string) => {
    setForm({ ...form, country: form.country.filter((x) => x !== c) });
  };

  const filtered = promotions.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <PageShell title="Promotion List" description="Manage promotions" icon={ImageIcon}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Promotion List" description="Manage promotions" icon={ImageIcon}
      actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 text-sm px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-medium"><Plus className="w-4 h-4" />Create</button>}>
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
                {["ID", "Title", "Image", "Description", "Country", "Status", "Date", "Action"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr>
              ) : paginated.map((p, idx) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{p.title}</td>
                  <td className="px-3 py-3">{p.image ? <span className="text-sky-600 text-xs">View</span> : "-"}</td>
                  <td className="px-3 py-3 text-gray-500 max-w-[200px] truncate">{p.description || "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">{p.country.map((c) => <span key={c} className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded">{c}</span>)}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-sky-600 hover:text-sky-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create Promotion</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Promotion title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Banner URL</label>
                <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50">
                    <button type="button" onClick={() => document.execCommand("bold")} className="px-2 py-1 text-xs font-bold hover:bg-gray-200 rounded">B</button>
                    <button type="button" onClick={() => document.execCommand("italic")} className="px-2 py-1 text-xs italic hover:bg-gray-200 rounded">I</button>
                    <button type="button" onClick={() => document.execCommand("underline")} className="px-2 py-1 text-xs underline hover:bg-gray-200 rounded">U</button>
                    <button type="button" onClick={() => document.execCommand("insertUnorderedList")} className="px-2 py-1 text-xs hover:bg-gray-200 rounded">List</button>
                  </div>
                  <div contentEditable className="min-h-[120px] p-3 text-sm focus:outline-none" onInput={(e) => setForm({ ...form, description: (e.target as HTMLDivElement).innerHTML })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <div className="flex gap-2">
                  <input type="text" value={countryInput} onChange={(e) => setCountryInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCountry(); } }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" placeholder="Type and press Enter" />
                  <button type="button" onClick={addCountry} className="px-4 py-2.5 bg-sky-500 text-white text-sm rounded-xl hover:bg-sky-600">Add</button>
                </div>
                {form.country.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.country.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-lg">
                        {c}<button type="button" onClick={() => removeCountry(c)} className="hover:text-red-500">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button onClick={handleCreate} disabled={saving} className="w-full px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-medium text-sm disabled:opacity-50">
                {saving ? "Creating..." : "Create Promotion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
