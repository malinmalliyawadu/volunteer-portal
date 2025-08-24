"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  UserPlus,
  User,
  Phone,
  Shield,
  FileText,
  Check,
  AlertCircle,
  Camera,
} from "lucide-react";
import {
  AccountStep,
  PersonalInfoStep,
  EmergencyContactStep,
  MedicalInfoStep,
  AvailabilityStep,
  CommunicationStep,
  UserProfileFormData,
} from "@/components/forms/user-profile-form";
import { MotionSpinner } from "@/components/motion-spinner";
import { MotionCard } from "@/components/motion-card";
import { safeParseAvailability } from "@/lib/parse-availability";
import { ProfileImageUpload } from "@/components/ui/profile-image-upload";

// Extend the form data to include profile image requirement for migration
interface MigrationFormData extends UserProfileFormData {
  profilePhotoUrl?: string;
}

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  medicalConditions?: string | null;
  availableDays?: string | null;
  availableLocations?: string | null;
}

interface MigrationRegistrationFormProps {
  user: User;
  token: string;
}

/**
 * Migration registration form that reuses components from the main registration flow
 * Eliminates duplication by leveraging existing form steps and validation logic
 */
export function MigrationRegistrationForm({
  user,
  token,
}: MigrationRegistrationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [locationOptions, setLocationOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [volunteerAgreementContent, setVolunteerAgreementContent] = useState("");
  const [healthSafetyPolicyContent, setHealthSafetyPolicyContent] = useState("");
  const [volunteerAgreementOpen, setVolunteerAgreementOpen] = useState(false);
  const [healthSafetyPolicyOpen, setHealthSafetyPolicyOpen] = useState(false);

  // Initialize form data with migrated user information
  const [formData, setFormData] = useState<MigrationFormData>({
    // Account info - email is pre-filled and password needs to be set
    email: user.email,
    password: "",
    confirmPassword: "",

    // Personal information - pre-filled from migrated data
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    phone: user.phone || "",
    dateOfBirth: user.dateOfBirth
      ? new Date(user.dateOfBirth).toISOString().split("T")[0]
      : "",
    pronouns: "none",

    // Emergency contact - pre-filled if available
    emergencyContactName: user.emergencyContactName || "",
    emergencyContactRelationship: user.emergencyContactRelationship || "",
    emergencyContactPhone: user.emergencyContactPhone || "",

    // Medical & references - pre-filled if available
    medicalConditions: user.medicalConditions || "",
    willingToProvideReference: false,
    howDidYouHearAboutUs: "not_specified", // Will be set to "migration" on submit

    // Availability - safely parse from JSON or text format
    availableDays: user.availableDays
      ? safeParseAvailability(user.availableDays)
      : [],
    availableLocations: user.availableLocations
      ? safeParseAvailability(user.availableLocations)
      : [],

    // Communication & agreements
    emailNewsletterSubscription: true,
    notificationPreference: "EMAIL",
    volunteerAgreementAccepted: false,
    healthSafetyPolicyAccepted: false,
    
    // Profile image (required for migration)
    profilePhotoUrl: undefined,
  });

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
          setLocationOptions([]);
        }
      } catch (error) {
        console.error("Failed to load locations:", error);
        setLocationOptions([]);
      }
    };

    loadPolicyContent();
    loadLocationOptions();
  }, []);

  // Define steps with migration-specific configuration
  const steps = [
    {
      id: "personal",
      title: "Review Your Information",
      description: "Verify your migrated details",
      icon: User,
      color: "bg-blue-500",
    },
    {
      id: "emergency",
      title: "Emergency Contact",
      description: "Confirm emergency contact",
      icon: Phone,
      color: "bg-red-500",
    },
    {
      id: "medical",
      title: "Medical & Availability",
      description: "Update health info and schedule",
      icon: Shield,
      color: "bg-orange-500",
    },
    {
      id: "photo",
      title: "Profile Photo",
      description: "Upload your profile photo",
      icon: Camera,
      color: "bg-purple-500",
    },
    {
      id: "account",
      title: "Set Password",
      description: "Create your account password",
      icon: UserPlus,
      color: "bg-green-500",
    },
    {
      id: "agreements",
      title: "Final Steps",
      description: "Review and accept policies",
      icon: FileText,
      color: "bg-indigo-500",
    },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (base64Image: string | null) => {
    setFormData((prev) => ({ ...prev, profilePhotoUrl: base64Image || undefined }));
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

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Personal info
        if (!formData.firstName || !formData.lastName) {
          toast({
            title: "Required fields missing",
            description: "Please provide your first and last name",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 1: // Emergency contact
        if (
          !formData.emergencyContactName ||
          !formData.emergencyContactRelationship ||
          !formData.emergencyContactPhone
        ) {
          toast({
            title: "Required fields missing",
            description: "Please provide complete emergency contact information",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 3: // Photo upload
        if (!formData.profilePhotoUrl) {
          toast({
            title: "Profile photo required",
            description: "Please upload a profile photo to continue",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 4: // Account setup
        if (!formData.password || !formData.confirmPassword) {
          toast({
            title: "Required fields missing",
            description: "Please set a password for your account",
            variant: "destructive",
          });
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Passwords don't match",
            description: "Please ensure both password fields match",
            variant: "destructive",
          });
          return false;
        }
        if (formData.password.length < 6) {
          toast({
            title: "Password too short",
            description: "Password must be at least 6 characters long",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 5: // Agreements
        if (
          !formData.volunteerAgreementAccepted ||
          !formData.healthSafetyPolicyAccepted
        ) {
          toast({
            title: "Agreements required",
            description: "Please accept all required agreements to continue",
            variant: "destructive",
          });
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validate current step
    if (!validateCurrentStep()) {
      return;
    }

    // If not on final step, move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // Final submission
    setLoading(true);

    try {
      // Prepare data for submission
      const processedData = {
        ...formData,
        pronouns: formData.pronouns === "none" ? null : formData.pronouns,
        howDidYouHearAboutUs: "migration", // Mark as migration user
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        migrationToken: token, // Include migration token
      };

      // Use the unified registration endpoint with migration flag
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...processedData,
          isMigration: true,
          userId: user.id, // Include user ID for update instead of create
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }

      toast({
        title: "Registration completed!",
        description: "Your account has been successfully migrated. Signing you in...",
      });

      // Auto sign-in after successful migration
      const signInResult = await signIn("credentials", {
        email: user.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/dashboard");
      } else {
        router.push("/login?message=migration-complete");
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description:
          error instanceof Error ? error.message : "Failed to complete registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Personal info
        return (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                We&apos;ve pre-filled your information from the previous system.
                Please review and update as needed.
              </AlertDescription>
            </Alert>
            <PersonalInfoStep
              formData={formData}
              onInputChange={handleInputChange}
              loading={loading}
              isRegistration={true}
            />
          </div>
        );
      case 1: // Emergency contact
        return (
          <EmergencyContactStep
            formData={formData}
            onInputChange={handleInputChange}
            loading={loading}
          />
        );
      case 2: // Medical & Availability
        return (
          <div className="space-y-8">
            <MedicalInfoStep
              formData={formData}
              onInputChange={handleInputChange}
              loading={loading}
            />
            <div className="border-t pt-8">
              <AvailabilityStep
                formData={formData}
                onDayToggle={handleDayToggle}
                onLocationToggle={handleLocationToggle}
                loading={loading}
                locationOptions={locationOptions}
              />
            </div>
          </div>
        );
      case 3: // Photo upload
        return (
          <div className="space-y-6">
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Please upload a profile photo. This helps other volunteers recognize you during shifts.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <ProfileImageUpload
                currentImage={formData.profilePhotoUrl}
                onImageChange={handleImageChange}
                disabled={loading}
                size="lg"
                fallbackText={`${formData.firstName} ${formData.lastName}`.trim()}
              />
            </div>
          </div>
        );
      case 4: // Account setup
        return (
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Create a secure password for your new account.
                Your email address ({user.email}) will be your username.
              </AlertDescription>
            </Alert>
            <AccountStep
              formData={formData}
              onInputChange={handleInputChange}
              loading={loading}
              hideEmail={true} // Hide email field since it's pre-filled
            />
          </div>
        );
      case 5: // Agreements
        return (
          <CommunicationStep
            formData={formData}
            onInputChange={handleInputChange}
            loading={loading}
            volunteerAgreementContent={volunteerAgreementContent}
            healthSafetyPolicyContent={healthSafetyPolicyContent}
            volunteerAgreementOpen={volunteerAgreementOpen}
            setVolunteerAgreementOpen={setVolunteerAgreementOpen}
            healthSafetyPolicyOpen={healthSafetyPolicyOpen}
            setHealthSafetyPolicyOpen={setHealthSafetyPolicyOpen}
          />
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
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Migration Progress</h2>
          <Badge variant="outline" className="text-xs">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex-1 flex items-center ${
                  index === steps.length - 1 ? "grow-0" : ""
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                    index === currentStep
                      ? `${step.color} text-white shadow-lg`
                      : index < currentStep
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all duration-200 ${
                      index < currentStep ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <h3 className="font-medium text-foreground">
            {steps[currentStep].title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <MotionCard className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-xl">
            {React.createElement(steps[currentStep].icon, {
              className: "h-6 w-6",
            })}
            {steps[currentStep].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="min-h-[400px]">{renderCurrentStep()}</div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0 || loading}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <GradientButton
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <MotionSpinner size="sm" color="white" />
                    {currentStep === steps.length - 1
                      ? "Completing Migration..."
                      : "Processing..."}
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Complete Migration
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </GradientButton>
            </div>
          </form>
        </CardContent>
      </MotionCard>
    </div>
  );
}