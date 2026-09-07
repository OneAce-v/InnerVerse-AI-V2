import React from "react";
import { motion } from "motion/react";

interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// Standardizes the icon + title + description + primary-action header repeated
// at the top of every page, with a single consistent entrance animation.
export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-5.5 h-5.5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}
