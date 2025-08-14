import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  testId?: string;
}

/**
 * Consistent page container component that provides:
 * - Standard max-width (6xl) and centering
 * - Consistent spacing between sections (space-y-8)
 * - Optional animation and custom styling
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
  testId 
}: PageContainerProps) {
  return (
    <div 
      className={cn(
        "space-y-8",
        animate && "animate-fade-in",
        className
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}