"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { fadeVariants } from "@/lib/motion";

interface MotionPageContainerProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  [key: string]: any; // Allow arbitrary props like data-testid
}

/**
 * Motion-enhanced page container with fade-in animation
 * Replaces the CSS animate-fade-in with motion.dev
 */
export function MotionPageContainer({ 
  children, 
  className,
  animate = true,
  ...props
}: MotionPageContainerProps) {
  if (!animate) {
    return (
      <div 
        className={cn("space-y-8", className)}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div 
      className={cn("space-y-8", className)}
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {children}
    </motion.div>
  );
}