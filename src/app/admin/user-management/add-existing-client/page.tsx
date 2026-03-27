"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { UserPlus2 } from "lucide-react";

interface MT5Group { id: string; name: string; }
interface IBUser { id: string; name: string; email: string; }

export default function AddExistingClientPage() {
  const [mt5Groups, setMt5Groups] = useState<MT5Group[]>([]);
  const [ibUsers, setIbUsers] = useState<IBUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", password: "", mt5Login: "", mt5Group: "", leverage: "1:200", ibId: "",
  });

  useEffect(() => {
    fetch("/api/mt5/groups").then(r => r.ok ? r.json() : []).then(setMt5Groups).catch(() => {});
    fetch("/api/users").then(r => r.ok ? r.json() : []).then(data => {
      setIbUsers(data.filter((u: IBUser & { isIB?: boolean }) => u.isIB));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.name || !form.email || !form.password || !form.mt5Login) { setError("Please fill in all required fields"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          mt5Account: form.mt5Login, mt5Group: form.mt5Group, leverage: form.leverage,
          ...(form.ibId && { ibId: form.ibId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to add client"); return; }
      setSuccess("Client added successfully!");
      setForm({ name: "", email: "", password: "", mt5Login: "", mt5Group: "", leverage: "1:200", ibId: "" });
    } catch { setError("An error occurred"); } finally { setLoading(false); }
  };

  return (
    <PageShell title="Add Existing Client" description="Import a client who already has an MT5 account" icon={UserPlus2}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-3xl animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100">{success}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all" placeholder="Password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MT5 Login *</label>
              <input type="text" required value={form.mt5Login} onChange={e => setForm({...form, mt5Login: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all" placeholder="MT5 login ID" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MT5 Group</label>
              <select value={form.mt5Group} onChange={e => setForm({...form, mt5Group: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all">
                <option value="">-- Select MT5 Group --</option>
                {mt5Groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leverage</label>
              <select value={form.leverage} onChange={e => setForm({...form, leverage: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all">
                <option value="1:50">1:50</option>
                <option value="1:100">1:100</option>
                <option value="1:200">1:200</option>
                <option value="1:500">1:500</option>
                <option value="1:1000">1:1000</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to IB (Optional)</label>
            <select value={form.ibId} onChange={e => setForm({...form, ibId: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all">
              <option value="">-- No IB --</option>
              {ibUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {loading ? "Adding Client..." : "Add Existing Client"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
