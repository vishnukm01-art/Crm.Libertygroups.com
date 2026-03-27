"use client";

interface PeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
  options?: { label: string; value: string }[];
}

const defaultOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export default function PeriodSelector({ value, onChange, options = defaultOptions }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300
            ${value === opt.value
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
              : "bg-gray-100 text-gray-600 hover:bg-sky-50 hover:text-sky-600"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
