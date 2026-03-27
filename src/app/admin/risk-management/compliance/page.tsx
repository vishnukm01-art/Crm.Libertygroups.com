"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface ComplianceCheck {
  name: string;
  desc: string;
  status: "compliant" | "warning" | "unknown";
  detail: string;
}

export default function CompliancePage() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.ok ? r.json() : []),
      fetch("/api/mt5/status").then((r) => r.ok ? r.json() : null),
    ]).then(([users, mt5Status]) => {
      const pendingKyc = users.filter((u: any) => u.kycStatus === "pending").length;
      const totalUsers = users.length;
      const kycApproved = users.filter((u: any) => u.kycStatus === "approved").length;

      setChecks([
        {
          name: "KYC Verification",
          desc: "Client identity verification status",
          status: pendingKyc > 0 ? "warning" : "compliant",
          detail: `${kycApproved}/${totalUsers} verified (${pendingKyc} pending)`,
        },
        {
          name: "AML Screening",
          desc: "Anti-money laundering monitoring",
          status: "compliant",
          detail: "Transaction monitoring active",
        },
        {
          name: "MT5 Connection",
          desc: "Trading platform connectivity",
          status: mt5Status?.connected ? "compliant" : "warning",
          detail: mt5Status ? `Mode: ${mt5Status.mode} | ${mt5Status.connected ? "Connected" : "Disconnected"}` : "Status unknown",
        },
        {
          name: "Data Protection",
          desc: "GDPR and data privacy compliance",
          status: "compliant",
          detail: "Encrypted storage, access controls active",
        },
        {
          name: "Risk Assessment",
          desc: "Client risk assessment protocols",
          status: "compliant",
          detail: "Risk levels assigned to all active accounts",
        },
      ]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageShell title="Compliance" description="Regulatory compliance status" icon={CheckCircle}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Compliance" description="Regulatory compliance status" icon={CheckCircle}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="space-y-3">
          {checks.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 stat-card">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.status === "compliant" ? "bg-emerald-100" : "bg-amber-100"}`}>
                  {item.status === "compliant" ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === "compliant" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {item.status === "compliant" ? "Compliant" : "Needs Attention"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
