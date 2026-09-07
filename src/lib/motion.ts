// Shared Framer Motion variants used across pages so entrance/transition timing,
// easing, and distances stay consistent instead of being re-invented per page.
import type { Variants, Transition } from "motion/react";

export const springSnappy: Transition = { type: "spring", stiffness: 400, damping: 32 };
export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 28 };
export const easeOut: Transition = { duration: 0.35, ease: [0.16, 1, 0.3, 1] };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: easeOut },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeOut },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: easeOut },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

// Apply to a parent; children using `staggerItem` will cascade in.
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: easeOut },
};

// Full-page route transition (used once, in Layout, wrapping <Outlet/>).
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: "easeIn" } },
};

// Tab panel switches within a page (replaces ad-hoc {opacity:0,y:10} blocks).
export const tabPanel: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};
