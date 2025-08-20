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
  return (
    <Card
      as={motion.div as any}
      variants={staggerItem}
      className={cn(className)}
      {...props}
    >
      {children}
    </Card>
  );
}