"use client";

import { motion, AnimatePresence, Variants } from "motion/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Enhanced stagger container with day-level transition handling
const enhancedStaggerContainer: Variants = {
  hidden: {
    transition: {
      staggerChildren: 0.02, // Faster exit stagger for group effect
      staggerDirection: -1,
    },
  },
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03, // Very quick group exit
      staggerDirection: 1, // Exit in forward order
    },
  },
};

// Enhanced stagger item with coordinated group exit animations
const createStaggerItemVariants = (index: number): Variants => ({
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: index % 2 === 0 ? -80 : 80, // Shorter distance for coordinated group exit
    y: -10, // Slight upward movement for polish
    scale: 0.9,
    transition: {
      duration: 0.3, // Faster exit for group cohesion
      ease: [0.4, 0, 1, 1],
    },
  },
});
import { format } from "date-fns";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Users,
  Mail,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Star,
  Award,
} from "lucide-react";
import { VolunteerActions } from "@/components/volunteer-actions";
import { getShiftTheme } from "@/lib/shift-themes";

interface Shift {
  id: string;
  start: Date;
  end: Date;
  location: string;
  capacity: number;
  shiftType: {
    id: string;
    name: string;
  };
  signups: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      volunteerGrade: string | null;
      profilePhotoUrl: string | null;
    };
  }>;
  groupBookings: Array<{
    signups: Array<{
      status: string;
    }>;
  }>;
}

interface AnimatedShiftCardsProps {
  shifts: Shift[];
}

function getStaffingStatus(confirmed: number, capacity: number) {
  const percentage = (confirmed / capacity) * 100;
  if (percentage >= 100)
    return { color: "bg-green-500", text: "Fully Staffed", icon: CheckCircle2 };
  if (percentage >= 75)
    return { color: "bg-green-400", text: "Well Staffed", icon: CheckCircle2 };
  if (percentage >= 50)
    return { color: "bg-yellow-500", text: "Needs More", icon: AlertCircle };
  if (percentage >= 25)
    return {
      color: "bg-orange-500",
      text: "Understaffed",
      icon: AlertTriangle,
    };
  return { color: "bg-red-500", text: "Critical", icon: AlertTriangle };
}

function getGradeInfo(grade: string | null | undefined) {
  switch (grade) {
    case "PINK":
      return {
        color: "bg-pink-100 text-pink-700",
        icon: Award,
        label: "Shift Leader",
      };
    case "YELLOW":
      return {
        color: "bg-yellow-100 text-yellow-700",
        icon: Star,
        label: "Experienced",
      };
    case "GREEN":
      return {
        color: "bg-green-100 text-green-700",
        icon: Shield,
        label: "Standard",
      };
    default:
      return { color: "bg-blue-100 text-blue-700", icon: null, label: "New" };
  }
}

export function AnimatedShiftCards({ shifts }: AnimatedShiftCardsProps) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 items-start"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={enhancedStaggerContainer}
    >
      <AnimatePresence mode="popLayout">
        {shifts.map((shift, index) => {
          const confirmed = shift.signups.filter(
            (s) => s.status === "CONFIRMED"
          ).length;
          const pending = shift.signups.filter(
            (s) => s.status === "PENDING" || s.status === "REGULAR_PENDING"
          ).length;
          const waitlisted = shift.signups.filter(
            (s) => s.status === "WAITLISTED"
          ).length;
          const staffingStatus = getStaffingStatus(confirmed, shift.capacity);

          // Count volunteer grades
          const gradeCount = {
            pink: shift.signups.filter((s) => s.user.volunteerGrade === "PINK")
              .length,
            yellow: shift.signups.filter(
              (s) => s.user.volunteerGrade === "YELLOW"
            ).length,
            green: shift.signups.filter(
              (s) => s.user.volunteerGrade === "GREEN"
            ).length,
            new: shift.signups.filter((s) => !s.user.volunteerGrade).length,
          };

          const shiftTheme = getShiftTheme(shift.shiftType.name);

          return (
            <motion.div
              key={shift.id}
              layout
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={createStaggerItemVariants(index)}
              className="w-full"
            >
              <Card
                data-testid={`shift-card-${shift.id}`}
                className={`border-2 ${shiftTheme.borderColor} w-full relative overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300`}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${shiftTheme.gradient} opacity-5`}
                />

                <CardContent className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{shiftTheme.emoji}</span>
                        <h3
                          className={`font-bold text-lg ${shiftTheme.textColor} mb-0`}
                        >
                          {shift.shiftType.name}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-700 font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(shift.start, "h:mm a")} -{" "}
                        {format(shift.end, "h:mm a")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        data-testid={`shift-capacity-${shift.id}`}
                        className={`${staffingStatus.color} text-white text-sm px-2 py-1.5 font-bold`}
                      >
                        {confirmed}/{shift.capacity}
                      </Badge>
                      <p className="text-xs text-slate-600 mt-1">
                        {staffingStatus.text}
                      </p>
                    </div>
                  </div>

                  {/* Grade Summary Bar */}
                  {shift.signups.length > 0 && (
                    <div
                      data-testid={`grade-summary-${shift.id}`}
                      className="flex flex-wrap gap-1 mb-3"
                    >
                      {gradeCount.pink > 0 && (
                        <div
                          data-testid={`grade-pink-badge-${shift.id}`}
                          className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium"
                        >
                          <Award className="h-3 w-3" />
                          {gradeCount.pink}
                        </div>
                      )}
                      {gradeCount.yellow > 0 && (
                        <div
                          data-testid={`grade-yellow-badge-${shift.id}`}
                          className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium"
                        >
                          <Star className="h-3 w-3" />
                          {gradeCount.yellow}
                        </div>
                      )}
                      {gradeCount.green > 0 && (
                        <div
                          data-testid={`grade-green-badge-${shift.id}`}
                          className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                        >
                          <Shield className="h-3 w-3" />
                          {gradeCount.green}
                        </div>
                      )}
                      {gradeCount.new > 0 && (
                        <div
                          data-testid={`grade-new-badge-${shift.id}`}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                        >
                          <Users className="h-3 w-3" />
                          {gradeCount.new} new
                        </div>
                      )}
                      {pending > 0 && (
                        <div
                          data-testid={`pending-badge-${shift.id}`}
                          className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium ml-auto"
                        >
                          <Clock className="h-3 w-3" />
                          {pending} pending
                        </div>
                      )}
                      {waitlisted > 0 && (
                        <div
                          data-testid={`waitlisted-badge-${shift.id}`}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                        >
                          <Users className="h-3 w-3" />
                          {waitlisted} waitlisted
                        </div>
                      )}
                    </div>
                  )}

                  {/* Volunteer Avatars */}
                  <div
                    data-testid={`volunteer-list-${shift.id}`}
                    className="space-y-2"
                  >
                    {shift.signups.length === 0 ? (
                      <div
                        data-testid={`no-volunteers-${shift.id}`}
                        className="py-6 text-center"
                      >
                        <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          No volunteers yet
                        </p>
                      </div>
                    ) : (
                      <div
                        data-testid={`volunteers-${shift.id}`}
                        className="space-y-2"
                      >
                        {shift.signups.map((signup) => {
                          const gradeInfo = getGradeInfo(
                            signup.user.volunteerGrade
                          );
                          const GradeIcon = gradeInfo.icon;
                          return (
                            <div
                              key={signup.id}
                              className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg min-w-0"
                            >
                              <Link
                                href={`/admin/volunteers/${signup.user.id}`}
                                className="flex-shrink-0"
                              >
                                <Avatar className="h-9 w-9 border-2 border-white shadow-md hover:shadow-lg transition-shadow">
                                  <AvatarImage
                                    src={
                                      signup.user.profilePhotoUrl || undefined
                                    }
                                    alt={
                                      signup.user.name ||
                                      `${signup.user.firstName} ${signup.user.lastName}` ||
                                      "Volunteer"
                                    }
                                  />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-xs">
                                    {(signup.user.name ||
                                      signup.user
                                        .firstName)?.[0]?.toUpperCase() || "V"}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/admin/volunteers/${signup.user.id}`}
                                  className="text-sm font-medium text-slate-900 truncate hover:text-blue-600 mb-1 block"
                                >
                                  {signup.user.name ||
                                    `${signup.user.firstName || ""} ${
                                      signup.user.lastName || ""
                                    }`.trim() ||
                                    "Volunteer"}
                                </Link>
                                <div className="flex items-center justify-between gap-2">
                                  <div
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${gradeInfo.color} flex-shrink-0`}
                                  >
                                    {GradeIcon && (
                                      <GradeIcon className="h-3 w-3" />
                                    )}
                                    {gradeInfo.label}
                                  </div>
                                  <div className="flex-shrink-0">
                                    <VolunteerActions
                                      signupId={signup.id}
                                      currentStatus={signup.status}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Shortage Action Button */}
                  {(staffingStatus.text === "Critical" ||
                    staffingStatus.text === "Understaffed") && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                        data-testid={`send-shortage-email-${shift.id}`}
                      >
                        <Link
                          href={`/admin/notifications?shiftId=${shift.id}&shiftType=${shift.shiftType.id}&location=${shift.location}`}
                          className="flex items-center gap-2 justify-center"
                        >
                          <Mail className="h-4 w-4" />
                          Send Shortage Email
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
