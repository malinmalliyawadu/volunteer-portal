"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CancelSignupButtonProps {
  shiftId: string;
  shiftName: string;
}

export function CancelSignupButton({
  shiftId,
  shiftName,
}: CancelSignupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/shifts/${shiftId}/signup`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel signup");
      }

      // Close dialog and refresh the page to show updated status
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error canceling signup:", error);
      // You could add toast notification here for better UX
      alert(error instanceof Error ? error.message : "Failed to cancel signup");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="cancel-shift-button" className="text-red-600 border-red-200 hover:bg-red-50">
          Cancel Shift Signup
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="cancel-shift-dialog">
        <DialogHeader>
          <DialogTitle data-testid="cancel-dialog-title">Cancel Shift Signup</DialogTitle>
          <DialogDescription data-testid="cancel-dialog-description">
            Are you sure you want to cancel your signup for &quot;{shiftName}
            &quot;? This action cannot be undone, but you may be able to sign up
            again if spots are still available.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            data-testid="keep-signup-button"
          >
            Keep Signup
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid="confirm-cancel-button"
          >
            {isLoading ? "Canceling..." : "Cancel Signup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
