"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, Upload, X, Clock, CheckCircle, XCircle, Building,
  CreditCard, FileText, Image, AlertCircle, ChevronDown, Eye,
} from "lucide-react";

interface DepositBank {
  id: string;
  accountName: string;
  accountNo: string;
  bankName: string;
  ifscCode: string;
}

interface PSPEntry {
  id: string;
  gateway: string;
  countryType: string;
  status: string;
  type: string;
  orderNo: number;
}

interface Mt5Acc {
  id: string;
  mt5Login: string;
  mt5Group: string;
  leverage: string;
  isDefault: boolean;
  balance: number;
  equity: number;
}

interface Deposit {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  reference: string;
  notes: string | null;
  proofFilePath: string | null;
  adminComment: string | null;
  createdAt: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

const statusIcon = (status: string) => {
  if (status === "approved" || status === "completed") return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === "rejected") return <XCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

export default function PortalDepositPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [banks, setBanks] = useState<DepositBank[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [mt5Accounts, setMt5Accounts] = useState<Mt5Acc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [mt5AccountId, setMt5AccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewProof, setViewProof] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";

      // Fetch deposits, settings, MT5 accounts in parallel
      const [depositsRes, settingsRes, mt5Res] = await Promise.all([
        fetch(`/api/portal/deposits?userId=${userId}`),
        fetch("/api/settings"),
        fetch(`/api/portal/mt5-accounts?userId=${userId}`),
      ]);

      if (depositsRes.ok) {
        setDeposits(await depositsRes.json());
      }

      if (mt5Res.ok) {
        const accounts = await mt5Res.json();
        setMt5Accounts(accounts);
        const def = accounts.find((a: Mt5Acc) => a.isDefault);
        if (def && !mt5AccountId) setMt5AccountId(def.id);
        else if (accounts.length > 0 && !mt5AccountId) setMt5AccountId(accounts[0].id);
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();

        // Get deposit bank accounts
        const banksSetting = settings.find((s: { key: string; group: string }) => s.group === "deposit_banks");
        if (banksSetting) {
          try { setBanks(JSON.parse(banksSetting.value)); } catch { /* ignore */ }
        }

        // Get active deposit payment methods from PSP
        const pspSetting = settings.find((s: { key: string }) => s.key === "psp_entries");
        if (pspSetting) {
          try {
            const pspEntries: PSPEntry[] = JSON.parse(pspSetting.value);
            const depositMethods = pspEntries
              .filter((e) => (e.type === "deposit" || e.type === "both") && e.status === "active")
              .sort((a, b) => a.orderNo - b.orderNo)
              .map((e) => e.gateway);
            setPaymentMethods(Array.from(new Set(depositMethods)));
          } catch { /* ignore */ }
        }
      }

      // Fallback payment methods if none configured
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProofFile(file);
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setProofPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    } else {
      setProofPreview(null);
    }
  };

  const removeFile = () => {
    setProofFile(null);
    setProofPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!mt5AccountId && mt5Accounts.length > 0) {
      setError("Please select an MT5 account");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }
    if (!paymentMethod) {
      setError("Please select a payment method");
      return;
    }

    setSubmitting(true);
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("amount", amount);
      formData.append("paymentMethod", paymentMethod);
      if (mt5AccountId) formData.append("mt5AccountId", mt5AccountId);
      if (notes) formData.append("notes", notes);
      if (proofFile) formData.append("proof", proofFile);

      const res = await fetch("/api/portal/deposits", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit deposit request");
        return;
      }

      setSuccess(`Deposit request submitted! Reference: ${data.reference}. Pending admin approval.`);
      setAmount("");
      setPaymentMethod("");
      setNotes("");
      setProofFile(null);
      setProofPreview(null);
      fetchData();
    } catch {
      setError("An error occurred while submitting your deposit request");
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveMethods = paymentMethods.length > 0
    ? paymentMethods
    : ["Bank Transfer", "UPI", "Credit Card", "Crypto", "USDT"];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deposit Funds</h1>
            <p className="text-sm text-gray-500">Make a deposit to your trading account</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deposit Funds</h1>
          <p className="text-sm text-gray-500">Make a deposit to your trading account</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Deposit Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-sky-500" />
              New Deposit Request
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* MT5 Account Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit To (MT5 Account) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={mt5AccountId}
                    onChange={(e) => setMt5AccountId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white"
                  >
                    <option value="">{mt5Accounts.length === 0 ? "No MT5 accounts" : "Select MT5 account"}</option>
                    {mt5Accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.mt5Login} ({acc.mt5Group}, {acc.leverage}) - ${acc.balance.toLocaleString()}{acc.isDefault ? " (Default)" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {mt5Accounts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No MT5 accounts found. Please create one from your profile page.</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit Amount (USD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white"
                  >
                    <option value="">Select payment method</option>
                    {effectiveMethods.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes / Transaction Reference
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none"
                  placeholder="Enter transaction ID, UTR number, or any additional notes..."
                />
              </div>

              {/* Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proof of Deposit (Screenshot / Receipt)
                </label>
                {proofFile ? (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {proofPreview ? (
                          <img src={proofPreview} alt="Proof preview" className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-700">{proofFile.name}</p>
                          <p className="text-xs text-gray-400">{(proofFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-sky-300 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-sky-50 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-sky-500" />
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Click to upload proof</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP or PDF - Max 10MB</p>
                    </label>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Submit Deposit Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Bank Details + Info */}
        <div className="space-y-6">
          {/* Company Bank Details */}
          {banks.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="w-4.5 h-4.5 text-sky-500" />
                Company Bank Details
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Transfer funds to any of the bank accounts below and upload the proof of payment.
              </p>
              <div className="space-y-3">
                {banks.map((bank) => (
                  <div key={bank.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="font-medium text-gray-900 text-sm">{bank.bankName}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Account Name</span>
                        <span className="text-gray-700 font-medium">{bank.accountName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Account No.</span>
                        <span className="text-gray-700 font-medium font-mono">{bank.accountNo}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">IFSC Code</span>
                        <span className="text-gray-700 font-medium font-mono">{bank.ifscCode}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
            <h3 className="font-semibold text-sky-900 text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              How Deposit Works
            </h3>
            <ol className="space-y-2 text-xs text-sky-800">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>Choose your payment method and enter the deposit amount.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>Transfer funds to the company bank account shown on the right.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>Upload a screenshot or receipt of the payment as proof.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                <span>Our admin team will review and approve your deposit within 24 hours.</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Recent Deposits */}
      {deposits.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Deposits</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Proof</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Admin Comment</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((dep) => (
                  <tr key={dep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{dep.reference || "-"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">${dep.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">{dep.paymentMethod || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(dep.status)}`}>
                        {statusIcon(dep.status)} {dep.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dep.proofFilePath ? (
                        <button
                          onClick={() => setViewProof(dep.proofFilePath)}
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No proof</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(dep.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{dep.adminComment || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proof Viewer Modal */}
      {viewProof && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewProof(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-2xl max-h-[90vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Image className="w-4 h-4 text-sky-500" />
                Deposit Proof
              </h3>
              <button onClick={() => setViewProof(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {viewProof.endsWith(".pdf") ? (
              <iframe src={viewProof} className="w-full h-[70vh] rounded-lg border border-gray-100" />
            ) : (
              <img src={viewProof} alt="Deposit proof" className="max-w-full rounded-lg border border-gray-100" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
