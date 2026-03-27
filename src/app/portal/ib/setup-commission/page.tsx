"use client";

import { useState, useEffect } from "react";
import { Settings, DollarSign, AlertCircle, CheckCircle } from "lucide-react";

interface CommissionConfig { id: string; level: number; commissionType: string; value: number; groupName: string | null; }
interface SubIB { id: string; name: string; email: string; isIB: boolean; }

export default function SetupCommissionPage() {
  const [commissions, setCommissions] = useState<CommissionConfig[]>([]);
  const [subIBs, setSubIBs] = useState<SubIB[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState(1);
  const [commissionType, setCommissionType] = useState("per_lot");
  const [value, setValue] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    fetch(`/api/portal/ib-setup-commission?userId=${userId}`)
      .then((r) => r.ok ? r.json() : { commissions: [], subIBs: [] })
      .then((d) => { setCommissions(d.commissions || []); setSubIBs(d.subIBs || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!value || parseFloat(value) <= 0) { setError("Enter a valid commission value"); return; }
    setSaving(true);
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch("/api/portal/ib-setup-commission", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, level, commissionType, value: parseFloat(value), groupName: groupName || null }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setSuccess("Commission configuration saved!");
      // Refresh
      const freshRes = await fetch(`/api/portal/ib-setup-commission?userId=${userId}`);
      if (freshRes.ok) { const d = await freshRes.json(); setCommissions(d.commissions || []); }
      setValue(""); setGroupName("");
    } catch { setError("An error occurred"); } finally { setSaving(false); }
  };

  const tierLabels: Record<number, { name: string; color: string }> = {
    1: { name: "Smart", color: "bg-blue-100 text-blue-700" },
    2: { name: "Elite", color: "bg-purple-100 text-purple-700" },
    3: { name: "Prime", color: "bg-amber-100 text-amber-700" },
    4: { name: "Royal", color: "bg-emerald-100 text-emerald-700" },
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20"><Settings className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">Setup Sub IB Commission</h1><p className="text-sm text-gray-500">Configure commission rates for your network</p></div></div>

      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 mt-0.5" />{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}

      {/* Commission Tier Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((tier) => {
          const config = commissions.find((c) => c.level === tier);
          const label = tierLabels[tier];
          return (
            <div key={tier} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${label.color}`}>{label.name}</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">${config?.value || (tier * 10)}</p>
              <p className="text-xs text-gray-400 mt-1">{config?.commissionType === "percentage" ? "Percentage" : "Per Lot"}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-500" />Set Commission</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level <span className="text-red-500">*</span></label>
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none appearance-none bg-white">
                {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}{tierLabels[l] ? ` - ${tierLabels[l].name}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission Type <span className="text-red-500">*</span></label>
              <select value={commissionType} onChange={(e) => setCommissionType(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none appearance-none bg-white">
                <option value="per_lot">Per Lot</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder={commissionType === "percentage" ? "Enter %" : "Enter $ per lot"} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name (Optional)</label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="e.g., Standard" />
            </div>
            <button type="submit" disabled={saving} className="w-full px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save Commission"}
            </button>
          </form>
        </div>

        {/* Commission Given List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Commission Given List</h3></div>
          {commissions.length === 0 ? <div className="p-10 text-center"><p className="text-sm text-gray-400">No commissions configured yet.</p></div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Level</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
            </tr></thead><tbody>
              {commissions.map((c) => (<tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tierLabels[c.level]?.color || "bg-gray-100 text-gray-700"}`}>{tierLabels[c.level]?.name || `Level ${c.level}`}</span></td>
                <td className="px-4 py-3 text-gray-700 capitalize">{c.commissionType.replace("_", " ")}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{c.commissionType === "percentage" ? `${c.value}%` : `$${c.value}`}</td>
                <td className="px-4 py-3 text-gray-500">{c.groupName || "-"}</td>
              </tr>))}
            </tbody></table></div>
          )}
        </div>
      </div>

      {subIBs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Sub IBs ({subIBs.length})</h3>
          <div className="space-y-2">
            {subIBs.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <div><p className="text-sm font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.email}</p></div>
                {s.isIB && <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-xs font-medium">IB</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
