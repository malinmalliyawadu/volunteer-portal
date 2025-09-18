import { AdminPageWrapper } from "@/components/admin-page-wrapper";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

export default function AdminShiftsLoading() {
  return (
    <AdminPageWrapper 
      title="Restaurant Schedule"
      actions={
        <Button asChild size="sm" disabled>
          <Link href="/admin/shifts/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Shift
          </Link>
        </Button>
      }
    >
      <PageContainer>
        {/* Navigation Controls Skeleton */}
        <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Section: Date Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
                </div>

                <div className="hidden sm:block h-8 w-px bg-slate-200" />

                {/* Location Selector Skeleton */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>

              {/* Right Section: Quick Actions */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Masonry Cards Skeleton */}
        <div className="space-y-8">
          {/* Day Shifts */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                ☀️
              </div>
              <div>
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="bg-white rounded-lg border-2 border-slate-200 p-4 animate-pulse shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 bg-gray-200 rounded" />
                        <div className="h-5 w-32 bg-gray-200 rounded" />
                      </div>
                      <div className="h-4 w-28 bg-gray-200 rounded" />
                    </div>
                    <div className="text-right">
                      <div className="h-6 w-12 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-200 rounded mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">
                    <div className="h-6 w-12 bg-gray-200 rounded" />
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="h-9 w-9 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                        <div className="h-3 w-16 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <div className="h-8 flex-1 bg-gray-200 rounded" />
                    <div className="h-8 flex-1 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evening Shifts */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                🌙
              </div>
              <div>
                <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="bg-white rounded-lg border-2 border-slate-200 p-4 animate-pulse shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 bg-gray-200 rounded" />
                        <div className="h-5 w-28 bg-gray-200 rounded" />
                      </div>
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                    </div>
                    <div className="text-right">
                      <div className="h-6 w-12 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-200 rounded mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">
                    <div className="h-6 w-10 bg-gray-200 rounded" />
                    <div className="h-6 w-14 bg-gray-200 rounded" />
                    <div className="h-6 w-18 bg-gray-200 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="h-9 w-9 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
                        <div className="h-3 w-12 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="h-9 w-9 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <div className="h-8 flex-1 bg-gray-200 rounded" />
                    <div className="h-8 flex-1 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    </AdminPageWrapper>
  );
}