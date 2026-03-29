"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useVJAuth } from "../../../VJAuthContext";

interface Template {
  id: string;
  name: string;
  description: string | null;
  criteria: Array<{
    id: string;
    name: string;
    description: string | null;
    weight: number;
    maxScore: number;
  }>;
}

interface Interaction {
  id: string;
  customerName: string | null;
  agentName: string | null;
  score: number | null;
  sentiment: string | null;
}

function NewEvaluationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useVJAuth();

  const interactionId = searchParams.get("interactionId");
  const templateIdParam = searchParams.get("templateId");

  const [step, setStep] = useState(templateIdParam ? 2 : 1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Scores state: criteriaId -> score
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreNotes, setScoreNotes] = useState<Record<string, string>>({});
  const [evalNotes, setEvalNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [templatesRes, interactionRes] = await Promise.all([
        fetch("/api/scorecard-templates"),
        interactionId ? fetch(`/api/interactions/${interactionId}`) : Promise.resolve(null),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data);
        if (templateIdParam) {
          const found = data.find((t: Template) => t.id === templateIdParam);
          if (found) setSelectedTemplate(found);
        }
      }

      if (interactionRes && interactionRes.ok) {
        setInteraction(await interactionRes.json());
      }
    } catch {
      toast.error("Failed to load evaluation data");
    } finally {
      setLoading(false);
    }
  }, [interactionId, templateIdParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    // Initialize scores to 0
    const initialScores: Record<string, number> = {};
    template.criteria.forEach((c) => {
      initialScores[c.id] = 0;
    });
    setScores(initialScores);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !interactionId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interactionId,
          templateId: selectedTemplate.id,
          evaluatorId: user?.id || "anonymous",
          evaluatorName: user?.name || "Anonymous",
          notes: evalNotes || null,
          scores: Object.entries(scores).map(([criteriaId, score]) => ({
            criteriaId,
            score,
            notes: scoreNotes[criteriaId] || null,
          })),
        }),
      });

      if (res.ok) {
        toast.success("Evaluation submitted");
        const evaluation = await res.json();
        router.push(`/voice-jar/evaluate/${evaluation.id}`);
      }
    } catch {
      toast.error("Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!interactionId) {
    return (
      <div className="text-center py-16">
        <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No interaction selected</p>
        <p className="text-gray-400 text-xs mt-1">Start an evaluation from an interaction detail page</p>
        <button onClick={() => router.push("/voice-jar")} className="mt-3 text-violet-600 hover:text-violet-700 text-sm">
          Go to Interactions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Evaluation</h1>
          {interaction && (
            <p className="text-xs text-gray-500">
              {interaction.customerName || "Unknown"} &mdash; Agent: {interaction.agentName || "Unknown"}
            </p>
          )}
        </div>
      </div>

      {/* Step 1: Select Template */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Select a scorecard template:</h2>
          {templates.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No templates available</p>
              <button onClick={() => router.push("/voice-jar/templates")} className="mt-2 text-violet-600 hover:text-violet-700 text-sm">
                Create a template first
              </button>
            </div>
          )}
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => selectTemplate(template)}
              className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-300 dark:hover:border-violet-700 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
                  {template.description && <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{template.criteria.length} criteria</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Score Criteria */}
      {step === 2 && selectedTemplate && (
        <div className="space-y-4">
          <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3">
            <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
              Template: {selectedTemplate.name}
            </p>
            {!templateIdParam && (
              <button onClick={() => setStep(1)} className="text-xs text-violet-600 hover:text-violet-700 mt-1">
                Change template
              </button>
            )}
          </div>

          {selectedTemplate.criteria.map((criteria) => (
            <div key={criteria.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{criteria.name}</h3>
                  {criteria.description && <p className="text-xs text-gray-500">{criteria.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Weight: {criteria.weight}% | Max: {criteria.maxScore}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-violet-600">{scores[criteria.id] || 0}</span>
                  <span className="text-sm text-gray-400">/{criteria.maxScore}</span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={criteria.maxScore}
                value={scores[criteria.id] || 0}
                onChange={(e) => setScores({ ...scores, [criteria.id]: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <textarea
                value={scoreNotes[criteria.id] || ""}
                onChange={(e) => setScoreNotes({ ...scoreNotes, [criteria.id]: e.target.value })}
                className="w-full mt-2 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none"
                rows={1}
                placeholder="Notes for this criteria (optional)"
              />
            </div>
          ))}

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overall Notes</label>
            <textarea
              value={evalNotes}
              onChange={(e) => setEvalNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none"
              rows={3}
              placeholder="Additional evaluation notes..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            {submitting ? "Submitting..." : "Submit Evaluation"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function NewEvaluationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <NewEvaluationContent />
    </Suspense>
  );
}
