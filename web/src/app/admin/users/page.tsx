import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
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
  X,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { PageContainer } from "@/components/page-container";

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
  const role = session?.user?.role;

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
  const whereClause: Prisma.UserWhereInput = {};

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
    <PageContainer testid="admin-users-page">
      <PageHeader
        title="User Management"
        description="Manage volunteers, administrators, and invite new users to the platform."
        actions={
          <InviteUserDialog>
            <Button
              size="sm"
              className="btn-primary gap-2"
              data-testid="invite-user-button"
            >
              <UserPlus className="h-4 w-4" />
              Invite User
            </Button>
          </InviteUserDialog>
        }
      />

      {/* Quick Stats */}
      <section className="mb-8" data-testid="stats-section">
        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6"
          data-testid="user-stats-grid"
        >
          <Card
            className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300"
            data-testid="total-users-stat"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div
                    className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                    data-testid="total-users-count"
                  >
                    {totalUsers}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    Total Users
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300"
            data-testid="volunteers-stat"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div
                    className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                    data-testid="volunteers-count"
                  >
                    {totalVolunteers}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    Volunteers
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300"
            data-testid="admins-stat"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div
                    className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                    data-testid="admins-count"
                  >
                    {totalAdmins}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    Admins
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300"
            data-testid="new-users-stat"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div
                    className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                    data-testid="new-users-count"
                  >
                    {newUsersThisMonth}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    New This Month
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Filters */}
      <section className="mb-8" data-testid="filters-section">
        <Card className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Filter className="h-4 w-4 text-white" />
                </div>
                <span className="text-slate-800">Filters & Search</span>
              </CardTitle>
              {(searchQuery || roleFilter) && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-slate-700 gap-1"
                  data-testid="clear-filters-button"
                >
                  <Link href="/admin/users">
                    <X className="h-3 w-3" />
                    Clear all filters
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <form
                    method="GET"
                    className="contents"
                    data-testid="search-form"
                  >
                    <input
                      type="text"
                      name="search"
                      placeholder="Search users..."
                      defaultValue={searchQuery || ""}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm transition-all"
                      data-testid="search-input"
                    />
                    {roleFilter && (
                      <input type="hidden" name="role" value={roleFilter} />
                    )}
                  </form>
                </div>

                {/* Role Filter */}
                <div className="flex gap-2" data-testid="role-filter-buttons">
                  <Link
                    href={{
                      pathname: "/admin/users",
                      query: searchQuery ? { search: searchQuery } : {},
                    }}
                  >
                    <Button
                      variant={!roleFilter ? "default" : "outline"}
                      size="sm"
                      className={
                        !roleFilter
                          ? "btn-primary shadow-sm"
                          : "hover:bg-slate-50"
                      }
                      data-testid="filter-all-roles"
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
                        roleFilter === "VOLUNTEER"
                          ? "btn-primary shadow-sm"
                          : "hover:bg-slate-50"
                      }
                      data-testid="filter-volunteers"
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
                      className={
                        roleFilter === "ADMIN"
                          ? "btn-primary shadow-sm"
                          : "hover:bg-slate-50"
                      }
                      data-testid="filter-admins"
                    >
                      Admins
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Users List */}
      <section data-testid="users-section">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2
              className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
              data-testid="users-table-title"
            >
              Users
            </h2>
            <Badge
              variant="outline"
              className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-1"
            >
              {users.length}
            </Badge>
            {(searchQuery || roleFilter) && (
              <Badge
                variant="outline"
                className="bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-200 font-medium"
              >
                <Filter className="h-3 w-3 mr-1" />
                {searchQuery
                  ? `"${searchQuery}"`
                  : roleFilter
                  ? roleFilter.toLowerCase()
                  : "filtered"}
              </Badge>
            )}
          </div>
        </div>
        <Card
          className="shadow-md border-slate-200 bg-white/80 backdrop-blur-sm"
          data-testid="users-table"
        >
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="text-center py-16" data-testid="no-users-message">
                <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center shadow-inner">
                  <Users className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No users found
                </h3>
                <p className="text-slate-600 max-w-md mx-auto mb-6">
                  {searchQuery || roleFilter
                    ? "No users found matching your filters. Try adjusting your search or filter criteria."
                    : "Get started by inviting your first user to the platform."}
                </p>
                {!searchQuery && !roleFilter && (
                  <InviteUserDialog>
                    <Button
                      className="btn-primary gap-2"
                      data-testid="invite-first-user-button"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite First User
                    </Button>
                  </InviteUserDialog>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="space-y-2" data-testid="users-list">
                  {users.map((user: UserWithStats) => (
                    <div
                      key={user.id}
                      className="group flex items-center justify-between p-4 sm:p-6 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent rounded-xl transition-all duration-200 border border-transparent hover:border-slate-100 hover:shadow-sm"
                      data-testid={`user-row-${user.id}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-12 w-12 shadow-sm">
                          <AvatarImage
                            src={user.profilePhotoUrl || ""}
                            alt={getDisplayName(user)}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold shadow-inner">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="font-semibold text-lg text-slate-900 truncate"
                              data-testid={`user-name-${user.id}`}
                            >
                              {getDisplayName(user)}
                            </h3>
                            <Badge
                              variant="outline"
                              className={
                                user.role === "ADMIN"
                                  ? "bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border-purple-200 font-medium shadow-sm"
                                  : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 font-medium shadow-sm"
                              }
                              data-testid={`user-role-badge-${user.id}`}
                            >
                              {user.role === "ADMIN" ? (
                                <>
                                  <Shield className="h-3 w-3 mr-1" />
                                  Admin
                                </>
                              ) : (
                                <>
                                  <Users className="h-3 w-3 mr-1" />
                                  Volunteer
                                </>
                              )}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <span
                                className="truncate font-medium"
                                data-testid={`user-email-${user.id}`}
                              >
                                {user.email}
                              </span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">
                                  {user.phone}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span className="font-medium">
                                Joined{" "}
                                {formatDistanceToNow(user.createdAt, {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div
                              className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                              data-testid={`user-shifts-count-${user.id}`}
                            >
                              {user._count.signups}
                            </div>
                            <div className="text-slate-500 font-medium">
                              Shifts
                            </div>
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
                          className="h-9 w-9 p-0 hover:bg-slate-100 group-hover:bg-slate-200 transition-colors"
                          data-testid={`view-user-details-${user.id}`}
                        >
                          <Link href={`/admin/volunteers/${user.id}`}>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}
