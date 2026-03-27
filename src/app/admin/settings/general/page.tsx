"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Settings } from "lucide-react";

export default function GeneralSettingsPage() {
  const [form, setForm] = useState({ companyName: "Liberty Markets", supportEmail: "support@libertymarkets.com", phone: "", currency: "USD" });
  const [toggles, setToggles] = useState({ enableRegistration: true, emailVerification: true, mt5AutoCreate: false, twoFactor: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : [])
      .then((settings: any[]) => {
        const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
        if (map.companyName) setForm((f) => ({ ...f, companyName: map.companyName }));
        if (map.supportEmail) setForm((f) => ({ ...f, supportEmail: map.supportEmail }));
        if (map.phone) setForm((f) => ({ ...f, phone: map.phone }));
        if (map.currency) setForm((f) => ({ ...f, currency: map.currency }));
        if (map.enableRegistration !== undefined) setToggles((t) => ({ ...t, enableRegistration: map.enableRegistration === "true" }));
        if (map.emailVerification !== undefined) setToggles((t) => ({ ...t, emailVerification: map.emailVerification === "true" }));
        if (map.mt5AutoCreate !== undefined) setToggles((t) => ({ ...t, mt5AutoCreate: map.mt5AutoCreate === "true" }));
        if (map.twoFactor !== undefined) setToggles((t) => ({ ...t, twoFactor: map.twoFactor === "true" }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSuccess("");
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [
            ...Object.entries(form).map(([key, value]) => ({ key, value, group: "general" })),
            ...Object.entries(toggles).map(([key, value]) => ({ key, value: String(value), group: "general" })),
          ],
        }),
      });
      setSuccess("Settings saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {} finally { setSaving(false); }
  };

  if (loading) return <PageShell title="General Settings" description="System configuration" icon={Settings}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="General Settings" description="System configuration" icon={Settings}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-3xl animate-fade-in-up">
        {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm mb-4 border border-emerald-100">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label><input type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" placeholder="+1 234 567 890" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div>
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">System Settings</h3>
            <div className="space-y-3">
              {([["enableRegistration", "Enable new registrations"], ["emailVerification", "Require email verification"], ["mt5AutoCreate", "Enable MT5 auto-creation"], ["twoFactor", "Enable two-factor authentication"]] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                  <span className="text-sm text-gray-700">{label}</span>
                  <div className="relative inline-flex items-center">
                    <input type="checkbox" checked={toggles[key]} onChange={() => setToggles({ ...toggles, [key]: !toggles[key] })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-sky-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save Settings"}</button>
        </form>
      </div>
    </PageShell>
  );
}
