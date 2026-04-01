"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Settings, Search, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";

interface IBUser { id: string; name: string; email: string; }
interface Group { id: string; name: string; }
interface Commission { id: string; ibUserId: string; name: string; email: string; groupName: string; value: number; commissionType: string; }
interface GroupCeiling { id: string; groupName: string; ceilingPerLot: number; description: string | null; }

const GROUP_PRESETS = [
  { name: "Smart", ceiling: 7, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { name: "Elite", ceiling: 14, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "Prime", ceiling: 21, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { name: "Royal", ceiling: 30, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export default function SetIBCommissionPage() {
  const [ibUsers, setIbUsers] = useState<IBUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [ceilings, setCeilings] = useState<GroupCeiling[]>([]);
  const [loading, setLoading] = useState(true);

  // Default group form
  const [defaultIb, setDefaultIb] = useState("");
  const [defaultSearch, setDefaultSearch] = useState("");
  const [showDefaultDropdown, setShowDefaultDropdown] = useState(false);

  // Other group form
  const [otherIb, setOtherIb] = useState("");
  const [otherSearch, setOtherSearch] = useState("");
  const [showOtherDropdown, setShowOtherDropdown] = useState(false);
  const [otherGroup, setOtherGroup] = useState("");
  const [otherCommission, setOtherCommission] = useState("");

  // Ceiling form
  const [ceilingGroup, setCeilingGroup] = useState("");
  const [ceilingValue, setCeilingValue] = useState("");

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState("");
  const [editValue, setEditValue] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [ib, comm, grp, ceil] = await Promise.all([
        fetch("/api/ib/users").then((r) => r.ok ? r.json() : []),
        fetch("/api/ib/commission").then((r) => r.ok ? r.json() : []),
        fetch("/api/admin/groups?managedOnly=true").then((r) => r.ok ? r.json() : []),
        fetch("/api/admin/group-ceilings").then((r) => r.ok ? r.json() : []),
      ]);
      setIbUsers(ib.map((u: IBUser) => ({ id: u.id, name: u.name, email: u.email })));
      setCommissions(comm);
      setGroups(grp.filter((g: { isActive: boolean }) => g.isActive).map((g: { name: string; description?: string }) => ({ id: g.name, name: g.name })));
      setCeilings(ceil);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredDefault = ibUsers.filter((u) => u.name.toLowerCase().includes(defaultSearch.toLowerCase()) || u.email.toLowerCase().includes(defaultSearch.toLowerCase()));
  const filteredOther = ibUsers.filter((u) => u.name.toLowerCase().includes(otherSearch.toLowerCase()) || u.email.toLowerCase().includes(otherSearch.toLowerCase()));

  const showMsg = (msg: string) => { setMessage(msg); setError(""); setTimeout(() => setMessage(""), 3000); };
  const showErr = (msg: string) => { setError(msg); setMessage(""); setTimeout(() => setError(""), 5000); };

  // Save ceiling preset
  const saveCeiling = async (groupName: string, ceiling: number) => {
    const res = await fetch("/api/admin/group-ceilings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupName, ceilingPerLot: ceiling }),
    });
    if (res.ok) { showMsg(`${groupName} ceiling set to $${ceiling}/lot`); fetchData(); }
    else showErr("Failed to set ceiling");
  };

  const saveCustomCeiling = async () => {
    if (!ceilingGroup || !ceilingValue) return;
    await saveCeiling(ceilingGroup, parseFloat(ceilingValue));
    setCeilingGroup(""); setCeilingValue("");
  };

  const deleteCeiling = async (id: string) => {
    const res = await fetch("/api/admin/group-ceilings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { showMsg("Ceiling removed"); fetchData(); }
  };

  const submitDefault = async () => {
    if (!defaultIb) return;
    // Set default commission for all configured group ceilings
    if (ceilings.length === 0) {
      showErr("Please configure group ceilings first");
      return;
    }
    for (const ceiling of ceilings) {
      await fetch("/api/ib/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ibUserId: defaultIb,
          groupName: ceiling.groupName,
          commissionType: "per_lot",
          value: ceiling.ceilingPerLot,
          level: 1,
        }),
      });
    }
    showMsg("Default commission set for all groups");
    setDefaultIb(""); setDefaultSearch("");
    fetchData();
  };

  const submitOther = async () => {
    if (!otherIb || !otherGroup || !otherCommission) return;
    const value = parseFloat(otherCommission);
    // Validate against ceiling
    const ceiling = ceilings.find((c) => c.groupName === otherGroup);
    if (ceiling && value > ceiling.ceilingPerLot) {
      showErr(`Commission $${value} exceeds ${otherGroup} ceiling of $${ceiling.ceilingPerLot}/lot`);
      return;
    }
    const res = await fetch("/api/ib/commission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ibUserId: otherIb, groupName: otherGroup, commissionType: "per_lot", value, level: 1 }),
    });
    if (res.ok) {
      showMsg("Commission set");
      setOtherIb(""); setOtherSearch(""); setOtherGroup(""); setOtherCommission("");
      fetchData();
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    const value = parseFloat(editValue);
    const ceiling = ceilings.find((c) => c.groupName === editGroup);
    if (ceiling && value > ceiling.ceilingPerLot) {
      showErr(`Commission $${value} exceeds ${editGroup} ceiling of $${ceiling.ceilingPerLot}/lot`);
      return;
    }
    await fetch("/api/ib/commission", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, groupName: editGroup, value }) });
    setEditId(null);
    showMsg("Commission updated");
    fetchData();
  };

  const selectedDefaultName = ibUsers.find((u) => u.id === defaultIb);
  const selectedOtherName = ibUsers.find((u) => u.id === otherIb);

  const getCeilingColor = (groupName: string) => {
    const preset = GROUP_PRESETS.find((p) => p.name.toLowerCase() === groupName.toLowerCase());
    return preset?.color || "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (loading) return (
    <PageShell title="Set up IB Commission" description="Configure IB commission structure" icon={Settings}>
      <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
    </PageShell>
  );

  return (
    <PageShell title="Set up IB Commission" description="Configure IB commission structure with MT5 group ceilings" icon={Settings}>
      {message && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-100 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {/* Edit Form */}
      {editId && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-fade-in-up">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit IB Commission</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select IB <span className="text-red-500">*</span></label>
              <input disabled value={commissions.find((c) => c.id === editId)?.name || ""} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type(Group) <span className="text-red-500">*</span></label>
              <input value={editGroup} onChange={(e) => setEditGroup(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission <span className="text-red-500">*</span></label>
              <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={submitEdit} className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors">Submit</button>
            <button onClick={() => setEditId(null)} className="px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Section 0: Group Commission Ceilings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-fade-in-up">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Group Commission Ceilings</h3>
        <p className="text-sm text-gray-500 mb-4">Define maximum commission per lot for each MT5 group. No IB can receive more than the ceiling for their client&apos;s group.</p>

        {/* Preset buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {GROUP_PRESETS.map((preset) => {
            const existing = ceilings.find((c) => c.groupName === preset.name);
            return (
              <div key={preset.name} className={`rounded-xl border p-4 text-center ${preset.color}`}>
                <span className="text-sm font-bold">{preset.name}</span>
                <p className="text-2xl font-bold mt-1">${existing?.ceilingPerLot ?? preset.ceiling}</p>
                <p className="text-xs opacity-80">per lot</p>
                {!existing ? (
                  <button onClick={() => saveCeiling(preset.name, preset.ceiling)}
                    className="mt-2 px-3 py-1 bg-white/80 rounded-lg text-xs font-medium hover:bg-white transition-colors">
                    <Plus className="w-3 h-3 inline mr-1" />Activate
                  </button>
                ) : (
                  <button onClick={() => deleteCeiling(existing.id)}
                    className="mt-2 px-3 py-1 bg-white/80 rounded-lg text-xs font-medium hover:bg-white transition-colors text-red-600">
                    <Trash2 className="w-3 h-3 inline mr-1" />Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom ceiling form */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Group Name</label>
            <input value={ceilingGroup} onChange={(e) => setCeilingGroup(e.target.value)} placeholder="e.g., Platinum" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ceiling ($/lot)</label>
            <input type="number" step="0.01" min="0" value={ceilingValue} onChange={(e) => setCeilingValue(e.target.value)} placeholder="e.g., 50" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none" />
          </div>
          <button onClick={saveCustomCeiling} disabled={!ceilingGroup || !ceilingValue}
            className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 whitespace-nowrap">
            Add Ceiling
          </button>
        </div>

        {/* Active ceilings table */}
        {ceilings.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Group</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Ceiling ($/lot)</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr></thead>
              <tbody>
                {ceilings.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="px-4 py-2"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getCeilingColor(c.groupName)}`}>{c.groupName}</span></td>
                    <td className="px-4 py-2 font-medium text-gray-900">${c.ceilingPerLot}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => deleteCeiling(c.id)} className="text-red-500 hover:text-red-600 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 1: Default Group */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-fade-in-up">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up IB Commission to Default Group</h3>
        <p className="text-sm text-gray-500 mb-4">Any Master IB directly under Admin will be assigned default Commission structure (all group ceilings at maximum).</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select IB <span className="text-red-500">*</span></label>
          <div className="relative">
            <div onClick={() => setShowDefaultDropdown(!showDefaultDropdown)} className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-2.5 text-sm cursor-pointer bg-white hover:border-sky-300">
              {selectedDefaultName ? `${selectedDefaultName.name} (${selectedDefaultName.email})` : "Please Choose..."}
            </div>
            {showDefaultDropdown && (
              <div className="absolute z-10 w-full max-w-md mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                <input autoFocus value={defaultSearch} onChange={(e) => setDefaultSearch(e.target.value)} placeholder="Search..." className="w-full px-4 py-2.5 border-b border-gray-200 text-sm focus:outline-none" />
                {filteredDefault.map((u) => (
                  <div key={u.id} onClick={() => { setDefaultIb(u.id); setShowDefaultDropdown(false); setDefaultSearch(""); }}
                    className="px-4 py-2 text-sm hover:bg-sky-50 cursor-pointer">{u.name} ({u.email})</div>
                ))}
              </div>
            )}
          </div>
        </div>
        {ceilings.length > 0 && defaultIb && (
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ceilings.map((c) => (
              <div key={c.id} className={`rounded-lg border p-2 text-center text-xs ${getCeilingColor(c.groupName)}`}>
                <span className="font-bold">{c.groupName}</span>: ${c.ceilingPerLot}/lot
              </div>
            ))}
          </div>
        )}
        <button onClick={submitDefault} disabled={!defaultIb} className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50">Submit</button>
      </div>

      {/* Section 2: Other Group */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-fade-in-up">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up IB Commission to Other Group</h3>
        <p className="text-sm text-gray-500 mb-4">Must have option to set up IB Commission manually by Admin.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select IB <span className="text-red-500">*</span></label>
            <div className="relative">
              <div onClick={() => setShowOtherDropdown(!showOtherDropdown)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm cursor-pointer bg-white hover:border-sky-300">
                {selectedOtherName ? `${selectedOtherName.name} (${selectedOtherName.email})` : "Please Choose..."}
              </div>
              {showOtherDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  <input autoFocus value={otherSearch} onChange={(e) => setOtherSearch(e.target.value)} placeholder="Search..." className="w-full px-4 py-2.5 border-b border-gray-200 text-sm focus:outline-none" />
                  {filteredOther.map((u) => (
                    <div key={u.id} onClick={() => { setOtherIb(u.id); setShowOtherDropdown(false); setOtherSearch(""); }}
                      className="px-4 py-2 text-sm hover:bg-sky-50 cursor-pointer">{u.name} ({u.email})</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Group <span className="text-red-500">*</span></label>
            <select value={otherGroup} onChange={(e) => setOtherGroup(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none bg-white">
              <option value="">Please Choose...</option>
              {ceilings.map((c) => <option key={c.id} value={c.groupName}>{c.groupName} (Max: ${c.ceilingPerLot}/lot)</option>)}
              {groups.filter((g) => !ceilings.find((c) => c.groupName === g.name)).map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission ($/lot) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" min="0" value={otherCommission} onChange={(e) => setOtherCommission(e.target.value)} placeholder="Enter commission"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none" />
            {otherGroup && ceilings.find((c) => c.groupName === otherGroup) && (
              <p className="text-xs text-gray-400 mt-1">Ceiling: ${ceilings.find((c) => c.groupName === otherGroup)?.ceilingPerLot}/lot</p>
            )}
          </div>
        </div>
        <button onClick={submitOther} disabled={!otherIb || !otherGroup || !otherCommission} className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50">Submit</button>
      </div>

      {/* Section 3: Commission Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">Commission Settings</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {["Sr No.", "Name", "Email", "Group", "Commission", "Action"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {commissions.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No commission settings</td></tr> :
               commissions.map((c, i) => (
                <tr key={c.id} className="table-row-hover border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getCeilingColor(c.groupName)}`}>{c.groupName}</span></td>
                  <td className="px-4 py-3 text-gray-700 font-medium">${c.value}/lot</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditId(c.id); setEditGroup(c.groupName); setEditValue(String(c.value)); }}
                      className="px-3 py-1 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-colors">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
