import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  /** Actions that appear inline with the title on larger screens */
  actions?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function PageHeader({
  title,
  description,
  children,
  actions,
  className = "",
  "data-testid": dataTestId,
}: PageHeaderProps) {
  return (
    <div className={`${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1
            className="text-4xl sm:text-6xl italic font-bold bg-gradient-to-r from-primary to-primary-700 bg-clip-text text-transparent tracking-tighter"
            data-testid={dataTestId}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-lg text-muted-foreground mt-2"
              data-testid={
                dataTestId
                  ? `${dataTestId.replace("-heading", "")}-description`
                  : undefined
              }
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex-shrink-0 sm:mt-1">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
