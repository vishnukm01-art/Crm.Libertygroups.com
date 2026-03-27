"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Upload } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function UploadDocumentsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ userId: "", documentType: "", fileName: "" });

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.userId) { setError("Please select a user"); return; }
    if (!form.documentType) { setError("Please select a document type"); return; }
    if (!form.fileName.trim()) { setError("Please enter a file name"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: form.userId,
          documentType: form.documentType,
          fileName: form.fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to upload document"); return; }
      setSuccess("Document uploaded successfully!");
      setForm({ userId: "", documentType: "", fileName: "" });
    } catch {
      setError("An error occurred while uploading");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Upload Documents" description="Upload documents on behalf of a user" icon={Upload}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100">
              {success}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User *</label>
            <select
              required
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
            >
              <option value="">-- Select a user --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
            <select
              required
              value={form.documentType}
              onChange={(e) => setForm({ ...form, documentType: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
            >
              <option value="">-- Select document type --</option>
              <option value="ID Proof">ID Proof</option>
              <option value="Address Proof">Address Proof</option>
              <option value="Selfie">Selfie</option>
              <option value="Bank Statement">Bank Statement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Name *</label>
            <input
              type="text"
              required
              value={form.fileName}
              onChange={(e) => setForm({ ...form, fileName: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
              placeholder="e.g. passport_front.pdf"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
