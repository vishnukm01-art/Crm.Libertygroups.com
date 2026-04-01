"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, DollarSign, AlertCircle, CheckCircle, Users, ChevronDown } from "lucide-react";

interface GroupCeiling { id: string; groupName: string; ceilingPerLot: number; }
interface SubIB { id: string; name: string; email: string; isIB: boolean; }
interface Assignment { id: string; parentIBId: string; childIBId: string; groupName: string; valuePerLot: number; }
interface MyAllocation { groupName: string; valuePerLot: number; }

const GROUP_COLORS: Record<string, string> = {
  Smart: "bg-blue-100 text-blue-700 border-blue-200",
  Elite: "bg-purple-100 text-purple-700 border-purple-200",
  Prime: "bg-amber-100 text-amber-700 border-amber-200",
  Royal: "bg-emerald-100 text-emerald-700 border-emerald-200",
  HEMS: "bg-rose-100 text-rose-700 border-rose-200",
  ATL: "bg-cyan-100 text-cyan-700 border-cyan-200",
  James: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Platinum: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function SetupCommissionPage() {
  const [ceilings, setCeilings] = useState<GroupCeiling[]>([]);
  const [myAllocations, setMyAllocations] = useState<MyAllocation[]>([]);
  const [subIBs, setSubIBs] = useState<SubIB[]>([]);
  const [childAssignments, setChildAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form
  const [selectedChild, setSelectedChild] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [commissionValue, setCommissionValue] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/ib-setup-commission");
      if (res.ok) {
        const d = await res.json();
        setCeilings(d.ceilings || []);
        setMyAllocations(d.myAllocations || []);
        setSubIBs(d.subIBs || []);
        setChildAssignments(d.childAssignments || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getMyLimit = (groupName: string) => {
    const alloc = myAllocations.find((a) => a.groupName === groupName);
    if (alloc) return alloc.valuePerLot;
    const ceiling = ceilings.find((c) => c.groupName === groupName);
    return ceiling?.ceilingPerLot || 0;
  };

  const getChildValue = (childId: string, groupName: string) => {
    return childAssignments.find((a) => a.childIBId === childId && a.groupName === groupName)?.valuePerLot;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!selectedChild || !selectedGroup || !commissionValue) {
      setError("Please fill all fields");
      return;
    }

    const value = parseFloat(commissionValue);
    if (isNaN(value) || value < 0) {
      setError("Enter a valid commission value");
      return;
    }

    const myLimit = getMyLimit(selectedGroup);
    if (value > myLimit) {
      setError(`Value $${value} exceeds your allocation of $${myLimit} for ${selectedGroup}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/portal/ib-setup-commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childIBId: selectedChild,
          groupName: selectedGroup,
          valuePerLot: value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to set commission");
        return;
      }
      setSuccess(`${selectedGroup} commission set to $${value}/lot successfully!`);
      setCommissionValue("");
      fetchData();
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Quick-set: set a specific group commission for a specific child
  const quickSet = async (childId: string, groupName: string, value: string) => {
    const v = parseFloat(value);
    if (isNaN(v) || v < 0) return;

    const myLimit = getMyLimit(groupName);
    if (v > myLimit) {
      setError(`Value $${v} exceeds your allocation of $${myLimit} for ${groupName}`);
      return;
    }

    setError(""); setSuccess("");
    try {
      const res = await fetch("/api/portal/ib-setup-commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childIBId: childId, groupName, valuePerLot: v }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setSuccess(`${groupName} commission set to $${v}/lot`);
      fetchData();
    } catch {
      setError("An error occurred");
    }
  };

  const [quickValues, setQuickValues] = useState<Record<string, string>>({});

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Setup Sub IB Commission</h1>
          <p className="text-sm text-gray-500">Configure commission rates for your sub-IBs by group</p>
        </div>
      </div>

      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 mt-0.5" />{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}

      {/* My Commission Limits */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {ceilings.map((c) => {
          const myLimit = getMyLimit(c.groupName);
          const color = GROUP_COLORS[c.groupName] || "bg-gray-100 text-gray-700 border-gray-200";
          return (
            <div key={c.id} className={`rounded-2xl border p-4 text-center ${color}`}>
              <span className="text-sm font-bold">{c.groupName}</span>
              <p className="text-2xl font-bold mt-1">${myLimit}</p>
              <p className="text-xs opacity-80">per lot (your limit)</p>
              <p className="text-[10px] opacity-60 mt-1">Group ceiling: ${c.ceilingPerLot}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Set Commission Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-500" />Set Commission
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub IB <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none appearance-none bg-white">
                  <option value="">Select sub-IB...</option>
                  {subIBs.filter((s) => s.isIB).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none appearance-none bg-white">
                  <option value="">Select group...</option>
                  {ceilings.map((c) => (
                    <option key={c.id} value={c.groupName}>{c.groupName} (Max: ${getMyLimit(c.groupName)}/lot)</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission ($/lot) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
                max={selectedGroup ? getMyLimit(selectedGroup) : undefined}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="Enter $ per lot" />
              {selectedGroup && (
                <p className="text-xs text-gray-400 mt-1">Your limit: ${getMyLimit(selectedGroup)}/lot</p>
              )}
            </div>
            <button type="submit" disabled={saving}
              className="w-full px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save Commission"}
            </button>
          </form>
        </div>

        {/* Assignments Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Commission Given List</h3>
          </div>
          {childAssignments.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400">No commissions assigned to sub-IBs yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sub IB</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Commission</th>
                </tr></thead>
                <tbody>
                  {childAssignments.map((a) => {
                    const child = subIBs.find((s) => s.id === a.childIBId);
                    const color = GROUP_COLORS[a.groupName] || "bg-gray-100 text-gray-700";
                    return (
                      <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{child?.name || "Unknown"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{a.groupName}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium">${a.valuePerLot}/lot</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sub IBs with quick-set commission per group */}
      {subIBs.filter((s) => s.isIB).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" />Sub IBs - Quick Commission Setup
          </h3>
          <div className="space-y-4">
            {subIBs.filter((s) => s.isIB).map((s) => (
              <div key={s.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ceilings.map((c) => {
                    const currentVal = getChildValue(s.id, c.groupName);
                    const key = `${s.id}-${c.groupName}`;
                    const color = GROUP_COLORS[c.groupName] || "bg-gray-100 text-gray-700 border-gray-200";
                    return (
                      <div key={c.id} className={`rounded-lg border p-3 ${color}`}>
                        <p className="text-xs font-bold mb-1">{c.groupName}</p>
                        {currentVal !== undefined ? (
                          <p className="text-lg font-bold">${currentVal}</p>
                        ) : (
                          <p className="text-lg font-bold text-gray-400">--</p>
                        )}
                        <div className="flex gap-1 mt-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={getMyLimit(c.groupName)}
                            value={quickValues[key] || ""}
                            onChange={(e) => setQuickValues({ ...quickValues, [key]: e.target.value })}
                            placeholder="$"
                            className="w-full px-2 py-1 text-xs border border-current/20 rounded bg-white/80 focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              if (quickValues[key]) {
                                quickSet(s.id, c.groupName, quickValues[key]);
                                setQuickValues({ ...quickValues, [key]: "" });
                              }
                            }}
                            disabled={!quickValues[key]}
                            className="px-2 py-1 bg-white/80 rounded text-xs font-medium hover:bg-white disabled:opacity-30"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
