"use client";

import TimestampBadge from "./TimestampBadge";

interface TimeReference {
  startTime: number;
  endTime: number;
  label: string;
}

export interface AnalysisItem {
  id: string;
  name: string;
  description: string | null;
  timeReferences?: TimeReference[] | null;
}

type Theme = "blue" | "green" | "red" | "amber";

const themeMap: Record<Theme, { bg: string; border: string; title: string; dot: string }> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    title: "text-blue-800 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    title: "text-green-800 dark:text-green-300",
    dot: "bg-green-500",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    title: "text-red-800 dark:text-red-300",
    dot: "bg-red-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    title: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
  },
};

interface AnalysisItemListProps {
  items: AnalysisItem[];
  theme: Theme;
  label: string;
}

export default function AnalysisItemList({ items, theme, label }: AnalysisItemListProps) {
  const t = themeMap[theme];

  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${t.dot}`} />
        {label}
        <span className="text-xs font-normal text-gray-400">({items.length})</span>
      </h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-3 ${t.bg} ${t.border}`}
          >
            <p className={`text-sm font-medium ${t.title}`}>{item.name}</p>
            {item.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {item.description}
              </p>
            )}
            {item.timeReferences && item.timeReferences.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.timeReferences.map((tr, i) => (
                  <TimestampBadge
                    key={i}
                    label={tr.label}
                    startTime={tr.startTime}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
