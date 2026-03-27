"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, FileCheck, Building, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";

interface Document { id: string; type: string; fileName: string; status: string; createdAt: string; }
interface BankDetail { id: string; bankName: string; accountNumber: string; accountName: string; status: string; createdAt: string; }

const statusBadge = (status: string) => {
  const map: Record<string, string> = { approved: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700" };
  return map[status] || "bg-gray-100 text-gray-600";
};

const statusIcon = (status: string) => {
  if (status === "approved") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === "rejected") return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
};

const docTypes = [
  { key: "id_proof", label: "Proof of Identity", desc: "Passport / National ID / Driver's License" },
  { key: "address_proof", label: "Proof of Address", desc: "Utility Bill / Bank Statement" },
  { key: "selfie", label: "Selfie with ID", desc: "Photo holding your ID document" },
  { key: "bank_statement", label: "Bank Statement", desc: "Recent bank statement (last 3 months)" },
];

export default function RegulationsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [banks, setBanks] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    Promise.all([
      fetch(`/api/portal/documents?userId=${userId}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/portal/bank-details?userId=${userId}`).then((r) => r.ok ? r.json() : []),
    ]).then(([d, b]) => { setDocs(d); setBanks(b); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20"><Shield className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Regulations</h1><p className="text-sm text-gray-500">KYC verification and bank details</p></div>
      </div>
      <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
    </div>
  );

  const approvedDocs = docs.filter((d) => d.status === "approved").length;
  const pendingDocs = docs.filter((d) => d.status === "pending").length;
  const approvedBanks = banks.filter((b) => b.status === "approved").length;
  const pendingBanks = banks.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20"><Shield className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Regulations</h1><p className="text-sm text-gray-500">KYC verification and bank account status</p></div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20"><FileCheck className="w-5 h-5 text-white" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase">KYC Documents</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{approvedDocs} / {docTypes.length} <span className="text-sm font-normal text-gray-400">verified</span></p>
          {pendingDocs > 0 && <p className="text-xs text-amber-600 mt-1">{pendingDocs} pending review</p>}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20"><Building className="w-5 h-5 text-white" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Bank Accounts</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{approvedBanks} <span className="text-sm font-normal text-gray-400">verified</span></p>
          {pendingBanks > 0 && <p className="text-xs text-amber-600 mt-1">{pendingBanks} pending review</p>}
        </div>
      </div>

      {/* Identity Verification */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileCheck className="w-4 h-4 text-amber-500" />Identity Verification</h3>
          <Link href="/portal/documents" className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">Upload Documents <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
          {docTypes.map((dt) => {
            const doc = docs.find((d) => d.type === dt.key);
            return (
              <div key={dt.key} className={`rounded-xl p-4 border ${doc ? (doc.status === "approved" ? "bg-emerald-50 border-emerald-100" : doc.status === "rejected" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100") : "bg-gray-50 border-gray-100"}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{dt.label}</p>
                  {doc ? statusIcon(doc.status) : <span className="text-xs text-gray-400">Not uploaded</span>}
                </div>
                <p className="text-xs text-gray-500">{dt.desc}</p>
                {doc && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize mt-2 ${statusBadge(doc.status)}`}>{doc.status}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Building className="w-4 h-4 text-sky-500" />Verified Bank Accounts</h3>
          <Link href="/portal/bank-details" className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">Manage Bank Details <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {banks.length === 0 ? (
          <div className="p-10 text-center"><p className="text-sm text-gray-400">No bank accounts added yet.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {banks.map((b) => (
              <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">{b.bankName}</p>
                  <p className="text-xs text-gray-400">{b.accountName} - ****{b.accountNumber.slice(-4)}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(b.status)}`}>{statusIcon(b.status)} {b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
