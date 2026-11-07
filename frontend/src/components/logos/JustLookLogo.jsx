import React from "react";

/**
 * JustLookLogo - Exact pixel-matched implementation of the luxury arched beauty profile logo
 * (Faithfully replicated from the user's "Lovre Beauty Salon" reference)
 *
 * Visual Components:
 * 1. Architectural rounded portal arch in deep midnight plum (#180A21)
 * 2. 3 celestial 4-pointed sparkle stars shining in the night sky
 * 3. Front vertical hair lock framing the forehead and profile
 * 4. Graceful upward-tilted facial profile with delicate nose, lips, philtrum, and rounded chin
 * 5. Peaceful closed eyelid with soft downward eyelashes & sleek arched eyebrow
 * 6. Layered crown locks arching over the top of the head
 * 7. Cascading waterfall of hair with 4 parallel cream stripes in the bottom-right quadrant
 * 8. High-fashion luxury typography: "JUST LOOK" and "BEAUTY SALON & SPA"
 */
export default function JustLookLogo({
  name = "Just Look Salon",
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
    ? "text-sm font-semibold tracking-wide"
    : isLarge
    ? "text-2xl font-bold tracking-wider"
    : isHero
    ? "text-3xl font-bold tracking-wider"
    : "text-lg font-semibold tracking-wide";

  const subSize = isCompact
    ? "text-[8px] tracking-[0.25em]"
    : isLarge
    ? "text-[11px] tracking-[0.3em]"
    : isHero
    ? "text-xs tracking-[0.35em]"
    : "text-[9px] tracking-[0.28em]";

  const textColor = theme === "dark" ? "text-white" : "text-[#180A21]";
  const subColor = theme === "dark" ? "text-rose-200/80" : "text-[#4A355A]";
  const archBorderColor = theme === "dark" ? "rgba(255, 255, 255, 0.25)" : "#180A21";

  // Vector emblem element (SVG)
  const renderEmblem = (tight = true) => (
    <svg
      viewBox={tight ? "148 40 258 348" : "0 0 554 554"}
      className="w-full h-full drop-shadow-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Architectural Arch Clip Path */}
        <clipPath id="jlArchPortal">
          <path d="M 150 386 L 150 169 A 127 127 0 0 1 404 169 L 404 386 Z" />
        </clipPath>
      </defs>

      {/* CLIPPED ARCH PORTAL EMBLEM */}
      <g clipPath="url(#jlArchPortal)">
        {/* Midnight Plum Night Sky Backdrop */}
        <rect x="140" y="30" width="280" height="370" fill="#180A21" />

        {/* CELESTIAL SPARKLE STARS (Night Sky) */}
        {/* Star 1 (Top Left) */}
        <path
          d="M 189 122 Q 189 139 173 139 Q 189 139 189 156 Q 189 139 205 139 Q 189 139 189 122 Z"
          fill="#FFFFFF"
        />
        {/* Star 2 (Middle Left) */}
        <path
          d="M 204 168 Q 204 180 193 180 Q 204 180 204 192 Q 204 180 215 180 Q 204 180 204 168 Z"
          fill="#FFFFFF"
        />
        {/* Star 3 (Bottom Left) */}
        <path
          d="M 177 211 Q 177 219 169 219 Q 177 219 177 227 Q 177 219 185 219 Q 177 219 177 211 Z"
          fill="#FFFFFF"
        />

        {/* FACE, THROAT & CROWN HAIR (Blush Cream Porcelain Fill) */}
        <path
          d="
            M 277 42
            A 127 127 0 0 1 404 169
            L 404 250
            C 380 230, 345 220, 314 220
            C 295 220, 284 235, 284 255
            L 284 386
            L 225 386
            L 225 260
            C 225 252, 211 248, 211 240
            C 211 234, 222 228, 226 225
            L 226 120
            A 127 127 0 0 1 277 42
            Z
          "
          fill="#FCEAE4"
        />

        {/* FRONT VERTICAL HAIR LOCK */}
        <path d="M 226 120 L 226 225 C 226 225, 239 218, 239 205 L 239 120 Z" fill="#FCEAE4" />
        <line x1="239" y1="120" x2="239" y2="205" stroke="#180A21" strokeWidth="2.2" strokeLinecap="round" />

        {/* CROWN HAIR STRANDS */}
        <path
          d="M 246 162 C 260 120, 295 75, 338 70"
          stroke="#180A21"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 268 162 C 278 120, 310 85, 355 80"
          stroke="#180A21"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 280 160 C 295 120, 328 95, 368 95"
          stroke="#180A21"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 292 160 C 310 125, 346 115, 382 115"
          stroke="#180A21"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />

        {/* FACIAL PROFILE CONTOUR: NOSE, PHILTRUM, LIPS, CHIN */}
        <path
          d="
            M 275 162
            L 268 175
            L 260 185
            L 252 195
            C 248 198, 247 200, 248 203
            C 251 204, 254 205, 253 207
            C 247 208, 244 207, 244 207
            C 248 209, 250 211, 248 212
            C 243 216, 238 219, 230 226
          "
          stroke="#180A21"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* EYE & EYELASHES */}
        <path
          d="M 312 169 Q 324 180 333 191"
          stroke="#180A21"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
        <line x1="318" y1="172" x2="312" y2="176" stroke="#180A21" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="322" y1="177" x2="316" y2="182" stroke="#180A21" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="325" y1="182" x2="320" y2="187" stroke="#180A21" strokeWidth="1.8" strokeLinecap="round" />

        {/* EYEBROW */}
        <path
          d="M 339 145 C 348 152, 358 168, 370 191"
          stroke="#180A21"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />

        {/* DARK BOTTOM-RIGHT QUADRANT: CASCADING HAIR WATERFALL */}
        <path
          d="
            M 404 250
            C 380 230, 345 220, 314 220
            C 295 220, 284 235, 284 255
            L 284 386
            L 404 386
            Z
          "
          fill="#180A21"
        />

        {/* 4 CASCADING CREAM HAIR STRIPES */}
        <path
          d="M 320 220 C 307 235, 294 265, 300 310 L 300 386"
          stroke="#FCEAE4"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 346 226 C 330 245, 316 275, 314 310 L 314 386"
          stroke="#FCEAE4"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 370 234 C 352 255, 334 285, 328 315 L 328 386"
          stroke="#FCEAE4"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 394 244 C 374 268, 350 295, 340 325 L 340 386"
          stroke="#FCEAE4"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* ARCH BORDER OUTLINE */}
      <path
        d="M 150 386 L 150 169 A 127 127 0 0 1 404 169 L 404 386"
        stroke={archBorderColor}
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );

  return (
    <div
      className={`inline-flex ${
        layout === "vertical" ? "flex-col items-center text-center" : "items-center"
      } gap-3 select-none ${className}`}
    >
      {/* Precision Emblem Container */}
      <div className={`${iconDims} shrink-0 relative flex items-center justify-center`}>
        {renderEmblem(true)}
      </div>

      {/* Brand Name & Subtitle Typography */}
      {showText && (
        <div className={`flex flex-col ${layout === "vertical" ? "items-center" : "items-start"}`}>
          <span className={`${titleSize} ${textColor} leading-tight font-serif uppercase tracking-[0.14em]`}>
            {name || "Just Look"}
          </span>
          {showSubtitle && (
            <span className={`${subSize} ${subColor} uppercase font-medium mt-0.5 tracking-[0.24em]`}>
              Beauty Salon & Spa
            </span>
          )}
        </div>
      )}
    </div>
  );
}
