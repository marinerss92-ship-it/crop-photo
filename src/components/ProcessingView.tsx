"use client";

interface Props {
  done: number;
  total: number;
  label?: string;
}

export function ProcessingView({ done, total, label }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-6 py-16 px-8">
      <div className="relative w-16 h-16">
        <svg className="animate-spin w-16 h-16 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-xl font-semibold text-zinc-800">
          Processing {done} / {total}
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          {label || "Detecting photo regions and removing borders..."}
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="h-3 bg-zinc-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400 text-center mt-2">{pct}%</p>
      </div>
    </div>
  );
}
