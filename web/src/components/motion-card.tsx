"use client";

import * as React from "react";
import { motion } from "motion/react";
import { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardAction, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { cardHoverVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface MotionCardProps extends React.ComponentProps<"div"> {
  enableMotion?: boolean;
  hoverEffect?: boolean;
}

/**
 * Motion-enhanced Card component
 * Adds hover lift animation while maintaining all Card functionality
 */
function MotionCard({ 
  enableMotion = true,
  hoverEffect = true,
  className,
  children,
  ...props 
}: MotionCardProps) {
  if (!enableMotion || !hoverEffect) {
    return <Card className={className} {...props}>{children}</Card>;
  }

  return (
    <motion.div
      variants={cardHoverVariants}
      initial="rest"
      animate="rest"
      whileHover="hover"
    >
      <Card className={className} {...props}>
        {children}
      </Card>
    </motion.div>
  );
}

// Export all the card components for easy migration
export {
  MotionCard,
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};