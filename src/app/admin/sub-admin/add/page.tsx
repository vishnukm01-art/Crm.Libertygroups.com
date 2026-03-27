"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { UserPlus } from "lucide-react";

const allPermissions = ["User Management", "Transaction Management", "IB Management", "Report Access", "Settings Access", "Ticket Management", "Marketing", "Bonus Management"];

export default function AddAdminPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const togglePerm = (perm: string) => {
    setPermissions((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) { setError("All fields are required"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/sub-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, permissions }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create admin"); return; }
      router.push("/admin/sub-admin/list");
    } catch { setError("An error occurred"); } finally { setLoading(false); }
  };

  return (
    <PageShell title="Add Admin" description="Create a new sub-admin account" icon={UserPlus}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" placeholder="Enter name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" placeholder="admin@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" placeholder="Password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <input type="password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" placeholder="Confirm password" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {allPermissions.map((perm) => (
                <label key={perm} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-all ${permissions.includes(perm) ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-sky-50 hover:border-sky-100"}`}>
                  <input type="checkbox" checked={permissions.includes(perm)} onChange={() => togglePerm(perm)} className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">{loading ? "Creating..." : "Create Admin"}</button>
        </form>
      </div>
    </PageShell>
  );
}
