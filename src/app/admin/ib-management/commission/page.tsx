"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Settings, Search } from "lucide-react";

interface IBUser { id: string; name: string; email: string; }
interface Group { id: string; name: string; }
interface Commission { id: string; ibUserId: string; name: string; email: string; groupName: string; value: number; commissionType: string; }

export default function SetIBCommissionPage() {
  const [ibUsers, setIbUsers] = useState<IBUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
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

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState("");
  const [editValue, setEditValue] = useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/ib/users").then((r) => r.ok ? r.json() : []),
      fetch("/api/ib/commission").then((r) => r.ok ? r.json() : []),
      fetch("/api/mt5/groups").then((r) => r.ok ? r.json() : []),
    ]).then(([ib, comm, grp]) => {
      setIbUsers(ib.map((u: IBUser) => ({ id: u.id, name: u.name, email: u.email })));
      setCommissions(comm);
      setGroups(grp.map((g: { name: string }) => ({ id: g.name, name: g.name })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredDefault = ibUsers.filter((u) => u.name.toLowerCase().includes(defaultSearch.toLowerCase()) || u.email.toLowerCase().includes(defaultSearch.toLowerCase()));
  const filteredOther = ibUsers.filter((u) => u.name.toLowerCase().includes(otherSearch.toLowerCase()) || u.email.toLowerCase().includes(otherSearch.toLowerCase()));

  const submitDefault = async () => {
    if (!defaultIb) return;
    const res = await fetch("/api/ib/commission", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ibUserId: defaultIb, commissionType: "per_lot", value: 0, level: 1 }) });
    if (res.ok) { setMessage("Default commission set"); setDefaultIb(""); setDefaultSearch(""); const c = await fetch("/api/ib/commission").then((r) => r.json()); setCommissions(c); }
  };

  const submitOther = async () => {
    if (!otherIb || !otherGroup || !otherCommission) return;
    const res = await fetch("/api/ib/commission", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ibUserId: otherIb, groupName: otherGroup, commissionType: "per_lot", value: parseFloat(otherCommission), level: 1 }) });
    if (res.ok) { setMessage("Commission set"); setOtherIb(""); setOtherSearch(""); setOtherGroup(""); setOtherCommission(""); const c = await fetch("/api/ib/commission").then((r) => r.json()); setCommissions(c); }
  };

  const submitEdit = async () => {
    if (!editId) return;
    await fetch("/api/ib/commission", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, groupName: editGroup, value: parseFloat(editValue) }) });
    setEditId(null);
    const c = await fetch("/api/ib/commission").then((r) => r.json()); setCommissions(c);
    setMessage("Commission updated");
  };

  const selectedDefaultName = ibUsers.find((u) => u.id === defaultIb);
  const selectedOtherName = ibUsers.find((u) => u.id === otherIb);

  return (
    <PageShell title="Set up IB Commission" description="Configure IB commission structure" icon={Settings}>
      {message && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-100">{message}</div>}

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

      {/* Section 1: Default Group */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-fade-in-up">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Set up IB Commission to Default Group</h3>
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
        <button onClick={submitDefault} className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors">Submit</button>
      </div>

      {/* Section 2: Other Group */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-fade-in-up">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Set up IB Commission to Other Group</h3>
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
              {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission <span className="text-red-500">*</span></label>
            <input type="number" value={otherCommission} onChange={(e) => setOtherCommission(e.target.value)} placeholder="Enter commission" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none" />
          </div>
        </div>
        <button onClick={submitOther} className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors">Submit</button>
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
                  <td className="px-4 py-3 text-gray-600">{c.groupName}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{c.value}</td>
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
