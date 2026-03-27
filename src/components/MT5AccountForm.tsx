"use client";

import { useState, useEffect } from "react";

interface MT5Group {
  name: string;
  description?: string;
}

interface MT5AccountFormProps {
  userId?: string;
  onSuccess?: () => void;
}

export default function MT5AccountForm({ userId, onSuccess }: MT5AccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [groups, setGroups] = useState<MT5Group[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; mt5Account: string | null }[]>([]);

  const [form, setForm] = useState({
    userId: userId || "",
    group: "",
    leverage: "1:200",
    password: "",
  });

  useEffect(() => {
    fetchGroups();
    if (!userId) fetchUsers();
  }, [userId]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/mt5/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
        if (data.length > 0 && !form.group) {
          setForm((prev) => ({ ...prev, group: data[0].name }));
        }
      }
    } catch {
      console.error("Failed to fetch groups");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?noMT5=true");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter((u: { mt5Account: string | null }) => !u.mt5Account));
      }
    } catch {
      console.error("Failed to fetch users");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!form.userId) {
      setError("Please select a user");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/mt5/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create MT5 account");
        return;
      }

      setSuccess(`MT5 account ${data.mt5Login} created successfully!`);
      onSuccess?.();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 animate-fade-in-up max-w-3xl">
      {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100 animate-scale-in">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100 animate-scale-in">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!userId && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User *</label>
            <select
              required
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
            >
              <option value="">-- Select a user --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trading Group *</label>
          <select
            required
            value={form.group}
            onChange={(e) => setForm({ ...form, group: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
          >
            {groups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
            {groups.length === 0 && <option value="">Loading groups...</option>}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leverage *</label>
          <select
            required
            value={form.leverage}
            onChange={(e) => setForm({ ...form, leverage: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
          >
            <option value="1:50">1:50</option>
            <option value="1:100">1:100</option>
            <option value="1:200">1:200</option>
            <option value="1:500">1:500</option>
            <option value="1:1000">1:1000</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">MT5 Password *</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
            placeholder="Set a trading password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating MT5 Account..." : "Create MT5 Account"}
      </button>
    </form>
  );
}
