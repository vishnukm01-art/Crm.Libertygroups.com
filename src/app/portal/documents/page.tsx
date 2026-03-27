"use client";

import { useState, useEffect, useCallback } from "react";
import { FileCheck, Upload, X, Eye, Clock, CheckCircle, XCircle } from "lucide-react";

interface Document {
  id: string;
  type: string;
  fileName: string;
  status: string;
  createdAt: string;
}

const docTypes = [
  { value: "id_proof", label: "ID Proof (Passport / National ID)" },
  { value: "address_proof", label: "Address Proof (Utility Bill / Bank Statement)" },
  { value: "selfie", label: "Selfie with ID" },
  { value: "bank_statement", label: "Bank Statement" },
];

const statusIcon = (status: string) => {
  if (status === "approved") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === "rejected") return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedType, setSelectedType] = useState("id_proof");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchDocs = useCallback(async () => {
    try {
      const userId = localStorage.getItem("portalUserId");
      const res = await fetch(`/api/portal/documents?userId=${userId || "demo"}`);
      if (res.ok) setDocuments(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async () => {
    if (!selectedFile) { setError("Please select a file"); return; }
    setUploading(true); setError(""); setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", selectedType);
      formData.append("userId", localStorage.getItem("portalUserId") || "demo");

      const res = await fetch("/api/portal/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }
      setSuccess("Document uploaded successfully! Pending review.");
      setShowUpload(false);
      setSelectedFile(null);
      fetchDocs();
    } catch { setError("An error occurred"); } finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KYC Documents</h1>
            <p className="text-sm text-gray-500">Upload and manage your verification documents</p>
          </div>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium">
          <Upload className="w-4 h-4" />Upload Document
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Document requirements */}
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
        <h3 className="font-semibold text-sky-900 text-sm mb-3">Required Documents for KYC Verification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docTypes.map((dt) => {
            const uploaded = documents.find((d) => d.type === dt.value);
            return (
              <div key={dt.value} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-sky-100">
                {uploaded ? statusIcon(uploaded.status) : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{dt.label}</p>
                  {uploaded && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${statusBadge(uploaded.status)}`}>
                      {uploaded.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Uploaded documents table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <FileCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No documents uploaded yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">File Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-700 capitalize">{doc.type.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-gray-700">{doc.fileName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(doc.status)}`}>
                      {statusIcon(doc.status)} {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(doc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Upload Document</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100">
                  {docTypes.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-sky-300 transition-colors">
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" id="doc-upload" />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">{selectedFile ? selectedFile.name : "Click to select file"}</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF, max 5MB</p>
                  </label>
                </div>
              </div>
              <button onClick={handleUpload} disabled={uploading} className="w-full px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium text-sm disabled:opacity-50">
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
