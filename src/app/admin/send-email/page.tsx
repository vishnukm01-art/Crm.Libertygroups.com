"use client";

import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { Mail, Send, Bold, Italic, Link as LinkIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Image, Quote, Table2, Undo2, Redo2 } from "lucide-react";

interface Group { id: string; name: string; }

export default function SendEmailPage() {
  const [form, setForm] = useState({ to: "", subject: "", sendTo: "all" });
  const [users, setUsers] = useState<{ id: string; email: string; name: string }[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then(setUsers).catch(() => {});
    fetch("/api/mt5/groups").then((r) => r.ok ? r.json() : []).then(setGroups).catch(() => {});
  }, []);

  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = editorRef.current?.innerHTML || "";
    setError(""); setSuccess("");
    if (!form.subject || !body.replace(/<[^>]*>/g, "").trim()) { setError("Subject and body are required"); return; }
    if (form.sendTo === "selected" && selectedUsers.length === 0) { setError("Please select at least one user"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Email: ${form.subject}`,
          message: body,
          type: "general",
          ...(form.sendTo === "selected" && { userIds: selectedUsers }),
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to send"); return; }
      const data = await res.json();
      setSuccess(`Email sent to ${data.recipientCount} user(s) successfully!`);
      setForm({ to: "", subject: "", sendTo: "all" });
      setSelectedUsers([]);
      if (editorRef.current) editorRef.current.innerHTML = "";
    } catch { setError("An error occurred"); } finally { setLoading(false); }
  };

  const toolbarBtn = "p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors";

  return (
    <PageShell title="Send Email" description="Compose and send emails to clients" icon={Mail}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-4xl animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl text-sm font-medium border border-emerald-100">{success}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send to <span className="text-red-500">*</span></label>
            <select value={form.sendTo} onChange={(e) => setForm({ ...form, sendTo: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all">
              <option value="all">All CRM Users</option>
              <option value="selected">Selected Users</option>
              <option value="group">Send To Group User</option>
            </select>
          </div>

          {form.sendTo === "selected" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Users</label>
              <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto p-2 space-y-1">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-sky-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => setSelectedUsers((prev) => prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id])} className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                    {u.name} ({u.email})
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.sendTo === "group" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Group</label>
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all">
                <option value="">-- Select a group --</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Subject <span className="text-red-500">*</span></label>
            <input type="text" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all" placeholder="Enter Subject" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body <span className="text-red-500">*</span></label>
            <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-100 bg-gray-50/50">
                <select onChange={(e) => execCommand("formatBlock", e.target.value)} defaultValue="" className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white mr-1">
                  <option value="" disabled>Paragraph</option>
                  <option value="p">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                </select>
                <button type="button" onClick={() => execCommand("bold")} className={toolbarBtn}><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => execCommand("italic")} className={toolbarBtn}><Italic className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button type="button" onClick={() => { const url = prompt("Enter URL:"); if (url) execCommand("createLink", url); }} className={toolbarBtn}><LinkIcon className="w-4 h-4" /></button>
                <button type="button" onClick={() => execCommand("insertUnorderedList")} className={toolbarBtn}><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => execCommand("insertOrderedList")} className={toolbarBtn}><ListOrdered className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button type="button" onClick={() => execCommand("justifyLeft")} className={toolbarBtn}><AlignLeft className="w-4 h-4" /></button>
                <button type="button" onClick={() => execCommand("justifyCenter")} className={toolbarBtn}><AlignCenter className="w-4 h-4" /></button>
                <button type="button" onClick={() => execCommand("justifyRight")} className={toolbarBtn}><AlignRight className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button type="button" onClick={() => { const url = prompt("Image URL:"); if (url) execCommand("insertImage", url); }} className={toolbarBtn}><Image className="w-4 h-4" /></button>
                <button type="button" onClick={() => execCommand("formatBlock", "blockquote")} className={toolbarBtn}><Quote className="w-4 h-4" /></button>
                <button type="button" onClick={() => execCommand("insertHTML", '<table border="1" style="border-collapse:collapse;width:100%"><tr><td style="padding:8px">&nbsp;</td><td style="padding:8px">&nbsp;</td></tr><tr><td style="padding:8px">&nbsp;</td><td style="padding:8px">&nbsp;</td></tr></table>')} className={toolbarBtn}><Table2 className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button type="button" onClick={() => execCommand("undo")} className={toolbarBtn}><Undo2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => execCommand("redo")} className={toolbarBtn}><Redo2 className="w-4 h-4" /></button>
              </div>
              {/* Editor */}
              <div ref={editorRef} contentEditable className="min-h-[200px] p-4 text-sm text-gray-700 focus:outline-none [&_a]:text-sky-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Send className="w-4 h-4" />
            {loading ? "Sending..." : "Submit"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
