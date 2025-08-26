"use client";

import { useState } from "react";
import { SignupActions } from "./signup-actions";
import { Badge } from "@/components/ui/badge";

interface SignupActionsWrapperProps {
  signupId: string;
  initialStatus: "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELED";
  volunteerName: string;
}

export function SignupActionsWrapper({ signupId, initialStatus, volunteerName }: SignupActionsWrapperProps) {
  const [status, setStatus] = useState<"PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELED">(initialStatus);

  const handleStatusChange = (newStatus: "CONFIRMED" | "WAITLISTED" | "CANCELED", message?: string) => {
    setStatus(newStatus);
  };

  const getStatusBadge = () => {
    switch (status) {
      case "CONFIRMED":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Confirmed
          </Badge>
        );
      case "WAITLISTED":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Waitlisted
          </Badge>
        );
      case "CANCELED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Canceled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium truncate">{volunteerName}</span>
        {getStatusBadge()}
      </div>
      <div className="flex justify-start sm:justify-end md:justify-start">
        <SignupActions 
          signupId={signupId} 
          status={status} 
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}