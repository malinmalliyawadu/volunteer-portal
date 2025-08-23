"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, User, Shield, Heart, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import React from "react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string;
  availableDays?: string;
  availableLocations?: string;
}

interface MigrationRegistrationFormProps {
  user: User;
  token: string;
}

export function MigrationRegistrationForm({
  user,
  token,
}: MigrationRegistrationFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    phone: user.phone || "",
    dateOfBirth: user.dateOfBirth
      ? new Date(user.dateOfBirth).toISOString().split("T")[0]
      : "",
    pronouns: "",
    password: "",
    confirmPassword: "",
    emergencyContactName: user.emergencyContactName || "",
    emergencyContactRelationship: user.emergencyContactRelationship || "",
    emergencyContactPhone: user.emergencyContactPhone || "",
    medicalConditions: user.medicalConditions || "",
    willingToProvideReference: false,
    howDidYouHearAboutUs: "Legacy system migration",
    availableDays: user.availableDays || "",
    availableLocations: user.availableLocations || "",
    emailNewsletterSubscription: true,
    volunteerAgreementAccepted: false,
    healthSafetyPolicyAccepted: false,
  });

  const steps = [
    { id: "personal", title: "Personal Info", icon: User },
    { id: "emergency", title: "Emergency Contact", icon: Heart },
    { id: "security", title: "Security", icon: Shield },
    { id: "agreements", title: "Agreements", icon: CheckCircle },
  ];

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Personal info
        return !!(formData.firstName && formData.lastName);
      case 1: // Emergency contact
        return !!(
          formData.emergencyContactName &&
          formData.emergencyContactRelationship &&
          formData.emergencyContactPhone
        );
      case 2: // Security
        return !!(
          formData.password &&
          formData.confirmPassword &&
          formData.password === formData.confirmPassword &&
          formData.password.length >= 8
        );
      case 3: // Agreements
        return (
          formData.volunteerAgreementAccepted &&
          formData.healthSafetyPolicyAccepted
        );
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } else {
      toast.error("Please complete all required fields before continuing");
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const result = await response.json();
      toast.success("Registration completed successfully!");

      // Sign in the user automatically
      const signInResult = await signIn("credentials", {
        email: user.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/dashboard");
      } else {
        router.push("/login?message=Registration completed. Please sign in.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error instanceof Error ? error.message : "Registration failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted
                      ? "bg-green-100 border-green-500 text-green-700"
                      : isActive
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-gray-100 border-gray-300 text-gray-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      isCompleted ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(steps[currentStep].icon, {
              className: "h-5 w-5",
            })}
            {steps[currentStep].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 0: Personal Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  We've pre-filled your information from the previous system.
                  Please review and update as needed.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      updateFormData("firstName", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      updateFormData("dateOfBirth", e.target.value)
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pronouns">Pronouns (optional)</Label>
                <Input
                  id="pronouns"
                  placeholder="e.g., they/them, she/her, he/him"
                  value={formData.pronouns}
                  onChange={(e) => updateFormData("pronouns", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 1: Emergency Contact */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Alert>
                <Heart className="h-4 w-4" />
                <AlertDescription>
                  Emergency contact information is required for all volunteers.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="emergencyContactName">
                  Emergency Contact Name *
                </Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) =>
                    updateFormData("emergencyContactName", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="emergencyContactRelationship">
                  Relationship *
                </Label>
                <Input
                  id="emergencyContactRelationship"
                  placeholder="e.g., Spouse, Parent, Sibling, Friend"
                  value={formData.emergencyContactRelationship}
                  onChange={(e) =>
                    updateFormData(
                      "emergencyContactRelationship",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="emergencyContactPhone">
                  Emergency Contact Phone *
                </Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) =>
                    updateFormData("emergencyContactPhone", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="medicalConditions">
                  Medical Conditions or Allergies
                </Label>
                <Textarea
                  id="medicalConditions"
                  placeholder="Please list any medical conditions, allergies, or other health information we should be aware of..."
                  value={formData.medicalConditions}
                  onChange={(e) =>
                    updateFormData("medicalConditions", e.target.value)
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Security */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Create a secure password for your new account. Your password
                  must be at least 8 characters long.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      updateFormData("confirmPassword", e.target.value)
                    }
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {formData.password !== formData.confirmPassword &&
                formData.confirmPassword && (
                  <Alert>
                    <AlertDescription>Passwords do not match.</AlertDescription>
                  </Alert>
                )}

              {formData.password && formData.password.length < 8 && (
                <Alert>
                  <AlertDescription>
                    Password must be at least 8 characters long.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Agreements */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Please review and accept the following agreements to complete
                  your registration.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="volunteerAgreement"
                    checked={formData.volunteerAgreementAccepted}
                    onCheckedChange={(checked) =>
                      updateFormData("volunteerAgreementAccepted", checked)
                    }
                    required
                  />
                  <Label
                    htmlFor="volunteerAgreement"
                    className="text-sm leading-relaxed"
                  >
                    I agree to the volunteer terms and conditions, and
                    understand my responsibilities as an Everybody Eats
                    volunteer. *
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="healthSafetyPolicy"
                    checked={formData.healthSafetyPolicyAccepted}
                    onCheckedChange={(checked) =>
                      updateFormData("healthSafetyPolicyAccepted", checked)
                    }
                    required
                  />
                  <Label
                    htmlFor="healthSafetyPolicy"
                    className="text-sm leading-relaxed"
                  >
                    I have read and agree to follow the health and safety
                    policies. *
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="emailNewsletter"
                    checked={formData.emailNewsletterSubscription}
                    onCheckedChange={(checked) =>
                      updateFormData("emailNewsletterSubscription", checked)
                    }
                  />
                  <Label
                    htmlFor="emailNewsletter"
                    className="text-sm leading-relaxed"
                  >
                    I would like to receive email newsletters and updates about
                    volunteer opportunities.
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="willingToProvideReference"
                    checked={formData.willingToProvideReference}
                    onCheckedChange={(checked) =>
                      updateFormData("willingToProvideReference", checked)
                    }
                  />
                  <Label
                    htmlFor="willingToProvideReference"
                    className="text-sm leading-relaxed"
                  >
                    I am willing to provide a reference if requested.
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!validateStep(currentStep) || isSubmitting}
              >
                {isSubmitting
                  ? "Completing Registration..."
                  : "Complete Registration"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
