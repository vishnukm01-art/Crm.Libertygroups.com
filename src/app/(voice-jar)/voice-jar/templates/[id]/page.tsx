"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  X,
  Save,
  Star,
} from "lucide-react";

interface Question {
  id: string;
  text: string;
  maxPoints: number;
  sortOrder: number;
}

interface Criteria {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  maxScore: number;
  sortOrder: number;
  questions: Question[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  criteria: Criteria[];
}

interface QuestionInput {
  text: string;
  maxPoints: number;
}

interface CriteriaInput {
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  questions: QuestionInput[];
}

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [criteria, setCriteria] = useState<CriteriaInput[]>([]);

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`/api/scorecard-templates/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        setName(data.name);
        setDescription(data.description || "");
        setIsDefault(data.isDefault || false);
        setCriteria(
          data.criteria.map((c: Criteria) => ({
            name: c.name,
            description: c.description || "",
            weight: c.weight,
            maxScore: c.maxScore,
            questions: (c.questions || []).map((q: Question) => ({
              text: q.text,
              maxPoints: q.maxPoints,
            })),
          }))
        );
      }
    } catch {
      toast.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const addCriteria = () => {
    setCriteria([...criteria, { name: "", description: "", weight: 0, maxScore: 10, questions: [] }]);
  };

  const removeCriteria = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriteria = (index: number, field: keyof CriteriaInput, value: string | number) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const addQuestion = (criteriaIndex: number) => {
    const updated = [...criteria];
    updated[criteriaIndex] = {
      ...updated[criteriaIndex],
      questions: [...updated[criteriaIndex].questions, { text: "", maxPoints: 5 }],
    };
    setCriteria(updated);
  };

  const removeQuestion = (criteriaIndex: number, questionIndex: number) => {
    const updated = [...criteria];
    updated[criteriaIndex] = {
      ...updated[criteriaIndex],
      questions: updated[criteriaIndex].questions.filter((_, i) => i !== questionIndex),
    };
    setCriteria(updated);
  };

  const updateQuestion = (criteriaIndex: number, questionIndex: number, field: keyof QuestionInput, value: string | number) => {
    const updated = [...criteria];
    const questions = [...updated[criteriaIndex].questions];
    questions[questionIndex] = { ...questions[questionIndex], [field]: value };
    updated[criteriaIndex] = { ...updated[criteriaIndex], questions };
    setCriteria(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/scorecard-templates/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          isDefault,
          criteria: criteria
            .filter((c) => c.name.trim())
            .map((c) => ({
              ...c,
              questions: c.questions.filter((q) => q.text.trim()),
            })),
        }),
      });
      if (res.ok) {
        toast.success("Template saved");
        router.push("/voice-jar/templates");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Failed to save template (${res.status})`);
      }
    } catch (err) {
      toast.error("Failed to save template: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Template not found</p>
        <button onClick={() => router.push("/voice-jar/templates")} className="mt-2 text-violet-600 hover:text-violet-700 text-sm">
          Back to Templates
        </button>
      </div>
    );
  }

  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  const totalQuestions = criteria.reduce((sum, c) => sum + c.questions.length, 0);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/voice-jar/templates")} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Template</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-violet-300 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-violet-300 focus:outline-none"
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Set as default template for auto AI evaluation</span>
          </label>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Criteria ({totalWeight}% total weight{totalQuestions > 0 ? `, ${totalQuestions} questions` : ""})
            </label>
            <button type="button" onClick={addCriteria} className="text-xs text-violet-600 hover:text-violet-700 font-medium">
              + Add Criteria
            </button>
          </div>
          {totalWeight !== 100 && criteria.some((c) => c.name) && (
            <p className="text-xs text-amber-600 mb-2">Weights should add up to 100%</p>
          )}
          <div className="space-y-3">
            {criteria.map((c, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateCriteria(i, "name", e.target.value)}
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
                    placeholder="Criteria name (e.g. Greeting)"
                  />
                  <input
                    type="number"
                    value={c.weight}
                    onChange={(e) => updateCriteria(i, "weight", parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
                    placeholder="Weight %"
                    min={0}
                    max={100}
                  />
                  <input
                    type="number"
                    value={c.maxScore}
                    onChange={(e) => updateCriteria(i, "maxScore", parseInt(e.target.value) || 10)}
                    className="w-20 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
                    placeholder="Max"
                    min={1}
                  />
                  {criteria.length > 1 && (
                    <button type="button" onClick={() => removeCriteria(i)} className="p-1 text-red-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={c.description}
                  onChange={(e) => updateCriteria(i, "description", e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
                  placeholder="Brief description (optional)"
                />

                {/* Questions for this criteria */}
                <div className="ml-4 space-y-1.5">
                  {c.questions.map((q, qi) => (
                    <div key={qi} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{qi + 1}.</span>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestion(i, qi, "text", e.target.value)}
                        className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
                        placeholder="e.g. Did the advisor greet professionally?"
                      />
                      <input
                        type="number"
                        value={q.maxPoints}
                        onChange={(e) => updateQuestion(i, qi, "maxPoints", parseInt(e.target.value) || 5)}
                        className="w-16 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
                        placeholder="Pts"
                        min={1}
                        max={10}
                      />
                      <button
                        type="button"
                        onClick={() => removeQuestion(i, qi)}
                        className="p-0.5 text-red-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addQuestion(i)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium ml-4"
                  >
                    + Add Question
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || criteria.filter((c) => c.name.trim()).length === 0 || saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
