"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Mail, MessageSquare } from "lucide-react";
import { sendFriendRequest } from "@/lib/friends-actions";

interface SendFriendRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendFriendRequestForm({
  open,
  onOpenChange,
}: SendFriendRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await sendFriendRequest(formData);

      if (result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
        // Clear form by reloading the component
        const form = document.getElementById(
          "friend-request-form"
        ) as HTMLFormElement;
        form?.reset();
      }
    } catch (error) {
      console.error(error);
      setError("An error occurred while sending the friend request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setError("");
    const form = document.getElementById(
      "friend-request-form"
    ) as HTMLFormElement;
    form?.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="send-friend-request-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Send Friend Request</span>
          </DialogTitle>
        </DialogHeader>

        <form
          id="friend-request-form"
          action={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Address</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="friend@example.com"
              required
              data-testid="friend-request-email-input"
            />
            <p className="text-sm text-gray-600">
              Enter the email address of the person you&apos;d like to add as a
              friend.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Personal Message (Optional)</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Hey! Would love to volunteer together sometime. Let's be friends on the portal!"
              rows={3}
              maxLength={500}
              data-testid="friend-request-message-input"
            />
            <p className="text-sm text-gray-600">
              Add a personal message to your friend request (max 500
              characters).
            </p>
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200 rounded-md p-3"
              data-testid="friend-request-error"
            >
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="friend-request-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="friend-request-submit-button"
            >
              {isSubmitting ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
