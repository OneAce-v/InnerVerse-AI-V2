import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface SectionTabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SectionTabsProps {
  tabs: SectionTabItem[];
  value: string;
  onChange: (id: string) => void;
  layoutId?: string;
  className?: string;
}

// Pill tab bar with a shared-layout sliding highlight, replacing the manual
// button-row + conditional-className pattern repeated across every dashboard page.
export function SectionTabs({ tabs, value, onChange, layoutId = "section-tab-highlight", className }: SectionTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 p-1 rounded-xl border border-border bg-muted/40 overflow-x-auto scrollbar-hide",
        className
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex-1 min-w-[110px] flex items-center justify-center gap-2 px-3 py-2.5 text-xs md:text-sm font-semibold rounded-lg whitespace-nowrap transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-card shadow-sm border border-border/80"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
