"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { DollarSign } from "lucide-react";

interface Commission { id: string; groupName: string; commissionType: string; value: number; level: number; }

export default function IBCommissionViewPage() {
  const params = useParams();
  const ibId = params.id as string;
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [ibName, setIbName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ib/commission").then((r) => r.ok ? r.json() : []),
      fetch(`/api/ib/${ibId}/clients`).then((r) => r.ok ? r.json() : { ib: { name: "" } }),
    ]).then(([allComm, clientData]) => {
      setCommissions(allComm.filter((c: { ibUserId: string }) => c.ibUserId === ibId));
      setIbName(clientData.ib?.name || "");
    }).catch(() => {}).finally(() => setLoading(false));
  }, [ibId]);

  const totalEarned = commissions.reduce((sum, c) => sum + c.value, 0);

  return (
    <PageShell title="View Commission" description={`Commission details for ${ibName}`} icon={DollarSign}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Earned", value: `$${totalEarned.toLocaleString()}` },
          { label: "Available", value: `$${totalEarned.toLocaleString()}` },
          { label: "Withdrawn", value: "$0" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 text-center animate-fade-in-up">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {["#", "Group", "Type", "Value", "Level"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr> :
               commissions.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No commission data</td></tr> :
               commissions.map((c, i) => (
                <tr key={c.id} className="table-row-hover border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-700">{c.groupName}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{c.commissionType.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{c.value}</td>
                  <td className="px-4 py-3 text-gray-600">{c.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
