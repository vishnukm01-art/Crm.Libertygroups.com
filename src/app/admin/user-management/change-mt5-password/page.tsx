"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { ShieldCheck } from "lucide-react";

interface User { id: string; name: string; email: string; mt5Account: string | null; }

export default function ChangeMT5PasswordPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ userId: "", type: "main", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    fetch("/api/users?mt5Only=true").then(r => r.ok ? r.json() : []).then(data => {
      setUsers(Array.isArray(data) ? data.filter((u: User) => u.mt5Account) : []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.userId) { setError("Please select a user"); return; }
    if (!form.newPassword) { setError("Please enter a new password"); return; }
    if (form.newPassword !== form.confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/mt5/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: form.userId, newPassword: form.newPassword, type: form.type }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to change MT5 password"); return; }
      setSuccess(`MT5 ${form.type === "main" ? "Main" : "Investor"} password changed successfully!`);
      setForm({ userId: "", type: "main", newPassword: "", confirmPassword: "" });
    } catch { setError("An error occurred"); } finally { setLoading(false); }
  };

  return (
    <PageShell title="Change MT5 Password" description="Change main or investor password for MT5 accounts" icon={ShieldCheck}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100">{success}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User *</label>
            <select required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all">
              <option value="">-- Select a user --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email}) - MT5: {u.mt5Account}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password Type *</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="passwordType" value="main" checked={form.type === "main"}
                  onChange={e => setForm({...form, type: e.target.value})}
                  className="w-4 h-4 text-sky-500 border-gray-300 focus:ring-sky-300" />
                <span className="text-sm text-gray-700">Main Password</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="passwordType" value="investor" checked={form.type === "investor"}
                  onChange={e => setForm({...form, type: e.target.value})}
                  className="w-4 h-4 text-sky-500 border-gray-300 focus:ring-sky-300" />
                <span className="text-sm text-gray-700">Investor Password</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
              <input type="password" required value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all" placeholder="New password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <input type="password" required value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all" placeholder="Confirm password" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {loading ? "Changing..." : "Change MT5 Password"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
