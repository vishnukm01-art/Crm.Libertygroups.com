"use client";

import { useState, useEffect, useCallback } from "react";
import { Building, Plus, X, CheckCircle, Clock, XCircle } from "lucide-react";

interface BankDetail {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string | null;
  ifscCode: string | null;
  swiftCode: string | null;
  accountType: string | null;
  ibanNumber: string | null;
  bankAddress: string | null;
  country: string | null;
  status: string;
  createdAt: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function PortalBankDetailsPage() {
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    bankName: "", accountNumber: "", accountName: "", ifscCode: "",
    swiftCode: "", accountType: "savings", ibanNumber: "", bankAddress: "", country: "",
  });

  const fetchBankDetails = useCallback(async () => {
    try {
      const userId = localStorage.getItem("portalUserId");
      const res = await fetch(`/api/portal/bank-details?userId=${userId || "demo"}`);
      if (res.ok) setBankDetails(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBankDetails(); }, [fetchBankDetails]);

  const handleSubmit = async () => {
    if (!form.bankName || !form.accountNumber) { setError("Bank name and account number are required"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch("/api/portal/bank-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }
      setSuccess("Bank details submitted successfully! Pending approval.");
      setShowForm(false);
      setForm({ bankName: "", accountNumber: "", accountName: "", ifscCode: "", swiftCode: "", accountType: "savings", ibanNumber: "", bankAddress: "", country: "" });
      fetchBankDetails();
    } catch { setError("An error occurred"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
            <Building className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank Details</h1>
            <p className="text-sm text-gray-500">Manage your bank accounts for deposits and withdrawals</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium">
          <Plus className="w-4 h-4" />Add Bank Account
        </button>
      </div>

      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

      {/* Bank details cards */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
        </div>
      ) : bankDetails.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Building className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No bank details added yet</p>
          <p className="text-gray-400 text-xs mt-1">Add your bank account to enable deposits and withdrawals</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankDetails.map((bank) => (
            <div key={bank.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-sky-500" />
                  <h3 className="font-semibold text-gray-900">{bank.bankName}</h3>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(bank.status)}`}>
                  {bank.status === "approved" ? <CheckCircle className="w-3 h-3" /> : bank.status === "rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {bank.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Account Number</span><span className="text-gray-700 font-medium">****{bank.accountNumber.slice(-4)}</span></div>
                {bank.accountName && <div className="flex justify-between"><span className="text-gray-500">Account Name</span><span className="text-gray-700">{bank.accountName}</span></div>}
                {bank.accountType && <div className="flex justify-between"><span className="text-gray-500">Account Type</span><span className="text-gray-700 capitalize">{bank.accountType}</span></div>}
                {bank.ifscCode && <div className="flex justify-between"><span className="text-gray-500">IFSC Code</span><span className="text-gray-700">{bank.ifscCode}</span></div>}
                {bank.swiftCode && <div className="flex justify-between"><span className="text-gray-500">SWIFT Code</span><span className="text-gray-700">{bank.swiftCode}</span></div>}
                {bank.ibanNumber && <div className="flex justify-between"><span className="text-gray-500">IBAN</span><span className="text-gray-700">{bank.ibanNumber}</span></div>}
                {bank.country && <div className="flex justify-between"><span className="text-gray-500">Country</span><span className="text-gray-700">{bank.country}</span></div>}
              </div>
              <p className="text-xs text-gray-400 mt-3">Added {new Date(bank.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add bank details modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Bank Account</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label><input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="e.g., Chase Bank" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label><input type="text" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Account number" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label><input type="text" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Name on account" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label><select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"><option value="savings">Savings</option><option value="current">Current</option><option value="checking">Checking</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Country</label><input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Country" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label><input type="text" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="IFSC Code" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">SWIFT Code</label><input type="text" value={form.swiftCode} onChange={(e) => setForm({ ...form, swiftCode: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="SWIFT Code" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">IBAN Number</label><input type="text" value={form.ibanNumber} onChange={(e) => setForm({ ...form, ibanNumber: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="IBAN" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Address</label><textarea value={form.bankAddress} onChange={(e) => setForm({ ...form, bankAddress: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Bank branch address" /></div>
              <button onClick={handleSubmit} disabled={saving} className="w-full px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium text-sm disabled:opacity-50">
                {saving ? "Saving..." : "Submit Bank Details"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
