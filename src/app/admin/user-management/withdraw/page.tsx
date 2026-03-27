"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { ArrowUpFromLine } from "lucide-react";

interface User { id: string; name: string; email: string; mt5Account: string | null; }

export default function WithdrawPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ userId: "", amount: "", comment: "" });

  useEffect(() => {
    fetch("/api/users").then(r => r.ok ? r.json() : []).then(data => {
      setUsers(data.filter((u: User) => u.mt5Account));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.userId) { setError("Please select a user"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Please enter a valid amount"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/mt5/withdraw", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: form.userId, amount: parseFloat(form.amount), comment: form.comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to process withdrawal"); return; }
      setSuccess(`Withdrawal of $${form.amount} processed successfully!`);
      setForm({ userId: "", amount: "", comment: "" });
    } catch { setError("An error occurred"); } finally { setLoading(false); }
  };

  return (
    <PageShell title="Withdraw" description="Process withdrawals from MT5 accounts" icon={ArrowUpFromLine}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD) *</label>
            <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <input type="text" value={form.comment} onChange={e => setForm({...form, comment: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all" placeholder="Withdrawal comment (optional)" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">{loading ? "Processing..." : "Process Withdrawal"}</button>
        </form>
      </div>
    </PageShell>
  );
}
