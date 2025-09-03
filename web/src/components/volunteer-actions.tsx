"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, UserMinus, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VolunteerActionsProps {
  signupId: string;
  currentStatus: string;
  onUpdate?: () => void;
}

export function VolunteerActions({ signupId, currentStatus, onUpdate }: VolunteerActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const router = useRouter();

  const handleAction = async (action: "approve" | "reject" | "cancel" | "confirm") => {
    setLoading(action);
    setDialogOpen(null);
    
    try {
      const response = await fetch(`/api/admin/signups/${signupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} signup`);
      }

      router.refresh();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(`Error ${action}ing signup:`, error);
      alert(`Failed to ${action} signup. Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  const getDialogContent = (action: string) => {
    switch (action) {
      case "cancel":
        return {
          title: "Cancel Volunteer Shift",
          description: "Are you sure you want to cancel this volunteer's shift? They will be notified by email and the slot will become available for others.",
          actionText: "Cancel Shift",
          variant: "destructive" as const,
        };
      case "confirm":
        return {
          title: "Confirm Waitlisted Volunteer", 
          description: "Are you sure you want to confirm this waitlisted volunteer? This will allow going over the shift capacity.",
          actionText: "Confirm Volunteer",
          variant: "default" as const,
        };
      case "reject":
        return {
          title: "Reject Volunteer Signup",
          description: "Are you sure you want to reject this volunteer's signup? This action cannot be undone.",
          actionText: "Reject Signup",
          variant: "destructive" as const,
        };
      default:
        return {
          title: "Confirm Action",
          description: "Are you sure you want to proceed?",
          actionText: "Confirm",
          variant: "default" as const,
        };
    }
  };

  if (currentStatus === "CONFIRMED") {
    const dialogContent = getDialogContent("cancel");
    
    return (
      <div className="flex gap-1">
        <div className="flex items-center text-xs text-green-600 font-medium">
          <Check className="h-3 w-3 mr-1" />
          Confirmed
        </div>
        <Dialog open={dialogOpen === "cancel"} onOpenChange={(open) => setDialogOpen(open ? "cancel" : null)}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              disabled={loading === "cancel"}
              title="Cancel this shift"
            >
              {loading === "cancel" ? (
                <Clock className="h-3 w-3 animate-spin" />
              ) : (
                <UserMinus className="h-3 w-3" />
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {dialogContent.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                {dialogContent.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(null)}
                disabled={loading === "cancel"}
              >
                Cancel
              </Button>
              <Button
                variant={dialogContent.variant}
                onClick={() => handleAction("cancel")}
                disabled={loading === "cancel"}
              >
                {loading === "cancel" ? (
                  <Clock className="h-3 w-3 animate-spin mr-2" />
                ) : null}
                {dialogContent.actionText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (currentStatus === "WAITLISTED") {
    const dialogContent = getDialogContent("confirm");
    
    return (
      <div className="flex gap-1">
        <div className="flex items-center text-xs text-purple-600 font-medium">
          <Clock className="h-3 w-3 mr-1" />
          Waitlisted
        </div>
        <Dialog open={dialogOpen === "confirm"} onOpenChange={(open) => setDialogOpen(open ? "confirm" : null)}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              disabled={loading === "confirm"}
              title="Confirm this volunteer (allows over-capacity)"
            >
              {loading === "confirm" ? (
                <Clock className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                {dialogContent.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                {dialogContent.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(null)}
                disabled={loading === "confirm"}
              >
                Cancel
              </Button>
              <Button
                variant={dialogContent.variant}
                onClick={() => handleAction("confirm")}
                disabled={loading === "confirm"}
              >
                {loading === "confirm" ? (
                  <Clock className="h-3 w-3 animate-spin mr-2" />
                ) : null}
                {dialogContent.actionText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (currentStatus === "CANCELED") {
    return (
      <div className="flex items-center text-xs text-red-600 font-medium">
        <X className="h-3 w-3 mr-1" />
        Canceled
      </div>
    );
  }

  // For PENDING or REGULAR_PENDING status, show action buttons
  const rejectDialogContent = getDialogContent("reject");
  
  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
        onClick={() => handleAction("approve")}
        disabled={loading === "approve"}
      >
        {loading === "approve" ? (
          <Clock className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>
      
      <Dialog open={dialogOpen === "reject"} onOpenChange={(open) => setDialogOpen(open ? "reject" : null)}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            disabled={loading === "reject"}
          >
            {loading === "reject" ? (
              <Clock className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {rejectDialogContent.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {rejectDialogContent.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(null)}
              disabled={loading === "reject"}
            >
              Cancel
            </Button>
            <Button
              variant={rejectDialogContent.variant}
              onClick={() => handleAction("reject")}
              disabled={loading === "reject"}
            >
              {loading === "reject" ? (
                <Clock className="h-3 w-3 animate-spin mr-2" />
              ) : null}
              {rejectDialogContent.actionText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}