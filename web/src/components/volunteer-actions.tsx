"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";

interface VolunteerActionsProps {
  signupId: string;
  currentStatus: string;
  onUpdate?: () => void;
}

export function VolunteerActions({ signupId, currentStatus, onUpdate }: VolunteerActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleAction = async (action: "approve" | "reject" | "cancel" | "confirm") => {
    setLoading(action);
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

  if (currentStatus === "CONFIRMED") {
    return (
      <div className="flex gap-1">
        <div className="flex items-center text-xs text-green-600 font-medium">
          <Check className="h-3 w-3 mr-1" />
          Confirmed
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          onClick={() => handleAction("cancel")}
          disabled={loading === "cancel"}
          title="Cancel this shift"
        >
          {loading === "cancel" ? (
            <Clock className="h-3 w-3 animate-spin" />
          ) : (
            <UserMinus className="h-3 w-3" />
          )}
        </Button>
      </div>
    );
  }

  if (currentStatus === "WAITLISTED") {
    return (
      <div className="flex gap-1">
        <div className="flex items-center text-xs text-purple-600 font-medium">
          <Clock className="h-3 w-3 mr-1" />
          Waitlisted
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
          onClick={() => handleAction("confirm")}
          disabled={loading === "confirm"}
          title="Confirm this volunteer (allows over-capacity)"
        >
          {loading === "confirm" ? (
            <Clock className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
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
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
        onClick={() => handleAction("reject")}
        disabled={loading === "reject"}
      >
        {loading === "reject" ? (
          <Clock className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}