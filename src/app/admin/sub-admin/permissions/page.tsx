"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Lock } from "lucide-react";

interface SubAdmin { id: string; name: string; email: string; permissions: string[]; isActive: boolean; }

const modules = [
  { name: "Dashboard", permissions: ["View"] },
  { name: "User Management", permissions: ["View", "Create", "Edit", "Delete"] },
  { name: "Transaction", permissions: ["View", "Approve", "Reject"] },
  { name: "IB Management", permissions: ["View", "Create", "Edit", "Delete"] },
  { name: "Bonus", permissions: ["View", "Create", "Edit"] },
  { name: "Reports", permissions: ["View", "Export"] },
  { name: "Settings", permissions: ["View", "Edit"] },
  { name: "Sub Admin", permissions: ["View", "Create", "Edit", "Delete"] },
];

const allPerms = ["View", "Create", "Edit", "Delete", "Approve"];

export default function PermissionsPage() {
  const [admins, setAdmins] = useState<SubAdmin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [permState, setPermState] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sub-admin").then((r) => r.ok ? r.json() : []).then((data) => {
      setAdmins(data);
      if (data.length > 0) {
        setSelectedAdmin(data[0].id);
        initPerms(data[0].permissions);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const initPerms = (perms: string[]) => {
    const state: Record<string, boolean> = {};
    modules.forEach((mod) => allPerms.forEach((perm) => {
      state[`${mod.name}:${perm}`] = perms.includes(`${mod.name}:${perm}`);
    }));
    setPermState(state);
  };

  const handleAdminChange = (id: string) => {
    setSelectedAdmin(id);
    const admin = admins.find((a) => a.id === id);
    if (admin) initPerms(admin.permissions);
  };

  const togglePerm = (key: string) => {
    setPermState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!selectedAdmin) return;
    setSaving(true); setSuccess("");
    const perms = Object.entries(permState).filter(([, v]) => v).map(([k]) => k);
    try {
      await fetch("/api/sub-admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedAdmin, permissions: perms }) });
      setSuccess("Permissions saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {} finally { setSaving(false); }
  };

  if (loading) return <PageShell title="Permissions" description="Configure role-based access control" icon={Lock}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Permissions" description="Configure role-based access control" icon={Lock}>
      {admins.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Admin</label>
          <select value={selectedAdmin} onChange={(e) => handleAdminChange(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100">
            {admins.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
          </select>
        </div>
      )}
      {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm mb-4 border border-emerald-100">{success}</div>}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                {allPerms.map((perm) => (
                  <th key={perm} className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{perm}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod.name} className="table-row-hover border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{mod.name}</td>
                  {allPerms.map((perm) => {
                    const key = `${mod.name}:${perm}`;
                    const available = mod.permissions.includes(perm);
                    return (
                      <td key={perm} className="px-4 py-3 text-center">
                        <input type="checkbox" checked={!!permState[key]} onChange={() => togglePerm(key)} disabled={!available} className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-30" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !selectedAdmin} className="btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save Permissions"}</button>
        </div>
      </div>
    </PageShell>
  );
}
