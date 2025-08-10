"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PolicyContent } from "@/components/markdown-content";
import { ProfileImageUpload } from "@/components/ui/profile-image-upload";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Calendar,
  Shield,
  MapPin,
  Bell,
  FileText,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

const daysOfWeek = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const pronounOptions = [
  { value: "none", label: "Prefer not to say" },
  { value: "she/her", label: "She/Her" },
  { value: "he/him", label: "He/Him" },
  { value: "they/them", label: "They/Them" },
  { value: "other", label: "Other" },
];

const notificationOptions = [
  { value: "EMAIL", label: "Email only" },
  { value: "SMS", label: "Text message only" },
  { value: "BOTH", label: "Both email and text" },
  { value: "NONE", label: "No notifications" },
];

const hearAboutUsOptions = [
  { value: "not_specified", label: "Select an option" },
  { value: "social_media", label: "Social Media" },
  { value: "friend_family", label: "Friend or Family" },
  { value: "website", label: "Website" },
  { value: "search_engine", label: "Search Engine" },
  { value: "community_event", label: "Community Event" },
  { value: "volunteer_center", label: "Volunteer Center" },
  { value: "other", label: "Other" },
];

export default function EditProfilePage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [volunteerAgreementOpen, setVolunteerAgreementOpen] = useState(false);
  const [healthSafetyPolicyOpen, setHealthSafetyPolicyOpen] = useState(false);
  const [volunteerAgreementContent, setVolunteerAgreementContent] =
    useState("");
  const [healthSafetyPolicyContent, setHealthSafetyPolicyContent] =
    useState("");
  const [locationOptions, setLocationOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const router = useRouter();
  const { toast } = useToast();

  // Load policy content and location options
  useEffect(() => {
    const loadPolicyContent = async () => {
      try {
        const [volunteerResponse, healthSafetyResponse] = await Promise.all([
          fetch("/content/volunteer-agreement.md"),
          fetch("/content/health-safety-policy.md"),
        ]);

        if (volunteerResponse.ok) {
          const volunteerText = await volunteerResponse.text();
          setVolunteerAgreementContent(volunteerText);
        }

        if (healthSafetyResponse.ok) {
          const healthSafetyText = await healthSafetyResponse.text();
          setHealthSafetyPolicyContent(healthSafetyText);
        }
      } catch (error) {
        console.error("Failed to load policy content:", error);
      }
    };

    const loadLocationOptions = async () => {
      try {
        const response = await fetch("/api/locations");
        if (response.ok) {
          const locations = await response.json();
          setLocationOptions(locations);
        } else {
          console.error("Failed to load locations");
          // Fallback to empty array if API fails
          setLocationOptions([]);
        }
      } catch (error) {
        console.error("Failed to load locations:", error);
        // Fallback to empty array if API fails
        setLocationOptions([]);
      }
    };

    loadPolicyContent();
    loadLocationOptions();
  }, []);

  // Initialize form data with URL parameters or defaults
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    pronouns: "none",
    profilePhotoUrl: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    medicalConditions: "",
    willingToProvideReference: false,
    howDidYouHearAboutUs: "not_specified",
    availableDays: [] as string[],
    availableLocations: [] as string[],
    emailNewsletterSubscription: true,
    notificationPreference: "EMAIL" as "EMAIL" | "SMS" | "BOTH" | "NONE",
    volunteerAgreementAccepted: false,
    healthSafetyPolicyAccepted: false,
  });

  // Load data from API on mount
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const profileData = await response.json();
          setFormData({
            firstName: profileData.firstName || "",
            lastName: profileData.lastName || "",
            email: profileData.email || "",
            phone: profileData.phone || "",
            dateOfBirth: profileData.dateOfBirth
              ? new Date(profileData.dateOfBirth).toISOString().split("T")[0]
              : "",
            pronouns: profileData.pronouns || "none",
            profilePhotoUrl: profileData.profilePhotoUrl || "",
            emergencyContactName: profileData.emergencyContactName || "",
            emergencyContactRelationship:
              profileData.emergencyContactRelationship || "",
            emergencyContactPhone: profileData.emergencyContactPhone || "",
            medicalConditions: profileData.medicalConditions || "",
            willingToProvideReference:
              profileData.willingToProvideReference || false,
            howDidYouHearAboutUs:
              profileData.howDidYouHearAboutUs || "not_specified",
            availableDays: profileData.availableDays || [],
            availableLocations: profileData.availableLocations || [],
            emailNewsletterSubscription:
              profileData.emailNewsletterSubscription !== false,
            notificationPreference:
              profileData.notificationPreference || "EMAIL",
            volunteerAgreementAccepted:
              profileData.volunteerAgreementAccepted || false,
            healthSafetyPolicyAccepted:
              profileData.healthSafetyPolicyAccepted || false,
          });
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
        toast({
          title: "Error loading profile",
          description:
            "Failed to load your profile data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfileData();
  }, []); // Removed toast from dependencies

  const sections = [
    {
      id: "personal",
      title: "Personal Information",
      description: "Basic personal details and contact information",
      icon: User,
      color: "bg-blue-500",
    },
    {
      id: "emergency",
      title: "Emergency Contact",
      description: "Emergency contact information for safety",
      icon: Phone,
      color: "bg-red-500",
    },
    {
      id: "medical",
      title: "Medical & References",
      description: "Medical conditions and reference willingness",
      icon: Shield,
      color: "bg-green-500",
    },
    {
      id: "availability",
      title: "Availability & Location",
      description: "When and where you can volunteer",
      icon: MapPin,
      color: "bg-purple-500",
    },
    {
      id: "communication",
      title: "Communication & Agreements",
      description: "Notification preferences and policy agreements",
      icon: Bell,
      color: "bg-orange-500",
    },
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setLoading(true);

    try {
      // Process form data to handle special placeholder values
      const processedData = {
        ...formData,
        pronouns: formData.pronouns === "none" ? null : formData.pronouns,
        howDidYouHearAboutUs:
          formData.howDidYouHearAboutUs === "not_specified"
            ? null
            : formData.howDidYouHearAboutUs,
      };

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      toast({
        title: "Profile saved successfully!",
        description: "Your changes have been saved.",
      });

      router.push("/profile");
    } catch (error) {
      toast({
        title: "Error updating profile",
        description:
          error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const handleLocationToggle = (location: string) => {
    setFormData((prev) => ({
      ...prev,
      availableLocations: prev.availableLocations.includes(location)
        ? prev.availableLocations.filter((l) => l !== location)
        : [...prev.availableLocations, location],
    }));
  };

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0: // Personal Information
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
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  placeholder="Your first name"
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  placeholder="Your last name"
                  disabled={loading}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your.email@example.com"
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
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
                  onChange={(e) =>
                    handleInputChange("dateOfBirth", e.target.value)
                  }
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
            <div className="space-y-2">
              <ProfileImageUpload
                currentImage={formData.profilePhotoUrl}
                onImageChange={(url: string | null) =>
                  handleInputChange("profilePhotoUrl", url)
                }
                disabled={loading}
                toast={toast}
                fallbackText={
                  formData.firstName && formData.lastName
                    ? `${formData.firstName.charAt(
                        0
                      )}${formData.lastName.charAt(0)}`.toUpperCase()
                    : "?"
                }
              />
            </div>
          </div>
        );

      case 1: // Emergency Contact
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">
                    Important
                  </h4>
                  <p className="text-sm text-amber-700">
                    This information is kept confidential and used only in case
                    of emergencies during volunteer activities.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="emergencyContactName"
                className="text-sm font-medium"
              >
                Emergency Contact Name
              </Label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) =>
                  handleInputChange("emergencyContactName", e.target.value)
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
                  handleInputChange(
                    "emergencyContactRelationship",
                    e.target.value
                  )
                }
                placeholder="e.g., Parent, Spouse, Sibling, Friend"
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="emergencyContactPhone"
                className="text-sm font-medium"
              >
                Emergency Contact Phone
              </Label>
              <Input
                id="emergencyContactPhone"
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={(e) =>
                  handleInputChange("emergencyContactPhone", e.target.value)
                }
                placeholder="(123) 456-7890"
                disabled={loading}
                className="h-11"
              />
            </div>
          </div>
        );

      case 2: // Medical & References
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="medicalConditions"
                className="text-sm font-medium"
              >
                Medical Conditions & Allergies
              </Label>
              <Textarea
                id="medicalConditions"
                value={formData.medicalConditions}
                onChange={(e) =>
                  handleInputChange("medicalConditions", e.target.value)
                }
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
                    handleInputChange(
                      "willingToProvideReference",
                      e.target.checked
                    )
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
                    References may be requested for certain volunteer positions
                    or activities.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="howDidYouHearAboutUs"
                className="text-sm font-medium"
              >
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

      case 3: // Availability & Preferences
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Typically available on days
                </Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Select the days you're generally available to volunteer. This
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
                    onClick={() => !loading && handleDayToggle(day.value)}
                  >
                    <input
                      type="checkbox"
                      id={`day-${day.value}`}
                      checked={formData.availableDays.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
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
                  Locations you are able to volunteer
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
                    onClick={() =>
                      !loading && handleLocationToggle(location.value)
                    }
                  >
                    <input
                      type="checkbox"
                      id={`location-${location.value}`}
                      checked={formData.availableLocations.includes(
                        location.value
                      )}
                      onChange={() => handleLocationToggle(location.value)}
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

      case 4: // Communication & Agreements
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/20">
                <input
                  type="checkbox"
                  id="emailNewsletterSubscription"
                  checked={formData.emailNewsletterSubscription}
                  onChange={(e) =>
                    handleInputChange(
                      "emailNewsletterSubscription",
                      e.target.checked
                    )
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
              <Label
                htmlFor="notificationPreference"
                className="text-sm font-medium"
              >
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
                Choose how you'd like to receive notifications about shift
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
                      handleInputChange(
                        "volunteerAgreementAccepted",
                        e.target.checked
                      )
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
                        I have read and agree with the
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
                              Please read the complete volunteer agreement
                              below.
                            </DialogDescription>
                          </DialogHeader>
                          <PolicyContent content={volunteerAgreementContent} />
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This agreement outlines your responsibilities and
                      expectations as a volunteer.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/20">
                  <input
                    type="checkbox"
                    id="healthSafetyPolicyAccepted"
                    checked={formData.healthSafetyPolicyAccepted}
                    onChange={(e) =>
                      handleInputChange(
                        "healthSafetyPolicyAccepted",
                        e.target.checked
                      )
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
                        I have read and agree with the
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
                            Health and Safety policy
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Health and Safety Policy</DialogTitle>
                            <DialogDescription>
                              Please read the complete health and safety policy
                              below.
                            </DialogDescription>
                          </DialogHeader>
                          <PolicyContent content={healthSafetyPolicyContent} />
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This policy ensures the safety and well-being of all
                      volunteers and participants.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Handle form changes for SelectField components
  useEffect(() => {
    const handleSelectChange = (name: string, value: string) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFormData = (e: CustomEvent) => {
      handleSelectChange(e.detail.name, e.detail.value);
    };

    window.addEventListener(
      "selectFieldChange",
      handleFormData as EventListener
    );
    return () =>
      window.removeEventListener(
        "selectFieldChange",
        handleFormData as EventListener
      );
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
        <PageHeader
          title="Edit Your Profile"
          description="Update your volunteer profile to help us provide you with the best possible experience. Your information is kept secure and confidential."
        >
          <div className="flex justify-start mt-6">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/profile">
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
              </Link>
            </Button>
          </div>
        </PageHeader>

        {initialLoading ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-muted-foreground">
                    Loading your profile...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Progress Indicator */}
            <div className="bg-white rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Profile Setup Progress
                </h2>
                <Badge variant="outline" className="text-xs">
                  Step {currentSection + 1} of {sections.length}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={section.id}
                      className={`flex-1 flex items-center ${
                        index === sections.length - 1 ? "grow-0" : ""
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 cursor-pointer hover:scale-105 ${
                          index === currentSection
                            ? `${section.color} text-white shadow-lg`
                            : index < currentSection
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={() => setCurrentSection(index)}
                        title={`Go to ${section.title}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {index < sections.length - 1 && (
                        <div
                          className={`flex-1 h-1 mx-2 rounded-full transition-all duration-200 ${
                            index < currentSection ? "bg-green-500" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center mb-4">
                <h3 className="font-medium text-foreground">
                  {sections[currentSection].title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {sections[currentSection].description}
                </p>
              </div>

              {/* Section Navigation Tabs */}
              <div className="flex flex-wrap gap-2 justify-center">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(index)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                      index === currentSection
                        ? "bg-primary text-white shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Content */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    {React.createElement(sections[currentSection].icon, {
                      className: "h-6 w-6",
                    })}
                    {sections[currentSection].title}
                  </CardTitle>
                  {/* Always visible save button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    size="sm"
                    className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="min-h-[400px]">{renderCurrentSection()}</div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevSection}
                      disabled={currentSection === 0 || loading}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex gap-3">
                      {currentSection < sections.length - 1 ? (
                        <Button
                          type="button"
                          onClick={nextSection}
                          disabled={loading}
                          className="flex items-center gap-2"
                        >
                          Next
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        >
                          <Save className="h-4 w-4" />
                          {loading ? "Saving..." : "Save Profile"}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
