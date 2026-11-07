import React from "react";

/**
 * RecepToraLogo - Primary Brand Identity for RecepTora
 * Modern, luminous AI receptionist crest with dual arcs and conversational pulse.
 */
export default function RecepToraLogo({
  name = "RecepTora",
  size = "default", // "compact" | "default" | "large" | "hero"
  showSubtitle = true,
  showText = true,
  theme = "dark",
  className = "",
  layout = "horizontal",
}) {
  const sizeMap = {
    compact: { icon: 28, text: "text-base", sub: "text-[9px]" },
    default: { icon: 38, text: "text-lg", sub: "text-[11px]" },
    large: { icon: 48, text: "text-xl", sub: "text-xs" },
    hero: { icon: 64, text: "text-2xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size] || sizeMap.default;

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${
        layout === "vertical" ? "flex-col text-center" : ""
      } ${className}`}
    >
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20"
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden relative">
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4/5 h-4/5"
          >
            <circle cx="20" cy="20" r="16" stroke="url(#receptora-grad)" strokeWidth="2.5" strokeDasharray="3 2" />
            <path
              d="M12 24C14 27 17 28 20 28C23 28 26 27 28 24"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="15" cy="16" r="2.5" fill="#818CF8" />
            <circle cx="25" cy="16" r="2.5" fill="#38BDF8" />
            <path
              d="M20 8V12"
              stroke="#A78BFA"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="20" cy="7" r="2" fill="#C084FC" />
            <defs>
              <linearGradient id="receptora-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818CF8" />
                <stop offset="0.5" stopColor="#A855F7" />
                <stop offset="1" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span
            className={`font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent ${currentSize.text}`}
          >
            {name}
          </span>
          {showSubtitle && (
            <span
              className={`font-medium tracking-wide uppercase text-indigo-400/80 ${currentSize.sub}`}
            >
              AI Receptionist OS
            </span>
          )}
        </div>
      )}
    </div>
  );
}

