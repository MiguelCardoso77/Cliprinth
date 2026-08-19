"use client";

import { Grade } from "@/lib/moments";

function scoreColor(score: number): string {
  if (score >= 60) return "#4ade80";
  if (score >= 40) return "#facc15";
  return "#fb923c";
}

const GRADE_COLOR: Record<Grade, string> = {
  S: "#7dd3fc",
  A: "#4ade80",
  B: "#86efac",
  C: "#facc15",
  D: "#fb923c",
  F: "#ff4d4d",
};

type ScoreButtonProps = {
  score: number;
  hookGrade?: Grade;
  flowGrade?: Grade;
  engagementGrade?: Grade;
  onClick?: () => void;
};

export function ScoreButton({
  score,
  hookGrade,
  flowGrade,
  engagementGrade,
  onClick,
}: ScoreButtonProps) {
  const color = scoreColor(score);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1 rounded-xl px-5 py-3.5 transition-all duration-150"
    >
      <span
        style={{ color, opacity: 0.8, letterSpacing: "1px" }}
        className="font-mono text-xs uppercase leading-none"
      >
        Score
      </span>
      <span
        style={{ color }}
        className="font-mono text-2xl font-semibold leading-none"
      >
        {score}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.7 }}
        className="h-3.5 w-3.5"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>

      {hookGrade && flowGrade && engagementGrade && (
        <div className="mt-1.5 flex flex-col items-center gap-2">
          <span className="flex flex-col items-center gap-[2px] font-mono leading-none">
            <span
              style={{ color: GRADE_COLOR[hookGrade] }}
              className="text-base font-semibold"
            >
              {hookGrade}
            </span>
            <span style={{ opacity: 0.5 }} className="text-[10px] uppercase">
              Hook
            </span>
          </span>
          <span className="flex flex-col items-center gap-[2px] font-mono leading-none">
            <span
              style={{ color: GRADE_COLOR[flowGrade] }}
              className="text-base font-semibold"
            >
              {flowGrade}
            </span>
            <span style={{ opacity: 0.5 }} className="text-[10px] uppercase">
              Flow
            </span>
          </span>
          <span className="flex flex-col items-center gap-[2px] font-mono leading-none">
            <span
              style={{ color: GRADE_COLOR[engagementGrade] }}
              className="text-base font-semibold"
            >
              {engagementGrade}
            </span>
            <span style={{ opacity: 0.5 }} className="text-[10px] uppercase">
              Engagement
            </span>
          </span>
        </div>
      )}
    </button>
  );
}
