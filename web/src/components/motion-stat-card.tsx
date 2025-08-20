"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface MotionStatCardProps extends React.ComponentProps<typeof Card> {
  children: React.ReactNode;
}

/**
 * Motion-enhanced Card specifically for dashboard stats
 * Combines Card component with stagger animation
 */
export function MotionStatCard({ children, className, ...props }: MotionStatCardProps) {
  const MotionCard = motion(Card);
  
  return (
    <MotionCard
      variants={staggerItem}
      className={cn(className)}
      {...props}
    >
      {children}
    </MotionCard>
  );
}