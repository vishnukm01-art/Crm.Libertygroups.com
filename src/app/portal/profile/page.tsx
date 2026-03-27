"use client";

import { useState, useEffect } from "react";
import { User, Save, Mail, Phone, Globe, Shield, Lock, Eye, EyeOff, TrendingUp, Plus, Star } from "lucide-react";
import CreateMt5AccountModal from "@/components/CreateMt5AccountModal";

interface UserProfile {
  id: string; name: string; email: string; phone: string; country: string;
  status: string; kycStatus: string; mt5Account: string; mt5Group: string;
  leverage: string; isIB: boolean; createdAt: string;
}

interface Mt5AccInfo {
  id: string;
  mt5Login: string;
  mt5Group: string;
  leverage: string;
  isDefault: boolean;
  balance: number;
  equity: number;
}

const MT5_GROUPS = [
  { name: "Standard" },
  { name: "ECN" },
  { name: "VIP" },
  { name: "Cent" },
];

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", country: "" });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [mt5Accounts, setMt5Accounts] = useState<Mt5AccInfo[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchMt5Accounts = async () => {
    const userId = localStorage.getItem("portalUserId");
    if (!userId) return;
    try {
      const res = await fetch(`/api/portal/mt5-accounts?userId=${userId}`);
      if (res.ok) setMt5Accounts(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const userId = localStorage.getItem("portalUserId");
    if (userId) {
      fetch(`/api/portal/profile?userId=${userId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setProfile(data);
            setForm({ name: data.name, phone: data.phone || "", country: data.country || "" });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      fetchMt5Accounts();
    } else {
      const demo = {
        id: "demo", name: "Demo User", email: "demo@liberty.com", phone: "+1234567890",
        country: "United States", status: "active", kycStatus: "pending",
        mt5Account: "MT5-100234", mt5Group: "Standard", leverage: "1:100",
        isIB: false, createdAt: new Date().toISOString(),
      };
      setProfile(demo);
      setForm({ name: demo.name, phone: demo.phone, country: demo.country });
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    if (!form.name) { setError("Name is required"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile?.id, ...form }),
      });
      if (!res.ok) { setError("Failed to update profile"); return; }
      const updated = await res.json();
      setProfile(updated);
      setSuccess("Profile updated successfully!");
      setEditMode(false);
    } catch { setError("An error occurred"); } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(""); setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError("Passwords don't match"); return; }
    if (pwForm.newPassword.length < 6) { setPwError("New password must be at least 6 characters"); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/portal/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile?.id, currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || "Failed to change password"); return; }
      setPwSuccess("Password changed successfully!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch { setPwError("An error occurred"); } finally { setPwSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  );

  if (!profile) return <div className="text-center py-12 text-gray-500">Unable to load profile.</div>;

  const statusBadge = (status: string, type: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      approved: "bg-emerald-100 text-emerald-700",
      pending: "bg-amber-100 text-amber-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">View and manage your account information</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0"><Shield className="w-3.5 h-3.5 text-emerald-600" /></div>
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><Shield className="w-3.5 h-3.5 text-red-600" /></div>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 relative">
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white shadow-lg shadow-sky-500/20">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          <div className="pt-12 pb-4 px-6 text-center">
            <h3 className="font-bold text-gray-900 text-lg">{profile.name}</h3>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
          <div className="space-y-3 px-6 pb-6 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Account Status</span>{statusBadge(profile.status, "account")}</div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">KYC Status</span>{statusBadge(profile.kycStatus, "kyc")}</div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">IB Status</span><span className="text-gray-700">{profile.isIB ? "Active IB" : "Not IB"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Member Since</span><span className="text-gray-700">{new Date(profile.createdAt).toLocaleDateString()}</span></div>
          </div>
        </div>

        {/* Editable info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Personal Information</h3>
              {!editMode ? (
                <button onClick={() => setEditMode(true)} className="text-sm text-sky-600 font-medium hover:text-sky-700">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="text-sm text-gray-500 font-medium hover:text-gray-700">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="text-sm text-sky-600 font-medium hover:text-sky-700 flex items-center gap-1 disabled:opacity-50">
                    <Save className="w-3.5 h-3.5" />{saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Full Name</label>
                {editMode ? (
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" />
                ) : (
                  <p className="text-sm text-gray-900">{profile.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email Address</label>
                <p className="text-sm text-gray-900">{profile.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">Email cannot be changed</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Phone</label>
                  {editMode ? (
                    <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" />
                  ) : (
                    <p className="text-sm text-gray-900">{profile.phone || "-"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Country</label>
                  {editMode ? (
                    <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" />
                  ) : (
                    <p className="text-sm text-gray-900">{profile.country || "-"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MT5 Trading Accounts */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-sky-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-sky-500" />MT5 Trading Accounts</h3>
              {mt5Accounts.length < 5 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 text-white rounded-lg text-xs font-medium hover:bg-sky-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> New Account
                </button>
              )}
            </div>
            <div className="p-6">
              {mt5Accounts.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-sky-300" />
                  </div>
                  <p className="text-sm text-gray-500">No MT5 accounts yet.</p>
                  <button onClick={() => setShowCreateModal(true)} className="mt-3 text-sm text-sky-600 font-medium hover:text-sky-700">
                    Create your first MT5 account
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">{mt5Accounts.length} of 5 accounts used</p>
                  {mt5Accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-sky-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-sm">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-900">{acc.mt5Login}</p>
                            {acc.isDefault && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                                <Star className="w-2.5 h-2.5 fill-amber-500" /> Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{acc.mt5Group} | {acc.leverage}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">${acc.balance.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Equity: ${acc.equity.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <CreateMt5AccountModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreated={fetchMt5Accounts}
            groups={MT5_GROUPS}
            accountCount={mt5Accounts.length}
          />

          {/* Change Password */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-amber-50 px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-500" />Change Password</h3>
            </div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              {pwSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">{pwSuccess}</div>
              )}
              {pwError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{pwError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPw.current ? "text" : "password"}
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 pr-10"
                    placeholder="Enter current password"
                    required
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, current: !showPw.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPw.new ? "text" : "password"}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 pr-10"
                    placeholder="Enter new password"
                    required
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, new: !showPw.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Must be at least 6 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPw.confirm ? "text" : "password"}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 pr-10"
                    placeholder="Confirm new password"
                    required
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={pwSaving}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {pwSaving ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
