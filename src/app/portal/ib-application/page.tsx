"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UserPlus, CheckCircle, Clock, XCircle, FileText, AlertCircle,
  ArrowRight, Network,
} from "lucide-react";

interface IBApplication {
  id: string;
  status: string;
  reason: string | null;
  adminComment: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export default function IBApplicationPage() {
  const [application, setApplication] = useState<IBApplication | null>(null);
  const [terms, setTerms] = useState("");
  const [isIB, setIsIB] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch(`/api/portal/ib-application?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setApplication(data.application);
        setTerms(data.terms);
        setIsIB(data.isIB);
        // Sync isIB status to localStorage so sidebar nav updates
        if (data.isIB) {
          try {
            const stored = localStorage.getItem("portalUser");
            if (stored) {
              const u = JSON.parse(stored);
              if (!u.isIB) {
                u.isIB = true;
                localStorage.setItem("portalUser", JSON.stringify(u));
              }
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!agreed) {
      setError("Please agree to the IB terms and conditions");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for your IB application");
      return;
    }

    setSubmitting(true);
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch("/api/portal/ib-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit application");
        return;
      }
      setSuccess("Your IB application has been submitted! Our team will review it shortly.");
      fetchData();
    } catch {
      setError("An error occurred while submitting your application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Apply for IB</h1>
            <p className="text-sm text-gray-500">Become an Introducing Broker</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  // State 1: Already an IB
  if (isIB) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Introducing Broker</h1>
            <p className="text-sm text-gray-500">You are an approved IB</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-xl font-bold mb-2">You are an Approved Introducing Broker!</h2>
          <p className="text-emerald-100 text-sm mb-6">
            You can now access your IB Dashboard to view your referral link, track your referred users, and manage commissions.
          </p>
          <Link
            href="/portal/ib-dashboard"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 px-6 py-3 rounded-xl font-medium text-sm hover:bg-emerald-50 transition-colors"
          >
            <Network className="w-4 h-4" />
            Go to IB Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // State 2: Has pending application
  if (application && application.status === "pending") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IB Application</h1>
            <p className="text-sm text-gray-500">Your application is under review</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Application Under Review</h2>
          <p className="text-gray-500 text-sm mb-4">
            Your IB application was submitted on {new Date(application.createdAt).toLocaleDateString()}.
            Our admin team is reviewing your request.
          </p>
          {application.reason && (
            <div className="bg-gray-50 rounded-xl p-4 text-left mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Your Reason</p>
              <p className="text-sm text-gray-700">{application.reason}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // State 3: No application or rejected — show form
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apply for IB</h1>
          <p className="text-sm text-gray-500">Become an Introducing Broker and earn commissions</p>
        </div>
      </div>

      {/* Rejected banner */}
      {application && application.status === "rejected" && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Your previous application was rejected on {application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString() : "N/A"}</p>
            {application.adminComment && (
              <p className="mt-1 text-red-600">Reason: {application.adminComment}</p>
            )}
            <p className="mt-1 text-red-600/80">You can submit a new application below.</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Terms */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-sky-500" />
            IB Terms & Conditions
          </h3>
          {terms ? (
            <div
              className="prose prose-sm max-w-none text-gray-600 max-h-[400px] overflow-y-auto pr-2 border border-gray-100 rounded-xl p-4 bg-gray-50"
              dangerouslySetInnerHTML={{ __html: terms }}
            />
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              IB terms and conditions will be displayed here once configured by admin.
            </div>
          )}
        </div>

        {/* Right: Application Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-4.5 h-4.5 text-purple-500" />
            IB Application Form
          </h3>

          {/* Benefits info */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-5">
            <h4 className="text-xs font-semibold text-purple-800 uppercase mb-2">Benefits of becoming an IB</h4>
            <ul className="space-y-1.5 text-xs text-purple-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-500" />
                Earn commissions on referred clients&apos; trading activity
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-500" />
                Get a unique referral link to share with potential clients
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-500" />
                Track your referred users and earnings in real-time
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-500" />
                Share commission with your referral network
              </li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Why do you want to become an IB? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none"
                placeholder="Explain your experience, network, and how you plan to bring clients to Liberty Markets..."
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-sky-500 border-gray-300 rounded focus:ring-sky-500"
              />
              <label htmlFor="agree-terms" className="text-sm text-gray-600">
                I have read and agree to the <span className="font-medium text-gray-900">IB Terms & Conditions</span> and
                understand my responsibilities as an Introducing Broker.
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !agreed || !reason.trim()}
              className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Submit IB Application
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
