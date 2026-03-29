"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Loader2,
  X,
  Trash2,
  Edit,
  Star,
} from "lucide-react";

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

interface Template {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  criteria: Array<{
    id: string;
    name: string;
    description: string | null;
    weight: number;
    maxScore: number;
    questions: Array<{ id: string; text: string; maxPoints: number }>;
  }>;
  _count: { evaluations: number };
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [criteria, setCriteria] = useState<CriteriaInput[]>([
    { name: "", description: "", weight: 25, maxScore: 10, questions: [] },
  ]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/scorecard-templates");
      if (res.ok) setTemplates(await res.json());
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || criteria.length === 0) return;

    setCreating(true);
    try {
      const res = await fetch("/api/scorecard-templates", {
        method: "POST",
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
        setShowCreate(false);
        setName("");
        setDescription("");
        setIsDefault(false);
        setCriteria([{ name: "", description: "", weight: 25, maxScore: 10, questions: [] }]);
        fetchTemplates();
        toast.success("Template created");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Failed to create template (${res.status})`);
      }
    } catch (err) {
      toast.error("Failed to create template: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setCreating(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/scorecard-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  const totalQuestions = criteria.reduce((sum, c) => sum + c.questions.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scorecard Templates</h1>
            <p className="text-sm text-gray-500">Define evaluation criteria for call quality assessment</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No templates yet</p>
          <p className="text-gray-400 text-xs mt-1">Create a scorecard template to start evaluating calls</p>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="space-y-2">
          {templates.map((template) => {
            const qCount = template.criteria.reduce((s, c) => s + (c.questions?.length || 0), 0);
            return (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
                      {template.isDefault && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          Default
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{template.criteria.length} criteria</span>
                      {qCount > 0 && <span>{qCount} questions</span>}
                      <span>{template._count.evaluations} evaluations</span>
                      <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/voice-jar/templates/${template.id}`)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {template.criteria.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                    >
                      {c.name} ({c.weight}%){c.questions?.length > 0 && ` - ${c.questions.length}q`}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Scorecard Template</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-violet-300 focus:outline-none"
                  placeholder="e.g. Customer Service Scorecard"
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
                  placeholder="Brief description of what this template evaluates"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Set as default template for auto AI evaluation</span>
              </label>

              {/* Criteria */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Criteria ({totalWeight}% total weight{totalQuestions > 0 ? `, ${totalQuestions} questions` : ""})
                  </label>
                  <button
                    type="button"
                    onClick={addCriteria}
                    className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
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
                          <button
                            type="button"
                            onClick={() => removeCriteria(i)}
                            className="p-1 text-red-400 hover:text-red-500"
                          >
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
                disabled={!name.trim() || criteria.filter((c) => c.name.trim()).length === 0 || creating}
                className="w-full py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Creating..." : "Create Template"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
