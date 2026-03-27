"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Settings, CheckCircle } from "lucide-react";

const featureToggles = [
  { key: "disableAccount", label: "Disable Account" },
  { key: "disableDeposit", label: "Deposit" },
  { key: "disableWithdraw", label: "Withdraw" },
  { key: "disableTransfer", label: "Transfer" },
  { key: "disableIBWithdraw", label: "IB Withdraw" },
  { key: "disableMT5ToWallet", label: "MT5 To Wallet" },
  { key: "disableWalletToMT5", label: "Wallet To MT5" },
  { key: "disableIBToSubclientMT5", label: "IB To Subclient MT5" },
];

export default function DefaultSettingPage() {
  const [toggles, setToggles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : [])
      .then((settings: any[]) => {
        const map: Record<string, string> = {};
        featureToggles.forEach((ft) => {
          const s = settings.find((s) => s.key === ft.key);
          map[ft.key] = s?.value || "no";
        });
        setToggles(map);
      })
      .catch(() => {
        const map: Record<string, string> = {};
        featureToggles.forEach((ft) => { map[ft.key] = "no"; });
        setToggles(map);
      })
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
          settings: featureToggles.map((ft) => ({ key: ft.key, value: toggles[ft.key] || "no", group: "default_settings" })),
        }),
      });
      setSuccess("Default settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {} finally { setSaving(false); }
  };

  if (loading) return <PageShell title="Default Setting" description="Platform default feature toggles" icon={Settings}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Default Setting" description="Platform default feature toggles" icon={Settings}>
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4" />{success}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {featureToggles.map((ft) => (
            <div key={ft.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="text-sm font-medium text-gray-700">{ft.label}</label>
              <select
                value={toggles[ft.key] || "no"}
                onChange={(e) => setToggles({ ...toggles, [ft.key]: e.target.value })}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none bg-white min-w-[100px]"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          ))}
          <button type="submit" disabled={saving} className="mt-4 px-6 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-medium text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Submit"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
