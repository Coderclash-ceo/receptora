import React from "react";

/**
 * FineLookLogo - Exact implementation of the modern crossed shears & barber comb logo
 * (Faithfully inspired by the user's "Smart Saloon" reference)
 * Features:
 * - Professional styling shears crossed diagonally with a fine-toothed styling comb
 * - Precision scissor finger rings with curved finger tang
 * - Clean comb teeth and spine silhouette
 * - Bold modern typography: FINE LOOK / — SALON & GROOMING —
 */
export default function FineLookLogo({
  name = "Fine Look Salon",
  size = "default", // "compact" | "default" | "large" | "hero"
  showSubtitle = true,
  showText = true,
  theme = "dark", // "dark" | "light"
  className = "",
  layout = "horizontal", // "horizontal" | "vertical"
}) {
  const isCompact = size === "compact";
  const isLarge = size === "large";
  const isHero = size === "hero";

  const iconDims = isCompact
    ? "w-8 h-8"
    : isLarge
    ? "w-14 h-14"
    : isHero
    ? "w-24 h-24"
    : "w-10 h-10";

  const titleSize = isCompact
    ? "text-sm"
    : isLarge
    ? "text-2xl"
    : isHero
    ? "text-3xl"
    : "text-lg";

  const subSize = isCompact
    ? "text-[8px] tracking-[0.2em]"
    : isLarge
    ? "text-[11px] tracking-[0.25em]"
    : isHero
    ? "text-xs tracking-[0.3em]"
    : "text-[9px] tracking-[0.22em]";

  const iconFill = theme === "dark" ? "#FFFFFF" : "#111827";
  const textColor = theme === "dark" ? "text-white" : "text-slate-900";
  const subColor = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const ruleColor = theme === "dark" ? "bg-slate-600" : "bg-slate-300";

  return (
    <div
      className={`inline-flex ${
        layout === "vertical" ? "flex-col items-center text-center" : "items-center"
      } gap-3 select-none ${className}`}
    >
      {/* Precision Vector Emblem: Crossed Shears & Barber Comb */}
      <div className={`${iconDims} shrink-0 relative flex items-center justify-center`}>
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 1. BARBER COMB (Angled from top-right to bottom-left) */}
          <g transform="rotate(32 60 60)">
            {/* Comb Spine & Handle */}
            <path
              d="M 54 18 L 66 18 C 67 18, 68 19, 68 20 L 68 102 C 68 103, 67 104, 66 104 L 54 104 C 53 104, 52 103, 52 102 L 52 20 C 52 19, 53 18, 54 18 Z"
              fill={iconFill}
            />

            {/* Comb Fine Teeth (Upper half of the comb) */}
            {/* Teeth 1 to 14 extending rightwards */}
            {[24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76].map((yPos, i) => (
              <line
                key={i}
                x1="68"
                y1={yPos}
                x2="85"
                y2={yPos}
                stroke={iconFill}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* 2. STYLING SCISSORS (Diagonal crossing from top-left to bottom-right) */}
          <g>
            {/* Upper Right Blade */}
            <path
              d="M 38 22 L 60 58 L 57 60 L 35 24 Z"
              fill={iconFill}
            />

            {/* Pivot screw */}
            <circle cx="58" cy="59" r="2.5" fill={theme === "dark" ? "#1E2772" : "#FFFFFF"} />

            {/* Scissor Left Shank & Finger Loop */}
            <path
              d="M 57 60
                 C 54 68, 48 76, 42 82
                 L 40 80
                 C 45 74, 50 68, 54 60 Z"
              fill={iconFill}
            />
            {/* Left Finger Ring */}
            <circle
              cx="38"
              cy="92"
              r="10"
              stroke={iconFill}
              strokeWidth="4"
              fill="none"
            />

            {/* Scissor Right Shank & Finger Loop */}
            <path
              d="M 60 58
                 C 66 66, 72 74, 76 80
                 L 74 82
                 C 70 76, 64 68, 58 60 Z"
              fill={iconFill}
            />
            {/* Right Finger Ring */}
            <circle
              cx="78"
              cy="90"
              r="10"
              stroke={iconFill}
              strokeWidth="4"
              fill="none"
            />
            {/* Curved Finger Tang / Rest on Right Ring */}
            <path
              d="M 87 93 C 92 95, 95 98, 97 101 C 95 101, 92 99, 87 97 Z"
              fill={iconFill}
            />

            {/* Lower Shear Blade extending past comb */}
            <path
              d="M 58 60 L 74 34 L 71 32 L 56 58 Z"
              fill={iconFill}
            />
          </g>
        </svg>
      </div>

      {/* Typography: FINE LOOK / — SALON & GROOMING — */}
      {showText && (
        <div className={`min-w-0 ${layout === "vertical" ? "text-center" : "text-left"}`}>
          <div className="flex items-center gap-1.5 justify-center">
            <span
              className={`${titleSize} font-black tracking-tight ${textColor} font-['Plus_Jakarta_Sans',sans-serif]`}
              style={{ letterSpacing: "0.04em" }}
            >
              FINE LOOK
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
              title="Grooming Salon Active"
            />
          </div>

          {showSubtitle && (
            <div className="flex items-center gap-1.5 justify-center mt-0.5">
              <span className={`w-3 h-[1px] ${ruleColor}`} />
              <p
                className={`${subSize} font-bold uppercase ${subColor} font-['Plus_Jakarta_Sans',sans-serif]`}
                style={{ letterSpacing: "0.22em" }}
              >
                SALON &bull; GROOMING
              </p>
              <span className={`w-3 h-[1px] ${ruleColor}`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
