"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Building, CheckCircle } from "lucide-react";

export default function DepositBankDetailsPage() {
  const [form, setForm] = useState({ accountName: "", accountNo: "", bankName: "", ifscCode: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : [])
      .then((settings: any[]) => {
        const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
        setForm({
          accountName: map.depositAccountName || "",
          accountNo: map.depositAccountNo || "",
          bankName: map.depositBankName || "",
          ifscCode: map.depositIfscCode || "",
        });
        const saved = settings.filter((s) => s.group === "deposit_banks");
        if (saved.length > 0) {
          try { setBanks(JSON.parse(saved[0].value)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountName || !form.accountNo || !form.bankName || !form.ifscCode) return;
    setSaving(true); setSuccess("");
    try {
      const newBank = { ...form, id: Date.now().toString() };
      const updatedBanks = [...banks, newBank];
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [
            { key: "depositAccountName", value: form.accountName, group: "deposit_bank" },
            { key: "depositAccountNo", value: form.accountNo, group: "deposit_bank" },
            { key: "depositBankName", value: form.bankName, group: "deposit_bank" },
            { key: "depositIfscCode", value: form.ifscCode, group: "deposit_bank" },
            { key: "deposit_banks_list", value: JSON.stringify(updatedBanks), group: "deposit_banks" },
          ],
        }),
      });
      setBanks(updatedBanks);
      setSuccess("Bank details saved successfully!");
      setForm({ accountName: "", accountNo: "", bankName: "", ifscCode: "" });
      setTimeout(() => setSuccess(""), 3000);
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const updatedBanks = banks.filter((b) => b.id !== id);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: [{ key: "deposit_banks_list", value: JSON.stringify(updatedBanks), group: "deposit_banks" }] }),
    });
    setBanks(updatedBanks);
  };

  if (loading) return <PageShell title="Deposit Bank Details" description="Manage deposit bank accounts" icon={Building}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Deposit Bank Details" description="Manage deposit bank accounts" icon={Building}>
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4" />{success}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Add Bank Account</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
              <input type="text" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Enter account name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account No. *</label>
              <input type="text" value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Enter account number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
              <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Enter bank name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code *</label>
              <input type="text" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Enter IFSC code" />
            </div>
            <button type="submit" disabled={saving} className="w-full px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-medium text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Submit"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Saved Bank Accounts</h3>
          </div>
          {banks.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No bank accounts added yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {banks.map((bank) => (
                <div key={bank.id} className="p-4 hover:bg-gray-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{bank.accountName}</p>
                      <p className="text-sm text-gray-500 mt-1">A/C: {bank.accountNo}</p>
                      <p className="text-sm text-gray-500">{bank.bankName} | IFSC: {bank.ifscCode}</p>
                    </div>
                    <button onClick={() => handleDelete(bank.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
