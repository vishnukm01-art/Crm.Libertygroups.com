"use client";

import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { FileText, CheckCircle } from "lucide-react";

export default function IBRequestTermsPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : [])
      .then((settings: any[]) => {
        const s = settings.find((s) => s.key === "ib_request_terms");
        if (s) {
          setContent(s.value);
          if (editorRef.current) editorRef.current.innerHTML = s.value;
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSuccess("");
    const html = editorRef.current?.innerHTML || "";
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [{ key: "ib_request_terms", value: html, group: "ib_terms" }],
        }),
      });
      setSuccess("IB Request Terms saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {} finally { setSaving(false); }
  };

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  if (loading) return <PageShell title="IB Request Terms" description="Manage IB request terms and conditions" icon={FileText}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="IB Request Terms" description="Manage IB request terms and conditions" icon={FileText}>
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4" />{success}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden max-w-4xl">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Description</h3>
          </div>
          <div className="border-b border-gray-100">
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50">
              <button type="button" onClick={() => execCmd("bold")} className="px-3 py-1.5 text-xs font-bold hover:bg-gray-200 rounded">B</button>
              <button type="button" onClick={() => execCmd("italic")} className="px-3 py-1.5 text-xs italic hover:bg-gray-200 rounded">I</button>
              <button type="button" onClick={() => execCmd("underline")} className="px-3 py-1.5 text-xs underline hover:bg-gray-200 rounded">U</button>
              <button type="button" onClick={() => execCmd("strikeThrough")} className="px-3 py-1.5 text-xs line-through hover:bg-gray-200 rounded">S</button>
              <span className="w-px h-6 bg-gray-300 self-center mx-1" />
              <button type="button" onClick={() => execCmd("insertUnorderedList")} className="px-3 py-1.5 text-xs hover:bg-gray-200 rounded">UL</button>
              <button type="button" onClick={() => execCmd("insertOrderedList")} className="px-3 py-1.5 text-xs hover:bg-gray-200 rounded">OL</button>
              <span className="w-px h-6 bg-gray-300 self-center mx-1" />
              <button type="button" onClick={() => execCmd("justifyLeft")} className="px-3 py-1.5 text-xs hover:bg-gray-200 rounded">Left</button>
              <button type="button" onClick={() => execCmd("justifyCenter")} className="px-3 py-1.5 text-xs hover:bg-gray-200 rounded">Center</button>
              <button type="button" onClick={() => execCmd("justifyRight")} className="px-3 py-1.5 text-xs hover:bg-gray-200 rounded">Right</button>
              <span className="w-px h-6 bg-gray-300 self-center mx-1" />
              <select onChange={(e) => execCmd("formatBlock", e.target.value)} className="px-2 py-1 text-xs border border-gray-200 rounded bg-white">
                <option value="p">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>
            </div>
          </div>
          <div ref={editorRef} contentEditable className="min-h-[300px] p-4 text-sm focus:outline-none" />
        </div>
        <button type="submit" disabled={saving} className="mt-4 px-6 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-medium text-sm disabled:opacity-50">
          {saving ? "Saving..." : "Submit"}
        </button>
      </form>
    </PageShell>
  );
}
