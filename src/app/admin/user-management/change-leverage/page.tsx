"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Sliders } from "lucide-react";

interface User { id: string; name: string; email: string; mt5Account: string | null; leverage: string | null; }

export default function ChangeLeveragePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ userId: "", leverage: "1:200" });

  useEffect(() => {
    fetch("/api/users").then(r => r.ok ? r.json() : []).then(data => {
      setUsers(data.filter((u: User) => u.mt5Account));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.userId) { setError("Please select a user"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/mt5/change-leverage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to change leverage"); return; }
      setSuccess("Leverage changed successfully!");
    } catch { setError("An error occurred"); } finally { setLoading(false); }
  };

  return (
    <PageShell title="Change Leverage" description="Modify MT5 account leverage" icon={Sliders}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100">{success}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User *</label>
            <select required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all">
              <option value="">-- Select a user --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email}) - MT5: {u.mt5Account} - Current: {u.leverage || "N/A"}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Leverage *</label>
            <select required value={form.leverage} onChange={e => setForm({...form, leverage: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all">
              <option value="1:50">1:50</option>
              <option value="1:100">1:100</option>
              <option value="1:200">1:200</option>
              <option value="1:500">1:500</option>
              <option value="1:1000">1:1000</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">{loading ? "Changing..." : "Change Leverage"}</button>
        </form>
      </div>
    </PageShell>
  );
}
