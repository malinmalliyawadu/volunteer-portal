import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = ({ title, description, variant = "default" }: ToastOptions) => {
    const message = description ? `${title}\n${description}` : title;

    if (variant === "destructive") {
      sonnerToast.error(title, description ? { description } : undefined);
    } else {
      sonnerToast.success(title, description ? { description } : undefined);
    }
  };

  return { toast };
}
