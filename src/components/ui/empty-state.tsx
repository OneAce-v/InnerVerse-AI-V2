import React from "react";
import { motion } from "motion/react";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// Consistent "nothing here yet" panel, replacing the various ad-hoc dashed-border
// empty messages scattered across pages.
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl border border-dashed border-border bg-muted/20"
    >
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-5.5 h-5.5 text-muted-foreground" />
      </div>
      <h4 className="font-bold text-sm text-foreground mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-4">{description}</p>
      )}
      {action}
    </motion.div>
  );
}
