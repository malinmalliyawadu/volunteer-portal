"use client";

import { Button } from "@/components/ui/button";

interface SignupActionsProps {
  signupId: string;
  status: "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELED";
}

export function SignupActions({ signupId, status }: SignupActionsProps) {
  // Validate signupId
  if (!signupId || signupId.trim() === '') {
    console.error('Invalid signupId provided to SignupActions:', signupId);
    return (
      <div className="text-red-600 text-sm">
        Invalid signup ID
      </div>
    );
  }

  const handleSignupAction = async (action: "approve" | "reject") => {
    try {
      console.log(`Processing ${action} for signup ID: ${signupId}`);
      
      const response = await fetch(`/api/admin/signups/${signupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully ${action}ed signup:`, result);
        window.location.reload(); // Refresh to show updated state
      } else {
        const error = await response.json();
        console.error(`Failed to ${action} signup:`, error);
        
        let errorMessage = error.error || "Failed to process signup";
        if (error.debug) {
          errorMessage += `\n\nDebug info: ${error.debug}`;
        }
        if (error.signupId) {
          errorMessage += `\nSignup ID: ${error.signupId}`;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Signup action error:", error);
      alert(`Network error while processing signup: ${error}`);
    }
  };

  if (status !== "PENDING") {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => handleSignupAction("approve")}
        className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
      >
        ✓ Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleSignupAction("reject")}
        className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50"
      >
        ✕ Reject
      </Button>
    </div>
  );
}
