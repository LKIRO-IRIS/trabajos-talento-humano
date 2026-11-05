"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";

interface CompanyLogoProps {
  size?: number;
  className?: string;
  withRing?: boolean;
  company?: CompanyId;
}

/**
 * Company logo — renders as a styled circle with the company's monogram
 * ("R" for Royal Eventos, "RB" for Reflejos Brillantes SAS).
 * Colours come from COMPANY_THEMES.
 */
export function CompanyLogo({
  size = 40,
  className,
  withRing = true,
  company = "reflejos_brillantes",
}: CompanyLogoProps) {
  const t = getCompanyTheme(company);
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-extrabold shrink-0",
        withRing && "ring-2",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        letterSpacing: "-0.04em",
        background: `linear-gradient(135deg, ${t.logoBg}, ${t.logoBg}dd)`,
        color: t.logoFg,
        // @ts-expect-error CSS var for ring colour
        "--tw-ring-color": t.logoFg + "99",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
      aria-label={t.name}
      title={t.name}
    >
      {t.logoText}
    </div>
  );
}

/** Backward-compatible alias so existing imports of RBLogo keep working. */
export const RBLogo = CompanyLogo;
