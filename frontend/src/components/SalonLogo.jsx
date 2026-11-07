import React from "react";
import BrandLogo from "./logos/BrandLogo";

/**
 * SalonLogo - Primary Brand Logo Component
 * Seamlessly delivers the official brand identities:
 * - "RecepTora": Exact AI Receptionist Headset mascot logo
 * - "Just Look Salon": Edgy Shears & Lightning Bolt Crest
 * - "Fine Look Salon": Cyber-Aperture Neon Vortex
 */
export default function SalonLogo({
  name = "Just Look Salon",
  size = "default", // "compact" | "default" | "large" | "hero"
  showSubtitle = true,
  showText = true,
  theme = "dark", // "dark" | "light"
  variant, // "nudge-os" | "just-look" | "fine-look"
  className = "",
  layout = "horizontal",
}) {
  return (
    <BrandLogo
      name={name}
      size={size}
      showSubtitle={showSubtitle}
      showText={showText}
      theme={theme}
      variant={variant}
      className={className}
      layout={layout}
    />
  );
}
