"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { Settings, Save, ArrowLeft } from "lucide-react";

function UserSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("user") || "";
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [settings, setSettings] = useState({
    disableAccount: "No",
    disableDeposit: "No",
    disableWithdraw: "No",
    disableTransfer: "No",
    disableIBWithdraw: "No",
    disableMT5ToWallet: "No",
    disableWalletToMT5: "No",
  });

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const user = await res.json();
          setUserName(user.name || user.email);
          setSettings({
            disableAccount: user.disableAccount ? "Yes" : "No",
            disableDeposit: user.disableDeposit ? "Yes" : "No",
            disableWithdraw: user.disableWithdraw ? "Yes" : "No",
            disableTransfer: user.disableTransfer ? "Yes" : "No",
            disableIBWithdraw: user.disableIBWithdraw ? "Yes" : "No",
            disableMT5ToWallet: user.disableMT5ToWallet ? "Yes" : "No",
            disableWalletToMT5: user.disableWalletToMT5 ? "Yes" : "No",
          });
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disableAccount: settings.disableAccount === "Yes",
          disableDeposit: settings.disableDeposit === "Yes",
          disableWithdraw: settings.disableWithdraw === "Yes",
          disableTransfer: settings.disableTransfer === "Yes",
          disableIBWithdraw: settings.disableIBWithdraw === "Yes",
          disableMT5ToWallet: settings.disableMT5ToWallet === "Yes",
          disableWalletToMT5: settings.disableWalletToMT5 === "Yes",
        }),
      });
      if (res.ok) setSuccess("User settings updated successfully!");
      else { const d = await res.json(); setError(d.error || "Failed to update"); }
    } catch { setError("An error occurred"); }
    finally { setSaving(false); }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: prev[key] === "Yes" ? "No" : "Yes" }));
  };

  return (
    <>
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">{success}</div>}
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl space-y-5">
          {[
            { key: "disableAccount" as const, label: "Account" },
            { key: "disableDeposit" as const, label: "Deposit" },
            { key: "disableWithdraw" as const, label: "Withdraw" },
            { key: "disableTransfer" as const, label: "Transfer" },
            { key: "disableIBWithdraw" as const, label: "IB Withdraw" },
            { key: "disableMT5ToWallet" as const, label: "MT5 To Wallet" },
            { key: "disableWalletToMT5" as const, label: "Wallet To MT5" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="text-sm font-medium text-gray-700">{item.label}</label>
              <select value={settings[item.key]} onChange={() => toggleSetting(item.key)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-sky-300 focus:outline-none w-24">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Submit"}
          </button>
        </form>
      )}
    </>
  );
}

export default function UserSettingsPage() {
  return (
    <PageShell title="Change User Setting" description="Manage user feature access" icon={Settings}>
      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>}>
        <UserSettingsContent />
      </Suspense>
    </PageShell>
  );
}
