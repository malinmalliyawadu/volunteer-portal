"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PolicyContent } from "@/components/markdown-content";
import { ProfileImageUpload } from "@/components/ui/profile-image-upload";
import { UserPlus, Shield, FileText, ExternalLink } from "lucide-react";

// Shared constants
export const daysOfWeek = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export const pronounOptions = [
  { value: "none", label: "Prefer not to say" },
  { value: "she/her", label: "She/Her" },
  { value: "he/him", label: "He/Him" },
  { value: "they/them", label: "They/Them" },
  { value: "other", label: "Other" },
];

export const notificationOptions = [
  { value: "EMAIL", label: "Email only" },
  { value: "SMS", label: "Text message only" },
  { value: "BOTH", label: "Both email and text" },
  { value: "NONE", label: "No notifications" },
];

export const hearAboutUsOptions = [
  { value: "not_specified", label: "Select an option" },
  { value: "social_media", label: "Social Media" },
  { value: "friend_family", label: "Friend or Family" },
  { value: "website", label: "Website" },
  { value: "search_engine", label: "Search Engine" },
  { value: "community_event", label: "Community Event" },
  { value: "volunteer_center", label: "Volunteer Center" },
  { value: "other", label: "Other" },
];

export interface UserProfileFormData {
  // Basic account info (for registration only)
  email?: string;
  password?: string;
  confirmPassword?: string;

  // Personal information
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  pronouns: string;
  profilePhotoUrl?: string;

  // Emergency contact
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;

  // Medical & references
  medicalConditions: string;
  willingToProvideReference: boolean;
  howDidYouHearAboutUs: string;

  // Availability
  availableDays: string[];
  availableLocations: string[];

  // Communication & agreements
  emailNewsletterSubscription: boolean;
  notificationPreference: "EMAIL" | "SMS" | "BOTH" | "NONE";
  volunteerAgreementAccepted: boolean;
  healthSafetyPolicyAccepted: boolean;
}

export interface UserProfileFormProps {
  formData: UserProfileFormData;
  onInputChange: (field: string, value: string | boolean) => void;
  onDayToggle: (day: string) => void;
  onLocationToggle: (location: string) => void;
  loading: boolean;
  isRegistration?: boolean;
  locationOptions: Array<{ value: string; label: string }>;
  toast?: (options: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
}

/**
 * Account creation step for registration
 */
export function AccountStep({
  formData,
  onInputChange,
  loading,
}: {
  formData: UserProfileFormData;
  onInputChange: (field: string, value: string | boolean) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6" data-testid="account-step">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" data-testid="welcome-message">
        <div className="flex items-start space-x-3">
          <UserPlus className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">
              Welcome to Everybody Eats!
            </h4>
            <p className="text-sm text-blue-700">
              Create your volunteer account to start making a difference in your
              community.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2" data-testid="email-field">
        <Label htmlFor="email" className="text-sm font-medium">
          Email Address *
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email || ""}
          onChange={(e) => onInputChange("email", e.target.value)}
          placeholder="your.email@example.com"
          disabled={loading}
          className="h-11"
          required
          data-testid="email-input"
        />
      </div>

      <div className="space-y-2" data-testid="password-field">
        <Label htmlFor="password" className="text-sm font-medium">
          Password *
        </Label>
        <Input
          id="password"
          type="password"
          value={formData.password || ""}
          onChange={(e) => onInputChange("password", e.target.value)}
          placeholder="Create a secure password"
          disabled={loading}
          className="h-11"
          required
          data-testid="password-input"
        />
        <p className="text-xs text-muted-foreground" data-testid="password-hint">
          Password must be at least 6 characters long
        </p>
      </div>

      <div className="space-y-2" data-testid="confirm-password-field">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm Password *
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword || ""}
          onChange={(e) => onInputChange("confirmPassword", e.target.value)}
          placeholder="Confirm your password"
          disabled={loading}
          className="h-11"
          required
          data-testid="confirm-password-input"
        />
      </div>
    </div>
  );
}

/**
 * Personal information step
 */
export function PersonalInfoStep({
  formData,
  onInputChange,
  loading,
  isRegistration = false,
  toast,
}: {
  formData: UserProfileFormData;
  onInputChange: (field: string, value: string | boolean) => void;
  loading: boolean;
  isRegistration?: boolean;
  toast?: (options: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium">
            First Name *
          </Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => onInputChange("firstName", e.target.value)}
            placeholder="Your first name"
            disabled={loading}
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Last Name *
          </Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => onInputChange("lastName", e.target.value)}
            placeholder="Your last name"
            disabled={loading}
            className="h-11"
            required
          />
        </div>
      </div>

      {!isRegistration && (
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => onInputChange("email", e.target.value)}
            placeholder="your.email@example.com"
            disabled={loading}
            className="h-11"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium">
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => onInputChange("phone", e.target.value)}
          placeholder="(123) 456-7890"
          disabled={loading}
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="text-sm font-medium">
            Date of Birth
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => onInputChange("dateOfBirth", e.target.value)}
            disabled={loading}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pronouns" className="text-sm font-medium">
            Pronouns
          </Label>
          <SelectField
            name="pronouns"
            id="pronouns"
            options={pronounOptions}
            defaultValue={formData.pronouns}
            disabled={loading}
          />
        </div>
      </div>

      {!isRegistration && (
        <div className="space-y-2">
          <ProfileImageUpload
            currentImage={formData.profilePhotoUrl}
            onImageChange={(url: string | null) =>
              onInputChange("profilePhotoUrl", url || "")
            }
            disabled={loading}
            toast={toast}
            fallbackText={
              formData.firstName && formData.lastName
                ? `${formData.firstName.charAt(0)}${formData.lastName.charAt(
                    0
                  )}`.toUpperCase()
                : "?"
            }
          />
        </div>
      )}
    </div>
  );
}

/**
 * Emergency contact step
 */
export function EmergencyContactStep({
  formData,
  onInputChange,
  loading,
}: {
  formData: UserProfileFormData;
  onInputChange: (field: string, value: string | boolean) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-800">Important</h4>
            <p className="text-sm text-amber-700">
              This information is kept confidential and used only in case of
              emergencies during volunteer activities.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergencyContactName" className="text-sm font-medium">
          Emergency Contact Name
        </Label>
        <Input
          id="emergencyContactName"
          value={formData.emergencyContactName}
          onChange={(e) =>
            onInputChange("emergencyContactName", e.target.value)
          }
          placeholder="Full name of emergency contact"
          disabled={loading}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="emergencyContactRelationship"
          className="text-sm font-medium"
        >
          Relationship
        </Label>
        <Input
          id="emergencyContactRelationship"
          value={formData.emergencyContactRelationship}
          onChange={(e) =>
            onInputChange("emergencyContactRelationship", e.target.value)
          }
          placeholder="e.g., Parent, Spouse, Sibling, Friend"
          disabled={loading}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergencyContactPhone" className="text-sm font-medium">
          Emergency Contact Phone
        </Label>
        <Input
          id="emergencyContactPhone"
          type="tel"
          value={formData.emergencyContactPhone}
          onChange={(e) =>
            onInputChange("emergencyContactPhone", e.target.value)
          }
          placeholder="(123) 456-7890"
          disabled={loading}
          className="h-11"
        />
      </div>
    </div>
  );
}

/**
 * Medical information and references step
 */
export function MedicalInfoStep({
  formData,
  onInputChange,
  loading,
}: {
  formData: UserProfileFormData;
  onInputChange: (field: string, value: string | boolean) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="medicalConditions" className="text-sm font-medium">
          Medical Conditions & Allergies
        </Label>
        <Textarea
          id="medicalConditions"
          value={formData.medicalConditions}
          onChange={(e) => onInputChange("medicalConditions", e.target.value)}
          placeholder="Please list any medical conditions, allergies, or dietary restrictions that may be relevant to your volunteer work. Leave blank if none."
          disabled={loading}
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          This information helps us ensure your safety and accommodate any
          special needs.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/20">
          <input
            type="checkbox"
            id="willingToProvideReference"
            checked={formData.willingToProvideReference}
            onChange={(e) =>
              onInputChange("willingToProvideReference", e.target.checked)
            }
            disabled={loading}
            className="h-4 w-4 mt-1"
          />
          <div>
            <Label
              htmlFor="willingToProvideReference"
              className="text-sm font-medium"
            >
              I am willing to provide references if requested
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              References may be requested for certain volunteer positions or
              activities.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="howDidYouHearAboutUs" className="text-sm font-medium">
          How did you hear about us?
        </Label>
        <SelectField
          name="howDidYouHearAboutUs"
          id="howDidYouHearAboutUs"
          options={hearAboutUsOptions}
          defaultValue={formData.howDidYouHearAboutUs}
          disabled={loading}
        />
      </div>
    </div>
  );
}

/**
 * Availability selection step
 */
export function AvailabilityStep({
  formData,
  onDayToggle,
  onLocationToggle,
  loading,
  locationOptions,
}: {
  formData: UserProfileFormData;
  onDayToggle: (day: string) => void;
  onLocationToggle: (location: string) => void;
  loading: boolean;
  locationOptions: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Days you&apos;re typically available
          </Label>
          <p className="text-xs text-muted-foreground mb-4">
            Select the days you&apos;re generally available to volunteer. This
            helps us match you with suitable shifts.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {daysOfWeek.map((day) => (
            <div
              key={day.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.availableDays.includes(day.value)
                  ? "bg-primary/10 border-primary"
                  : "bg-background border-border hover:bg-muted/50"
              }`}
              onClick={() => !loading && onDayToggle(day.value)}
            >
              <input
                type="checkbox"
                id={`day-${day.value}`}
                checked={formData.availableDays.includes(day.value)}
                onChange={() => onDayToggle(day.value)}
                disabled={loading}
                className="h-4 w-4"
              />
              <Label
                htmlFor={`day-${day.value}`}
                className="text-sm font-medium cursor-pointer"
              >
                {day.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Locations where you can volunteer
          </Label>
          <p className="text-xs text-muted-foreground mb-4">
            Choose the locations where you can volunteer. You can select
            multiple options.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {locationOptions.map((location) => (
            <div
              key={location.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.availableLocations.includes(location.value)
                  ? "bg-primary/10 border-primary"
                  : "bg-background border-border hover:bg-muted/50"
              }`}
              onClick={() => !loading && onLocationToggle(location.value)}
            >
              <input
                type="checkbox"
                id={`location-${location.value}`}
                checked={formData.availableLocations.includes(location.value)}
                onChange={() => onLocationToggle(location.value)}
                disabled={loading}
                className="h-4 w-4"
              />
              <Label
                htmlFor={`location-${location.value}`}
                className="text-sm font-medium cursor-pointer"
              >
                {location.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Communication preferences and agreements step
 */
export function CommunicationStep({
  formData,
  onInputChange,
  loading,
  volunteerAgreementContent,
  healthSafetyPolicyContent,
  volunteerAgreementOpen,
  setVolunteerAgreementOpen,
  healthSafetyPolicyOpen,
  setHealthSafetyPolicyOpen,
}: {
  formData: UserProfileFormData;
  onInputChange: (field: string, value: string | boolean) => void;
  loading: boolean;
  volunteerAgreementContent: string;
  healthSafetyPolicyContent: string;
  volunteerAgreementOpen: boolean;
  setVolunteerAgreementOpen: (open: boolean) => void;
  healthSafetyPolicyOpen: boolean;
  setHealthSafetyPolicyOpen: (open: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/20">
          <input
            type="checkbox"
            id="emailNewsletterSubscription"
            checked={formData.emailNewsletterSubscription}
            onChange={(e) =>
              onInputChange("emailNewsletterSubscription", e.target.checked)
            }
            disabled={loading}
            className="h-4 w-4 mt-1"
          />
          <div>
            <Label
              htmlFor="emailNewsletterSubscription"
              className="text-sm font-medium"
            >
              Subscribe to email newsletter
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Stay updated with news, events, and volunteer opportunities.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notificationPreference" className="text-sm font-medium">
          Receive shift notifications by
        </Label>
        <SelectField
          name="notificationPreference"
          id="notificationPreference"
          options={notificationOptions}
          defaultValue={formData.notificationPreference}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Choose how you&apos;d like to receive notifications about shift
          updates and reminders.
        </p>
      </div>

      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Required Agreements
        </h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/20">
            <input
              type="checkbox"
              id="volunteerAgreementAccepted"
              checked={formData.volunteerAgreementAccepted}
              onChange={(e) =>
                onInputChange("volunteerAgreementAccepted", e.target.checked)
              }
              disabled={loading}
              className="h-4 w-4 mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Label
                  htmlFor="volunteerAgreementAccepted"
                  className="text-sm font-medium cursor-pointer"
                >
                  I have read and agree with the *
                </Label>
                <Dialog
                  open={volunteerAgreementOpen}
                  onOpenChange={setVolunteerAgreementOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm font-medium text-primary underline"
                    >
                      Volunteer Agreement
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Volunteer Agreement</DialogTitle>
                      <DialogDescription>
                        Please read the complete volunteer agreement below.
                      </DialogDescription>
                    </DialogHeader>
                    <PolicyContent content={volunteerAgreementContent} />
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This agreement outlines your responsibilities and expectations
                as a volunteer.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/20">
            <input
              type="checkbox"
              id="healthSafetyPolicyAccepted"
              checked={formData.healthSafetyPolicyAccepted}
              onChange={(e) =>
                onInputChange("healthSafetyPolicyAccepted", e.target.checked)
              }
              disabled={loading}
              className="h-4 w-4 mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Label
                  htmlFor="healthSafetyPolicyAccepted"
                  className="text-sm font-medium cursor-pointer"
                >
                  I have read and agree with the *
                </Label>
                <Dialog
                  open={healthSafetyPolicyOpen}
                  onOpenChange={setHealthSafetyPolicyOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm font-medium text-primary underline"
                    >
                      Health and Safety Policy
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Health and Safety Policy</DialogTitle>
                      <DialogDescription>
                        Please read the complete health and safety policy below.
                      </DialogDescription>
                    </DialogHeader>
                    <PolicyContent content={healthSafetyPolicyContent} />
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This policy ensures the safety and well-being of all volunteers
                and participants.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
