"use client";

import { Button } from "@/components/ui/button";

interface SignupActionsProps {
  signupId: string;
  status: "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELED";
}

export function SignupActions({ signupId, status }: SignupActionsProps) {
  const handleSignupAction = async (action: "approve" | "reject") => {
    try {
      const response = await fetch(`/api/admin/signups/${signupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        window.location.reload(); // Refresh to show updated state
      } else {
        const error = await response.json();
        alert(error.error || "Failed to process signup");
      }
    } catch (error) {
      console.error("Signup action error:", error);
      alert("Failed to process signup");
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
