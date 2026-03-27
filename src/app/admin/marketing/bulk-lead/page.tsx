"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from "lucide-react";

interface ParsedLead {
  name: string; email: string; phone: string; country: string; notes: string;
}

export default function BulkLeadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [marketingUserId, setMarketingUserId] = useState("");
  const [marketingUsers, setMarketingUsers] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useState(() => {
    fetch("/api/marketing/users").then((r) => r.ok ? r.json() : []).then((data) => {
      setMarketingUsers(data);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setSuccess("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { setError("CSV must have header row and at least one data row"); return; }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes("name"));
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const phoneIdx = headers.findIndex((h) => h.includes("phone"));
      const countryIdx = headers.findIndex((h) => h.includes("country"));
      const notesIdx = headers.findIndex((h) => h.includes("note"));

      if (nameIdx === -1 || emailIdx === -1) { setError("CSV must have 'name' and 'email' columns"); return; }

      const parsed: ParsedLead[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols[nameIdx] && cols[emailIdx]) {
          parsed.push({
            name: cols[nameIdx], email: cols[emailIdx],
            phone: phoneIdx >= 0 ? cols[phoneIdx] || "" : "",
            country: countryIdx >= 0 ? cols[countryIdx] || "" : "",
            notes: notesIdx >= 0 ? cols[notesIdx] || "" : "",
          });
        }
      }
      setLeads(parsed);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!marketingUserId) { setError("Please select a marketing user"); return; }
    if (leads.length === 0) { setError("No leads to upload"); return; }
    setUploading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/marketing/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, marketingUserId, leads }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Bulk upload failed");
        return;
      }
      const result = await res.json();
      setSuccess(`Successfully uploaded ${result.count || leads.length} leads!`);
      setLeads([]);
    } catch { setError("An error occurred"); } finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const csv = "name,email,phone,country,notes\nJohn Doe,john@example.com,+1234567890,United States,Sample lead\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "lead-template.csv"; a.click();
  };

  return (
    <PageShell title="Bulk Lead Upload" description="Import leads from CSV file" icon={Upload}>
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5" />{success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* File upload area */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Upload CSV File</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-sky-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">Click to upload CSV file</p>
              <p className="text-xs text-gray-400 mt-1">CSV format with name, email, phone, country, notes columns</p>
            </div>
            <button onClick={downloadTemplate} className="mt-3 text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />Download CSV Template
            </button>
          </div>

          {/* Preview table */}
          {leads.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{leads.length} Leads Parsed</h3>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Phone</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 50).map((lead, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 text-gray-700">{lead.name}</td>
                        <td className="px-4 py-2 text-gray-700">{lead.email}</td>
                        <td className="px-4 py-2 text-gray-500">{lead.phone || "-"}</td>
                        <td className="px-4 py-2 text-gray-500">{lead.country || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {leads.length > 50 && <div className="p-3 text-center text-xs text-gray-400">Showing first 50 of {leads.length} leads</div>}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">Assign & Upload</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Marketing User *</label>
              <select value={marketingUserId} onChange={(e) => setMarketingUserId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100">
                <option value="">Select user...</option>
                {marketingUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="bg-sky-50 rounded-xl p-4">
              <p className="text-sm font-medium text-sky-900">Leads to Upload</p>
              <p className="text-2xl font-bold text-sky-600 mt-1">{leads.length}</p>
            </div>
            <button onClick={handleUpload} disabled={uploading || leads.length === 0 || !marketingUserId}
              className="w-full px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />{uploading ? "Uploading..." : "Upload Leads"}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
