"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Server } from "lucide-react";

export default function PlatformSettingsPage() {
  const [form, setForm] = useState({ mt5Host: "", mt5Port: "443", mt5Login: "", mt5Mode: "mock", defaultLeverage: "1:100", defaultGroup: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [mt5Status, setMt5Status] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.ok ? r.json() : []),
      fetch("/api/mt5/status").then((r) => r.ok ? r.json() : null),
    ]).then(([settings, status]) => {
      const map = Object.fromEntries((settings as any[]).map((s: any) => [s.key, s.value]));
      setForm({
        mt5Host: map.mt5Host || "",
        mt5Port: map.mt5Port || "443",
        mt5Login: map.mt5Login || "",
        mt5Mode: map.mt5Mode || "mock",
        defaultLeverage: map.defaultLeverage || "1:100",
        defaultGroup: map.defaultGroup || "",
      });
      setMt5Status(status);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSuccess("");
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: Object.entries(form).map(([key, value]) => ({ key, value, group: "platform" })) }),
      });
      setSuccess("Configuration saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {} finally { setSaving(false); }
  };

  if (loading) return <PageShell title="Platform Config" description="MT5 and platform configuration" icon={Server}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Platform Config" description="MT5 and platform configuration" icon={Server}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-3xl animate-fade-in-up">
        {mt5Status && (
          <div className={`mb-6 p-4 rounded-xl border ${mt5Status.connected ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
            <p className="text-sm font-medium">{mt5Status.connected ? "MT5 Connected" : "MT5 Not Connected"}</p>
            <p className="text-xs text-gray-500 mt-1">Mode: {mt5Status.mode} | Session: {mt5Status.sessionActive ? "Active" : "Inactive"}{mt5Status.lastError ? ` | Error: ${mt5Status.lastError}` : ""}</p>
          </div>
        )}
        {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm mb-4 border border-emerald-100">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">MT5 Server Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server Host</label>
                <input type="text" value={form.mt5Host} onChange={(e) => setForm({ ...form, mt5Host: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" placeholder="mt5.example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server Port</label>
                <input type="number" value={form.mt5Port} onChange={(e) => setForm({ ...form, mt5Port: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager Login</label>
                <input type="text" value={form.mt5Login} onChange={(e) => setForm({ ...form, mt5Login: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Mode</label>
                <select value={form.mt5Mode} onChange={(e) => setForm({ ...form, mt5Mode: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all">
                  <option value="mock">Mock (Development)</option>
                  <option value="live">Live (Production)</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Default Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Leverage</label>
                <select value={form.defaultLeverage} onChange={(e) => setForm({ ...form, defaultLeverage: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all">
                  <option value="1:100">1:100</option>
                  <option value="1:200">1:200</option>
                  <option value="1:500">1:500</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Group</label>
                <input type="text" value={form.defaultGroup} onChange={(e) => setForm({ ...form, defaultGroup: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" placeholder="demo\\group" />
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save Configuration"}</button>
        </form>
      </div>
    </PageShell>
  );
}
