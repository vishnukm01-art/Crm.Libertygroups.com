"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { MailCheck } from "lucide-react";

interface User { id: string; name: string; email: string; }

export default function ResendVerificationPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ userId: "" });

  useEffect(() => {
    fetch("/api/users").then(r => r.ok ? r.json() : []).then(data => {
      setUsers(data);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.userId) { setError("Please select a user"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/email/resend-verification", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: form.userId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to resend verification email"); return; }
      setSuccess("Verification email resent successfully!");
      setForm({ userId: "" });
    } catch { setError("An error occurred"); } finally { setLoading(false); }
  };

  return (
    <PageShell title="Resend Verification" description="Resend account verification email to a user" icon={MailCheck}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100">{success}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User *</label>
            <select required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all">
              <option value="">-- Select a user --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {loading ? "Sending..." : "Resend Verification Email"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
