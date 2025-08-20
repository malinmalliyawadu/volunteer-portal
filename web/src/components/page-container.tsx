import { cn } from "@/lib/utils";
import { MotionPageContainer } from "@/components/motion-page-container";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  [key: string]: unknown; // Allow arbitrary props like data-testid
}

/**
 * Consistent page container component that provides:
 * - Standard max-width (6xl) and centering
 * - Consistent spacing between sections (space-y-8)
 * - Motion.dev animations instead of CSS animations
 * 
 * Usage:
 * <PageContainer>
 *   <PageHeader title="..." />
 *   <section>...</section>
 * </PageContainer>
 */
export function PageContainer({ 
  children, 
  className,
  animate = true,
  ...props
}: PageContainerProps) {
  return (
    <MotionPageContainer
      className={cn("space-y-8", className)}
      animate={animate}
      {...props}
    >
      {children}
    </MotionPageContainer>
  );
}