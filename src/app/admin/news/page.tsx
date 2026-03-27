"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Newspaper, Plus, X } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  shortDescription: string | null;
  image: string | null;
  isPublished: boolean;
  isTrending: boolean;
  createdAt: string;
}

type EditingNews = Partial<NewsItem> & { imageFile?: File | null };

export default function NewsPage() {
  const [data, setData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingNews | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const handleSave = async () => {
    if (!editing?.title || !editing?.content) { setError("Title and description are required"); return; }
    setSaving(true); setError("");
    try {
      const isNew = !editing.id;
      const payload: any = { ...editing };
      delete payload.imageFile;
      const res = await fetch("/api/news", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to save"); return; }
      setEditing(null);
      await fetchNews();
    } catch { setError("An error occurred"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this news article?")) return;
    await fetch("/api/news", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchNews();
  };

  const columns = [
    { key: "title", label: "Title" },
    { key: "content", label: "Description", render: (v: unknown) => (
      <span className="truncate max-w-[150px] block text-gray-500">{String(v || "").substring(0, 50)}...</span>
    )},
    { key: "shortDescription", label: "Short Description", render: (v: unknown) => (
      <span className="truncate max-w-[120px] block text-gray-500">{String(v || "-").substring(0, 40)}</span>
    )},
    { key: "image", label: "Image", render: (v: unknown) => v ? (
      <span className="text-xs text-sky-600">Has image</span>
    ) : <span className="text-xs text-gray-400">-</span> },
    { key: "isPublished", label: "Status", render: (v: unknown) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
        {v ? "Publish" : "Unpublish"}
      </span>
    )},
    { key: "isTrending", label: "Trending", render: (v: unknown) => (
      <span className={`text-xs font-medium ${v ? "text-sky-600" : "text-gray-400"}`}>{v ? "Yes" : "No"}</span>
    )},
    { key: "createdAt", label: "Date", render: (v: unknown) => new Date(String(v)).toLocaleDateString() },
    { key: "actions", label: "Action", render: (_: unknown, row: Record<string, unknown>) => (
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(row as any)} className="text-xs text-sky-600 hover:text-sky-700 font-medium">Edit</button>
        <button onClick={() => handleDelete(row.id as string)} className="text-xs text-red-500 hover:text-red-600 font-medium">Delete</button>
      </div>
    )},
  ];

  if (loading) {
    return (
      <PageShell title="News List" description="Manage news articles and announcements" icon={Newspaper}>
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="News List"
      description="Manage news articles and announcements"
      icon={Newspaper}
      actions={<button onClick={() => setEditing({ title: "", content: "", shortDescription: "", image: null, isPublished: true, isTrending: false })} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Add News</button>}
    >
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search news..." emptyMessage="No data available in table" />

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editing.id ? "Edit News" : "Add News"}</h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-100">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input type="text" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Enter Title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea rows={4} value={editing.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none" placeholder="Enter Description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description <span className="text-red-500">*</span></label>
                <textarea rows={3} value={editing.shortDescription || ""} onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none" placeholder="Enter Short Description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setEditing({ ...editing, image: reader.result as string });
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-sky-50 file:text-sky-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                <select value={editing.isPublished ? "publish" : "unpublish"} onChange={(e) => setEditing({ ...editing, isPublished: e.target.value === "publish" })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100">
                  <option value="publish">Publish</option>
                  <option value="unpublish">Unpublish</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trending <span className="text-red-500">*</span></label>
                <select value={editing.isTrending ? "yes" : "no"} onChange={(e) => setEditing({ ...editing, isTrending: e.target.value === "yes" })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full disabled:opacity-50">{saving ? "Saving..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
