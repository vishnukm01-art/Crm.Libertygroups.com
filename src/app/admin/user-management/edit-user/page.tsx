"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { UserCog, Save, ArrowLeft } from "lucide-react";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia",
  "Czech Republic", "Denmark", "Egypt", "Finland", "France", "Germany", "Ghana",
  "Greece", "Hong Kong", "Hungary", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya", "Kuwait",
  "Malaysia", "Mexico", "Morocco", "Nepal", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Oman", "Pakistan", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Singapore",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland",
  "Taiwan", "Thailand", "Turkey", "UAE", "Uganda", "Ukraine",
  "United Kingdom", "United States", "Vietnam", "Zimbabwe",
];

function EditUserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    status: "pending",
    marketingName: "",
  });

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch(`/api/users/${userId}`).then((r) => r.json()),
      fetch("/api/marketing/partners").then((r) => r.json()),
    ])
      .then(([user, partnerList]) => {
        setForm({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          country: user.country || "",
          status: user.status || "pending",
          marketingName: user.marketingName || "",
        });
        setPartners(Array.isArray(partnerList) ? partnerList : []);
      })
      .catch(() => setError("Failed to load user data"))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          country: form.country || null,
          status: form.status,
          marketingName: form.marketingName || null,
        }),
      });
      if (res.ok) {
        setSuccess("User updated successfully!");
      } else {
        const d = await res.json();
        setError(d.error || "Failed to update user");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
        No user ID provided. Please go back to the User List.
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to User List
      </button>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-100 p-6 max-w-3xl space-y-5 animate-fade-in-up"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                placeholder="Full name"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
              >
                <option value="">Select Country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                placeholder="+1 234 567 890"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
              >
                <option value="pending">Pending</option>
                <option value="active">Approve</option>
                <option value="blocked">Block</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Marketing Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marketing Name
              </label>
              <select
                value={form.marketingName}
                onChange={(e) =>
                  setForm({ ...form, marketingName: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
              >
                <option value="">Select Marketing Partner</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Update User"}
          </button>
        </form>
      )}
    </>
  );
}

export default function EditUserPage() {
  return (
    <PageShell
      title="Edit User"
      description="Update user profile and settings"
      icon={UserCog}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        }
      >
        <EditUserContent />
      </Suspense>
    </PageShell>
  );
}
