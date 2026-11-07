import React from "react";
import RecepToraLogo from "./RecepToraLogo";
import JustLookLogo from "./JustLookLogo";
import FineLookLogo from "./FineLookLogo";

/**
 * BrandLogo - Unified Logo Engine for RecepTora & Multi-Tenant Salons
 *
 * Automatically renders the exact brand identity:
 * 1. "RecepTora": Primary AI Receptionist mark with glowing conversational pulse
 * 2. "Just Look Salon" (test-business-1): Dark Teal & Gold Barber Crest with Lightning
 * 3. "Fine Look Salon" (fine-look): Futuristic Cyber-Aperture Neon Vortex Monogram
 * 4. Custom Salons: Elegant responsive salon emblem
 */
export default function BrandLogo({
  name = "RecepTora",
  variant, // "receptora" | "just-look" | "fine-look" (optional explicit override)
  size = "default", // "compact" | "default" | "large" | "hero"
  showSubtitle = true,
  showText = true,
  theme = "dark", // "dark" | "light"
  className = "",
  layout = "horizontal",
}) {
  const normalized = (name || "").toLowerCase();

  // Determine variant
  let activeVariant = variant;
  if (!activeVariant) {
    if (normalized.includes("just look") || normalized.includes("justlook") || normalized.includes("test-business-1")) {
      activeVariant = "just-look";
    } else if (normalized.includes("fine look") || normalized.includes("finelook") || normalized.includes("fine-look")) {
      activeVariant = "fine-look";
    } else {
      activeVariant = "receptora";
    }
  }

  if (activeVariant === "just-look") {
    return (
      <JustLookLogo
        name={name || "Just Look Salon"}
        size={size}
        showSubtitle={showSubtitle}
        showText={showText}
        theme={theme}
        className={className}
        layout={layout}
      />
    );
  }

  if (activeVariant === "fine-look") {
    return (
      <FineLookLogo
        name={name || "Fine Look Salon"}
        size={size}
        showSubtitle={showSubtitle}
        showText={showText}
        theme={theme}
        className={className}
        layout={layout}
      />
    );
  }

  return (
    <RecepToraLogo
      name={name || "RecepTora"}
      size={size}
      showSubtitle={showSubtitle}
      showText={showText}
      theme={theme}
      className={className}
      layout={layout}
    />
  );
}
