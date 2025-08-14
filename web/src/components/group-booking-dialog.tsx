"use client";

import { useState } from "react";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Users, Mail, Check, AlertCircle, Clock, MapPin } from "lucide-react";

interface Shift {
  id: string;
  start: Date;
  end: Date;
  location: string | null;
  capacity: number;
  shiftType: {
    name: string;
    description: string | null;
  };
  signups: Array<{
    status: string;
  }>;
}

interface GroupBookingDialogProps {
  shifts: Shift[];
  date: string; // For display purposes
  location: string; // For display purposes
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function GroupBookingDialog({
  shifts,
  date,
  location,
  open,
  onOpenChange,
}: GroupBookingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [errors, setErrors] = useState<{
    shifts?: string;
    groupName?: string;
    emails?: string;
    general?: string;
  }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    
    if (!validateEmail(email)) {
      setErrors({ ...errors, emails: "Please enter a valid email address" });
      return;
    }
    
    if (memberEmails.includes(email)) {
      setErrors({ ...errors, emails: "Email already added" });
      return;
    }
    
    setMemberEmails([...memberEmails, email]);
    setNewEmail("");
    setErrors({ ...errors, emails: undefined });
  };

  const removeEmail = (emailToRemove: string) => {
    setMemberEmails(memberEmails.filter(email => email !== emailToRemove));
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (selectedShiftIds.length === 0) {
      newErrors.shifts = "Please select at least one shift";
    }
    
    if (!groupName.trim()) {
      newErrors.groupName = "Group name is required";
    }
    
    if (memberEmails.length === 0) {
      newErrors.emails = "At least one member email is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      // Create group bookings for all selected shifts
      const promises = selectedShiftIds.map(shiftId => 
        fetch(`/api/shifts/${shiftId}/group-booking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: groupName.trim(),
            description: description.trim() || undefined,
            memberEmails,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      // Check if any requests failed
      const failedResponses = responses.filter((r, i) => !r.ok);
      
      if (failedResponses.length === 0) {
        // All succeeded - refresh the page to show updated state
        window.location.reload();
      } else {
        // Some failed
        const errorMessages = results
          .filter((_, i) => !responses[i].ok)
          .map(r => r.error || "Failed to create group booking")
          .join(", ");
        setErrors({ general: `Some bookings failed: ${errorMessages}` });
      }
    } catch (error) {
      console.error("Group booking error:", error);
      setErrors({ general: "Failed to create group bookings. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedShiftIds([]);
    setGroupName("");
    setDescription("");
    setMemberEmails([]);
    setNewEmail("");
    setErrors({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="group-booking-dialog">
        <DialogHeader data-testid="group-booking-dialog-header">
          <DialogTitle className="flex items-center gap-2" data-testid="group-booking-dialog-title">
            <Users className="h-5 w-5 text-primary" />
            Create Group Booking
          </DialogTitle>
          <DialogDescription data-testid="group-booking-dialog-description">
            Create a group booking and invite friends, family, or colleagues to volunteer together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4" data-testid="group-booking-dialog-content">
          {/* Location and Date Header */}
          <div className="rounded-lg border p-4 bg-primary/5" data-testid="location-date-header">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">{location}</h3>
                <p className="text-sm text-muted-foreground">{date}</p>
              </div>
            </div>
          </div>

          {/* Shift Selection */}
          <div className="space-y-3" data-testid="shift-selection-section">
            <Label className="text-sm font-medium">
              Select Shifts *
            </Label>
            {errors.shifts && (
              <p className="text-sm text-red-600" data-testid="shifts-error">
                {errors.shifts}
              </p>
            )}
            <div className="space-y-3" data-testid="shift-checkbox-group">
              {shifts?.map((shift) => {
                const confirmedCount = shift.signups.filter(s => s.status === "CONFIRMED").length;
                const pendingCount = shift.signups.filter(s => s.status === "PENDING").length;
                const remaining = Math.max(0, shift.capacity - confirmedCount - pendingCount);
                const duration = getDurationInHours(shift.start, shift.end);
                const isSelected = selectedShiftIds.includes(shift.id);
                
                return (
                  <div
                    key={shift.id}
                    className={`relative flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                      isSelected ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                    }`}
                    data-testid={`shift-option-${shift.id}`}
                  >
                    <Checkbox
                      id={shift.id}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedShiftIds([...selectedShiftIds, shift.id]);
                        } else {
                          setSelectedShiftIds(selectedShiftIds.filter(id => id !== shift.id));
                        }
                      }}
                      className="mt-1"
                      disabled={remaining === 0}
                    />
                    <Label
                      htmlFor={shift.id}
                      className="flex-1 cursor-pointer space-y-2"
                    >
                      <div className="font-medium">{shift.shiftType.name}</div>
                      {shift.shiftType.description && (
                        <p className="text-sm text-muted-foreground">
                          {shift.shiftType.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(shift.start, "h:mm a")} - {format(shift.end, "h:mm a")}
                          </span>
                          <Badge variant="outline" className="text-xs ml-1">
                            {duration}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {confirmedCount + pendingCount}/{shift.capacity}
                            {remaining > 0 ? (
                              <span className="text-green-600 ml-1">
                                ({remaining} spots left)
                              </span>
                            ) : (
                              <span className="text-red-600 ml-1">(Full)</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Alert */}
          {errors.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4" data-testid="error-alert">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-2" data-testid="group-name-section">
            <Label htmlFor="groupName" className="text-sm font-medium">
              Group Name *
            </Label>
            <Input
              id="groupName"
              placeholder="e.g., Smith Family, Acme Corp Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={errors.groupName ? "border-red-300" : ""}
              data-testid="group-name-input"
            />
            {errors.groupName && (
              <p className="text-sm text-red-600" data-testid="group-name-error">
                {errors.groupName}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2" data-testid="group-description-section">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Tell your group members why you're volunteering together..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="group-description-input"
            />
          </div>

          {/* Member Emails */}
          <div className="space-y-3" data-testid="member-emails-section">
            <Label className="text-sm font-medium">
              Invite Members *
            </Label>
            
            {/* Add Email Input */}
            <div className="flex gap-2" data-testid="add-email-section">
              <Input
                placeholder="member@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                className="flex-1"
                data-testid="new-email-input"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addEmail}
                disabled={!newEmail.trim()}
                data-testid="add-email-button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {errors.emails && (
              <p className="text-sm text-red-600" data-testid="emails-error">
                {errors.emails}
              </p>
            )}

            {/* Email List */}
            {memberEmails.length > 0 && (
              <div className="space-y-2" data-testid="email-list">
                <p className="text-sm text-muted-foreground">
                  Members to invite ({memberEmails.length}):
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {memberEmails.map((email, index) => (
                    <div
                      key={email}
                      className="flex items-center justify-between bg-secondary/50 rounded-md p-2"
                      data-testid={`email-item-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{email}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmail(email)}
                        className="h-auto p-1"
                        data-testid={`remove-email-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-lg border p-4 bg-blue-50 border-blue-200" data-testid="info-box">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  How Group Bookings Work
                </p>
                <ul className="text-blue-700 space-y-1 text-xs">
                  <li>• You&apos;ll be added to each group automatically as the leader</li>
                  <li>• Invitation emails will be sent to all members</li>
                  <li>• Each person must accept and create/login to their account</li>
                  <li>• Separate group bookings will be created for each selected shift</li>
                  <li>• All groups will be reviewed by administrators</li>
                  <li>• Everyone gets individual confirmation once approved</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2" data-testid="group-booking-dialog-footer">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="group-booking-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedShiftIds.length === 0 || !groupName.trim() || memberEmails.length === 0}
            className="min-w-[140px]"
            data-testid="group-booking-create-button"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2" data-testid="group-booking-loading">
                <span className="animate-spin">⏳</span>
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Create Group
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}