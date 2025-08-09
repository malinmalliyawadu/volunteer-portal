// Simple toast implementation using browser alerts
// This can be enhanced with a proper toast library later

type ToastVariant = "default" | "destructive";

interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  const toast = ({ title, description, variant = "default" }: ToastProps) => {
    const message = description ? `${title}\n${description}` : title;

    if (variant === "destructive") {
      alert(`Error: ${message}`);
    } else {
      alert(message);
    }
  };

  return { toast };
}
