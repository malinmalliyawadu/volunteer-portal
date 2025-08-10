import { prisma } from "@/lib/prisma";
import { format, formatDistanceToNow } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { InviteUserDialog } from "@/components/invite-user-dialog";
import { UserRoleToggle } from "@/components/user-role-toggle";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Calendar,
  Shield,
  Filter,
  ChevronRight,
} from "lucide-react";

interface AdminUsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type UserWithStats = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  role: "ADMIN" | "VOLUNTEER";
  createdAt: Date;
  _count: {
    signups: number;
  };
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: "ADMIN" | "VOLUNTEER" } | undefined)
    ?.role;

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/users");
  }
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  // Get search and filter parameters
  const searchQuery = Array.isArray(params.search)
    ? params.search[0]
    : params.search;
  const roleFilter = Array.isArray(params.role) ? params.role[0] : params.role;

  // Build where clause for filtering
  const whereClause: any = {};

  if (searchQuery) {
    whereClause.OR = [
      { email: { contains: searchQuery, mode: "insensitive" } },
      { name: { contains: searchQuery, mode: "insensitive" } },
      { firstName: { contains: searchQuery, mode: "insensitive" } },
      { lastName: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  if (roleFilter && (roleFilter === "ADMIN" || roleFilter === "VOLUNTEER")) {
    whereClause.role = roleFilter;
  }

  // Fetch users with signup counts
  const [users, totalUsers, totalAdmins, totalVolunteers, newUsersThisMonth] =
    await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          profilePhotoUrl: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              signups: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "VOLUNTEER" } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

  function getUserInitials(user: UserWithStats): string {
    if (user.name) {
      return user.name
        .split(" ")
        .map((name) => name.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase();
    }
    if (user.firstName || user.lastName) {
      return `${user.firstName?.charAt(0) || ""}${
        user.lastName?.charAt(0) || ""
      }`.toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  }

  function getDisplayName(user: UserWithStats): string {
    if (user.name) return user.name;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email;
  }

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title="User Management"
          description="Manage volunteers, administrators, and invite new users to the platform."
        >
          <div className="mt-6 flex flex-col gap-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{totalUsers}</div>
                      <div className="text-sm text-muted-foreground">
                        Total Users
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {totalVolunteers}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Volunteers
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{totalAdmins}</div>
                      <div className="text-sm text-muted-foreground">
                        Admins
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <UserPlus className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {newUsersThisMonth}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        New This Month
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6 bg-card-bg rounded-xl border border-border">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <form method="GET" className="contents">
                    <input
                      type="text"
                      name="search"
                      placeholder="Search users..."
                      defaultValue={searchQuery || ""}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {roleFilter && (
                      <input type="hidden" name="role" value={roleFilter} />
                    )}
                  </form>
                </div>

                {/* Role Filter */}
                <div className="flex gap-2">
                  <Link
                    href={{
                      pathname: "/admin/users",
                      query: searchQuery ? { search: searchQuery } : {},
                    }}
                  >
                    <Button
                      variant={!roleFilter ? "default" : "outline"}
                      size="sm"
                      className={!roleFilter ? "btn-primary" : ""}
                    >
                      All Roles
                    </Button>
                  </Link>
                  <Link
                    href={{
                      pathname: "/admin/users",
                      query: {
                        role: "VOLUNTEER",
                        ...(searchQuery ? { search: searchQuery } : {}),
                      },
                    }}
                  >
                    <Button
                      variant={
                        roleFilter === "VOLUNTEER" ? "default" : "outline"
                      }
                      size="sm"
                      className={
                        roleFilter === "VOLUNTEER" ? "btn-primary" : ""
                      }
                    >
                      Volunteers
                    </Button>
                  </Link>
                  <Link
                    href={{
                      pathname: "/admin/users",
                      query: {
                        role: "ADMIN",
                        ...(searchQuery ? { search: searchQuery } : {}),
                      },
                    }}
                  >
                    <Button
                      variant={roleFilter === "ADMIN" ? "default" : "outline"}
                      size="sm"
                      className={roleFilter === "ADMIN" ? "btn-primary" : ""}
                    >
                      Admins
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Invite User Button */}
              <InviteUserDialog>
                <Button className="btn-primary gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite User
                </Button>
              </InviteUserDialog>
            </div>
          </div>
        </PageHeader>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
              {(searchQuery || roleFilter) && (
                <Badge variant="outline" className="ml-2">
                  <Filter className="h-3 w-3 mr-1" />
                  {searchQuery
                    ? `"${searchQuery}"`
                    : roleFilter
                    ? roleFilter.toLowerCase()
                    : "filtered"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No users found
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || roleFilter
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by inviting your first user."}
                </p>
                {!searchQuery && !roleFilter && (
                  <InviteUserDialog>
                    <Button className="btn-primary gap-2">
                      <UserPlus className="h-4 w-4" />
                      Invite First User
                    </Button>
                  </InviteUserDialog>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user: UserWithStats) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={user.profilePhotoUrl || ""}
                          alt={getDisplayName(user)}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">
                            {getDisplayName(user)}
                          </h3>
                          <Badge
                            variant={
                              user.role === "ADMIN" ? "default" : "secondary"
                            }
                            className={
                              user.role === "ADMIN"
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }
                          >
                            {user.role === "ADMIN" ? "Admin" : "Volunteer"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <span>{user.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Joined{" "}
                              {formatDistanceToNow(user.createdAt, {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="text-center">
                          <div className="font-medium text-foreground">
                            {user._count.signups}
                          </div>
                          <div>Shifts</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <UserRoleToggle
                        userId={user.id}
                        currentRole={user.role}
                      />
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Link href={`/admin/volunteers/${user.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
