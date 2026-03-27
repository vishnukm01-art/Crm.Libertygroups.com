"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { Users, Search } from "lucide-react";

interface Client {
  id: string; name: string; email: string; phone: string | null;
  mt5Account: string | null; totalCommission: number; ibName: string | null; createdAt: string;
}
interface Stats { totalMembers: number; totalInvestment: number; totalWithdraw: number; }

export default function IBClientsPage() {
  const params = useParams();
  const ibId = params.id as string;
  const [ibName, setIbName] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, totalInvestment: 0, totalWithdraw: 0 });
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/ib/${ibId}/clients`)
      .then((r) => r.ok ? r.json() : { ib: { name: "" }, stats: { totalMembers: 0, totalInvestment: 0, totalWithdraw: 0 }, clients: [] })
      .then((data) => { setIbName(data.ib?.name || ""); setStats(data.stats); setClients(data.clients); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [ibId]);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell title={`My Clients`} description={`Referral Clients of IB :- ${ibName}`} icon={Users}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Team Member", value: stats.totalMembers },
          { label: "My Team Investment", value: `$${stats.totalInvestment.toLocaleString()}` },
          { label: "My Team Withdraw", value: `$${stats.totalWithdraw.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 text-center animate-fade-in-up">
            <div className="text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
            <div className="text-sm text-gray-500 border-t-2 border-sky-400 pt-2 mt-2 inline-block px-4">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Level Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
            <button key={level} onClick={() => setActiveLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeLevel === level ? "bg-sky-500 text-white shadow-sm" : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`}>
              Client Level <span className="text-lg font-bold">{level}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Lot", value: "0" },
          { label: "Commission", value: "$0" },
          { label: "Deposit", value: `$${stats.totalInvestment.toLocaleString()}` },
          { label: "Withdraw", value: `$${stats.totalWithdraw.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center animate-fade-in-up">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Client Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Show</span>
            <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"><option>10</option><option>25</option><option>50</option></select>
            <span className="text-sm text-gray-500">entries</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Search:</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-sky-300 focus:outline-none w-48" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {["ID", "Name", "Email", "Phone", "MT5 ID", "Total Lots", "Total Commission", "IB Name", "Registration Date"].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr> :
               filtered.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No data available in table</td></tr> :
               filtered.map((c, i) => (
                <tr key={c.id} className="table-row-hover border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-3 py-3 text-gray-600">{c.email}</td>
                  <td className="px-3 py-3 text-gray-600">{c.phone || "--"}</td>
                  <td className="px-3 py-3 text-gray-600 font-mono">{c.mt5Account || "--"}</td>
                  <td className="px-3 py-3 text-gray-700">0</td>
                  <td className="px-3 py-3 text-gray-700">{c.totalCommission}</td>
                  <td className="px-3 py-3 text-gray-600">{c.ibName || ibName}</td>
                  <td className="px-3 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString("en-CA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">Showing {filtered.length === 0 ? "0 to 0 of 0" : `1 to ${filtered.length} of ${filtered.length}`} entries</p>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400">Previous</button>
            <button className="w-8 h-8 rounded-lg text-xs font-medium bg-sky-500 text-white">1</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400">Next</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
