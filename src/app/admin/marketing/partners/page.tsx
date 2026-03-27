"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Handshake, Plus, X } from "lucide-react";

interface Partner { id: string; name: string; code: string; commission: number | null; country: string | null; isActive: boolean; createdAt: string; }

export default function PartnersPage() {
  const [data, setData] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Partner> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPartners = useCallback(async () => {
    try { const res = await fetch("/api/marketing/partners"); if (res.ok) setData(await res.json()); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const handleSave = async () => {
    if (!editing?.name || !editing?.code) { setError("Name and code are required"); return; }
    setSaving(true); setError("");
    try {
      const isNew = !editing.id;
      const res = await fetch("/api/marketing/partners", { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!res.ok) { setError((await res.json()).error || "Failed"); return; }
      setEditing(null); fetchPartners();
    } catch { setError("An error occurred"); } finally { setSaving(false); }
  };

  const columns = [
    { key: "name", label: "Partner Name" },
    { key: "code", label: "Code" },
    { key: "country", label: "Country", render: (v: unknown) => String(v || "-") },
    { key: "commission", label: "Commission", render: (v: unknown) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
    { key: "isActive", label: "Status", render: (v: unknown) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{v ? "Active" : "Inactive"}</span>
    )},
    { key: "createdAt", label: "Created", render: (v: unknown) => new Date(String(v)).toLocaleDateString() },
    { key: "actions", label: "", render: (_: unknown, row: Record<string, unknown>) => (
      <button onClick={() => setEditing(row as any)} className="text-xs text-sky-600 hover:text-sky-700 font-medium">Edit</button>
    )},
  ];

  if (loading) return <PageShell title="Marketing Partners" description="Manage partners and affiliates" icon={Handshake}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Marketing Partners" description="Manage partners and affiliates" icon={Handshake} actions={<button onClick={() => setEditing({ name: "", code: "", commission: null, country: "", isActive: true })} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Add Partner</button>}>
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search partners..." emptyMessage="No partners found" />
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-900">{editing.id ? "Edit Partner" : "Add Partner"}</h3><button onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button></div>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-100">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label><input type="text" value={editing.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Commission</label><input type="number" step="0.01" value={editing.commission ?? ""} onChange={(e) => setEditing({ ...editing, commission: e.target.value ? parseFloat(e.target.value) : null })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Country</label><input type="text" value={editing.country || ""} onChange={(e) => setEditing({ ...editing, country: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" /></div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full disabled:opacity-50">{saving ? "Saving..." : editing.id ? "Save Changes" : "Add Partner"}</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
