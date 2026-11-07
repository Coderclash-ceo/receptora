import React, { useRef, useState, useEffect } from "react";
import { Scissors } from "lucide-react";

/**
 * OtpInput:
 * - 6 separate digit boxes
 * - Auto-advance and backspace navigation
 * - Full paste support
 * - Numeric keypad & autocomplete="one-time-code"
 * - Scissor SVG animation that cuts across when 6th digit entered
 * - Shake animation on error
 * - Prefers-reduced-motion fallback
 */
export default function OtpInput({
  value = "",
  onChange,
  onComplete,
  error = false,
  disabled = false,
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [animatingScissor, setAnimatingScissor] = useState(false);
  const inputRefs = useRef([]);

  // Sync internal digits when external value changes
  useEffect(() => {
    const arr = value.split("").slice(0, 6);
    while (arr.length < 6) arr.push("");
    setDigits(arr);
  }, [value]);

  const triggerScissorAnimation = (fullCode) => {
    setAnimatingScissor(true);
    // Non-blocking callback: Verification proceeds in parallel!
    if (onComplete) {
      onComplete(fullCode);
    }
    const timer = setTimeout(() => {
      setAnimatingScissor(false);
    }, 700);
    return () => clearTimeout(timer);
  };

  const handleDigitChange = (index, char) => {
    if (disabled) return;
    const clean = char.replace(/\D/g, "");
    if (!clean && char !== "") return;

    const newDigits = [...digits];
    newDigits[index] = clean.slice(-1);
    setDigits(newDigits);

    const fullCode = newDigits.join("");
    if (onChange) onChange(fullCode);

    // Auto-advance
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // When 6th digit entered
    if (clean && index === 5 && newDigits.every((d) => d !== "")) {
      triggerScissorAnimation(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (disabled) return;
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = pasted.split("");
    while (newDigits.length < 6) newDigits.push("");
    setDigits(newDigits);

    const fullCode = newDigits.join("");
    if (onChange) onChange(fullCode);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      triggerScissorAnimation(fullCode);
    }
  };

  return (
    <div className={`relative w-full max-w-sm mx-auto py-2 ${error ? "animate-shake" : ""}`}>
      {/* Dashed line and sliding scissor animation */}
      <div className="relative flex items-center justify-between gap-2 sm:gap-3">
        {animatingScissor && (
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center">
            {/* Cut line */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-red-400 border-b border-dashed border-red-500 animate-cut-line" />
            {/* Sliding Scissor */}
            <div className="absolute top-1/2 -translate-y-1/2 animate-scissor text-[#FF6C52]">
              <Scissors className="w-6 h-6 transform -rotate-45" />
            </div>
          </div>
        )}

        {digits.map((digit, idx) => (
          <div key={idx} className="relative flex-1 aspect-square max-w-[52px]">
            <input
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={idx === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              disabled={disabled}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${idx + 1} of 6`}
              className={`w-full h-full text-center text-xl font-bold rounded-2xl border-2 transition-all outline-none bg-white
                ${
                  error
                    ? "border-red-400 text-red-600 bg-red-50/30"
                    : animatingScissor
                    ? "border-emerald-400 text-emerald-600 bg-emerald-50/20 animate-flip-success"
                    : digit
                    ? "border-[#1E2772] text-[#1E2772] shadow-sm"
                    : "border-slate-200 text-slate-800 hover:border-slate-300 focus:border-[#1E2772] focus:ring-4 focus:ring-[#1E2772]/10"
                }
                ${disabled ? "bg-slate-50 opacity-60 cursor-not-allowed" : ""}
              `}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
