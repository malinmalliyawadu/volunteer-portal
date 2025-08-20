"use client";

import { motion } from "motion/react";
import { fadeVariants, slideUpVariants, staggerContainer } from "@/lib/motion";

interface AnimatedProps {
  children: React.ReactNode;
  className?: string;
}

// Animated wrapper for the home page
export function HomePageWrapper({ children, className }: AnimatedProps) {
  return (
    <motion.div
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated wrapper for hero section content
export function HeroContent({ children, className }: AnimatedProps) {
  return (
    <motion.div
      variants={slideUpVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated wrapper for feature cards
export function FeatureCard({ children, className, delay = 0 }: AnimatedProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.4, 0, 0.2, 1],
        delay 
      }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated wrapper for feature grid
export function FeatureGrid({ children, className }: AnimatedProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}