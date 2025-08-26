"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";

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
    console.log(`[CANCEL] Starting cancellation for shift ${shiftId}`);
    
    try {
      const response = await fetch(`/api/shifts/${shiftId}/signup`, {
        method: "DELETE",
      });

      console.log(`[CANCEL] Response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = "Failed to cancel signup";
        let errorDetails = "";
        
        // Try to get the response text first
        const responseText = await response.text();
        console.log(`[CANCEL] Response text: ${responseText}`);
        
        // Then try to parse it as JSON
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || "";
        } catch (parseError) {
          console.error("[CANCEL] Response is not valid JSON:", responseText);
          errorMessage = `Failed to cancel signup (Status: ${response.status})`;
        }
        
        const fullError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
        throw new Error(fullError);
      }

      // Parse successful response
      try {
        const result = await response.json();
        console.log("[CANCEL] Signup canceled successfully:", result);
      } catch {
        console.warn("[CANCEL] Could not parse success response, but cancellation succeeded");
      }

      // Show success message
      toast.success("Shift signup canceled successfully");
      
      // Close dialog and refresh the page to show updated status
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("[CANCEL] Error canceling signup:", error);
      
      // Show error toast instead of alert
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel signup";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="cancel-shift-button" className="text-red-600 border-red-200 hover:bg-red-50">
          Cancel Shift Signup
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent data-testid="cancel-shift-dialog">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle data-testid="cancel-dialog-title">Cancel Shift Signup</ResponsiveDialogTitle>
          <ResponsiveDialogDescription data-testid="cancel-dialog-description">
            Are you sure you want to cancel your signup for &quot;{shiftName}
            &quot;? This action cannot be undone, but you may be able to sign up
            again if spots are still available.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
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
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
