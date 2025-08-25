"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoBox } from "@/components/ui/info-box";
import { MotionSpinner } from "@/components/motion-spinner";

interface ShiftSignupDialogProps {
  shift: {
    id: string;
    start: Date;
    end: Date;
    location: string | null;
    capacity: number;
    shiftType: {
      name: string;
      description: string | null;
    };
  };
  confirmedCount: number;
  isWaitlist?: boolean;
  children: React.ReactNode; // The trigger button
}

function getDurationInHours(start: Date, end: Date): string {
  const durationMs = end.getTime() - start.getTime();
  const hours = durationMs / (1000 * 60 * 60);
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}m`;
}

export function ShiftSignupDialog({
  shift,
  confirmedCount,
  isWaitlist = false,
  children,
}: ShiftSignupDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const duration = getDurationInHours(shift.start, shift.end);
  const remaining = Math.max(0, shift.capacity - confirmedCount);

  const handleSignup = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (isWaitlist) {
        formData.append("waitlist", "1");
      }

      const response = await fetch(`/api/shifts/${shift.id}/signup`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Refresh the page to show updated state
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to sign up");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Failed to sign up. Please try again.");
    } finally {
      setIsSubmitting(false);
      setOpen(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild data-testid="shift-signup-trigger">{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-md" data-testid="shift-signup-dialog">
        <ResponsiveDialogHeader data-testid="shift-signup-dialog-header">
          <ResponsiveDialogTitle className="flex items-center gap-2" data-testid="shift-signup-dialog-title">
            {isWaitlist ? "🎯 Join Waitlist" : "✨ Confirm Signup"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription data-testid="shift-signup-dialog-description">
            {isWaitlist
              ? "Join the waitlist for this shift. You'll be notified if a spot becomes available."
              : "Please confirm that you want to sign up for this volunteer shift."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4" data-testid="shift-signup-dialog-content-body">
          {/* Shift Details */}
          <div className="rounded-lg border p-4 bg-muted/50" data-testid="shift-details-section">
            <h3 className="font-semibold text-lg mb-2" data-testid="shift-details-name">
              {shift.shiftType.name}
            </h3>

            {shift.shiftType.description && (
              <p className="text-sm text-muted-foreground mb-3" data-testid="shift-details-description">
                {shift.shiftType.description}
              </p>
            )}

            <div className="space-y-2 text-sm" data-testid="shift-details-info">
              <div className="flex items-center gap-2" data-testid="shift-details-date">
                <span className="font-medium">📅 Date:</span>
                <span>{format(shift.start, "EEEE, dd MMMM yyyy")}</span>
              </div>
              <div className="flex items-center gap-2" data-testid="shift-details-time">
                <span className="font-medium">🕐 Time:</span>
                <span>
                  {format(shift.start, "h:mm a")} -{" "}
                  {format(shift.end, "h:mm a")}
                </span>
                <Badge variant="outline" className="text-xs" data-testid="shift-details-duration">
                  {duration}
                </Badge>
              </div>
              {shift.location && (
                <div className="flex items-center gap-2" data-testid="shift-details-location">
                  <span className="font-medium">📍 Location:</span>
                  <span>{shift.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2" data-testid="shift-details-capacity">
                <span className="font-medium">👥 Capacity:</span>
                <span>
                  {confirmedCount}/{shift.capacity} confirmed
                  {!isWaitlist && remaining > 0 && (
                    <span className="text-green-600 ml-1">
                      ({remaining} spots left)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Approval Process Info */}
          <InfoBox
            title={isWaitlist ? "Waitlist Process" : "Approval Required"}
            testId="approval-process-info"
          >
            <p>
              {isWaitlist
                ? "You'll be added to the waitlist and notified by email if a spot becomes available and you're approved."
                : "Your signup will be reviewed by an administrator. You'll receive an email confirmation if you're approved for this shift."}
            </p>
          </InfoBox>
        </div>

        <ResponsiveDialogFooter className="flex gap-2" data-testid="shift-signup-dialog-footer">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
            data-testid="shift-signup-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSignup}
            disabled={isSubmitting}
            className="min-w-[120px]"
            data-testid="shift-signup-confirm-button"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2" data-testid="shift-signup-loading-text">
                <MotionSpinner className="w-4 h-4" />
                {isWaitlist ? "Joining..." : "Signing up..."}
              </span>
            ) : isWaitlist ? (
              "🎯 Join Waitlist"
            ) : (
              "✨ Confirm Signup"
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
