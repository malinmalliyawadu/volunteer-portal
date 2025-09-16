"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AdminUsersSearchProps {
  initialSearch?: string;
  roleFilter?: string;
}

export function AdminUsersSearch({
  initialSearch,
  roleFilter,
}: AdminUsersSearchProps) {
  const [searchValue, setSearchValue] = useState(initialSearch || "");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (searchValue.trim()) {
      params.set("search", searchValue.trim());
    }
    if (roleFilter) {
      params.set("role", roleFilter);
    }

    const queryString = params.toString();
    const url = queryString ? `/admin/users?${queryString}` : "/admin/users";
    router.push(url);
  };

  return (
    <section data-testid="filters-section" className="mb-6">
      <form
        onSubmit={handleSubmit}
        data-testid="search-form"
        className="flex flex-col sm:flex-row gap-4 mb-4"
      >
        <div className="flex-1">
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search users..."
            className="max-w-md"
            data-testid="search-input"
          />
        </div>
        <div className="flex gap-2" data-testid="main-role-filter-buttons">
          <Link
            href={{
              pathname: "/admin/users",
              query: searchValue ? { search: searchValue } : {},
            }}
          >
            <Button
              variant={!roleFilter ? "default" : "outline"}
              size="sm"
              className={
                !roleFilter ? "btn-primary shadow-sm" : "hover:bg-slate-50"
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
                ...(searchValue ? { search: searchValue } : {}),
              },
            }}
          >
            <Button
              variant={roleFilter === "VOLUNTEER" ? "default" : "outline"}
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
                ...(searchValue ? { search: searchValue } : {}),
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
      </form>
    </section>
  );
}
