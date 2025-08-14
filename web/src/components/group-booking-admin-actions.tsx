"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface GroupBookingAdminActionsProps {
  groupBookingId: string;
  status: string;
  groupName: string;
}

export function GroupBookingAdminActions({
  groupBookingId,
  status,
}: GroupBookingAdminActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const updateGroupStatus = async (newStatus: "CONFIRMED" | "CANCELED") => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/group-bookings/${groupBookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `${newStatus === "CONFIRMED" ? "Approved" : "Rejected"} by admin`,
        }),
      });

      if (response.ok) {
        // Refresh the page to show updated status
        router.refresh();
      } else {
        const error = await response.json();
        console.error("Failed to update group status:", error);
        // TODO: Show error toast/notification
      }
    } catch (error) {
      console.error("Error updating group status:", error);
      // TODO: Show error toast/notification
    } finally {
      setIsLoading(false);
    }
  };

  if (status !== "PENDING") {
    return (
      <Badge 
        variant="outline"
        className={`text-xs ${
          status === "CONFIRMED"
            ? "bg-green-50 text-green-700 border-green-200"
            : status === "CANCELED"
            ? "bg-red-50 text-red-700 border-red-200"
            : status === "PARTIAL"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : status === "WAITLISTED"
            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
            : "bg-gray-50 text-gray-700 border-gray-200"
        }`}
      >
        {status.toLowerCase()}
      </Badge>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="text-green-600 hover:bg-green-50 border-green-300"
        onClick={() => updateGroupStatus("CONFIRMED")}
        disabled={isLoading}
        data-testid={`approve-group-${groupBookingId}`}
      >
        {isLoading ? "..." : "Approve Group"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 hover:bg-red-50 border-red-300"
        onClick={() => updateGroupStatus("CANCELED")}
        disabled={isLoading}
        data-testid={`reject-group-${groupBookingId}`}
      >
        {isLoading ? "..." : "Reject Group"}
      </Button>
    </div>
  );
}