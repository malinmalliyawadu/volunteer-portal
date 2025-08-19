"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangleIcon, UserMinusIcon } from "lucide-react";
import { removeFriend } from "@/lib/friends-actions";

interface RemoveFriendButtonProps {
  friendId: string;
}

export function RemoveFriendButton({ friendId }: RemoveFriendButtonProps) {
  const [open, setOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const result = await removeFriend(friendId);
      if (result.success) {
        setOpen(false);
      }
      // Server Actions automatically revalidate the page, so no need for manual refresh
    } catch (error) {
      console.error("Failed to remove friend:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700"
          data-testid="remove-friend-trigger"
        >
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="remove-friend-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600" data-testid="remove-friend-dialog-title">
            <UserMinusIcon className="h-5 w-5" />
            Remove Friend
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this person from your friends list?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="text-sm">Removing this friend will:</p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                  <li>Remove them from your friends list</li>
                  <li>Remove you from their friends list</li>
                  <li>Hide your volunteer activity from each other (based on privacy settings)</li>
                </ul>
                <p className="text-sm">
                  You can send them a new friend request if you change your mind.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isRemoving}
            className="order-2 sm:order-1"
            data-testid="remove-friend-cancel-button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isRemoving}
            className="order-1 sm:order-2"
            data-testid="remove-friend-confirm-button"
          >
            {isRemoving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Removing...
              </>
            ) : (
              <>
                <UserMinusIcon className="h-4 w-4 mr-2" />
                Remove Friend
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}