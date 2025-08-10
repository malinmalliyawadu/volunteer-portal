"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, User, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UserRoleToggleProps {
  userId: string;
  currentRole: "ADMIN" | "VOLUNTEER";
}

export function UserRoleToggle({ userId, currentRole }: UserRoleToggleProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const targetRole = currentRole === "ADMIN" ? "VOLUNTEER" : "ADMIN";

  const handleRoleChange = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: targetRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user role");
      }

      toast.success(`User role updated to ${targetRole.toLowerCase()}`);
      setOpen(false);

      // Refresh the page to show the updated role
      router.refresh();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update user role"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-8">
          {currentRole === "ADMIN" ? (
            <>
              <Shield className="h-3 w-3" />
              Admin
            </>
          ) : (
            <>
              <User className="h-3 w-3" />
              Volunteer
            </>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {targetRole === "ADMIN" ? (
              <Shield className="h-5 w-5 text-purple-600" />
            ) : (
              <User className="h-5 w-5 text-blue-600" />
            )}
            Change User Role
          </DialogTitle>
          <DialogDescription>
            {targetRole === "ADMIN" ? (
              <>
                You're about to promote this user to{" "}
                <strong>Administrator</strong>. Administrators have full access
                to manage users, shifts, and system settings.
              </>
            ) : (
              <>
                You're about to change this user's role to{" "}
                <strong>Volunteer</strong>. They will lose administrative
                privileges and only be able to sign up for shifts.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Current Role:</span>
              <Badge
                variant={currentRole === "ADMIN" ? "default" : "secondary"}
                className={
                  currentRole === "ADMIN"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }
              >
                {currentRole === "ADMIN" ? (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Administrator
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Volunteer
                  </>
                )}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">New Role:</span>
              <Badge
                variant={targetRole === "ADMIN" ? "default" : "secondary"}
                className={
                  targetRole === "ADMIN"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }
              >
                {targetRole === "ADMIN" ? (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Administrator
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Volunteer
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRoleChange}
            disabled={isLoading}
            className={
              targetRole === "ADMIN"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "btn-primary"
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                {targetRole === "ADMIN" ? (
                  <Shield className="h-4 w-4 mr-2" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                Change to {targetRole === "ADMIN" ? "Admin" : "Volunteer"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
