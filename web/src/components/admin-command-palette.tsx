"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, UserCheck, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  role: "ADMIN" | "VOLUNTEER";
  profilePhotoUrl: string | null;
  profileCompleted: boolean;
}

interface AdminCommandPaletteProps {
  children: React.ReactNode;
}

export function AdminCommandPalette({ children }: AdminCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users?q=${encodeURIComponent(searchQuery)}&limit=10`,
        {
          credentials: 'include',
        }
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error("Error searching users:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchUsers]);

  const handleUserSelect = (userId: string) => {
    router.push(`/admin/volunteers/${userId}`);
    setOpen(false);
    setQuery("");
    setUsers([]);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "dashboard":
        router.push("/admin");
        break;
      case "users":
        router.push("/admin/users");
        break;
      case "shifts":
        router.push("/admin/shifts");
        break;
      case "regulars":
        router.push("/admin/regulars");
        break;
      case "notifications":
        router.push("/admin/notifications");
        break;
      case "auto-accept":
        router.push("/admin/auto-accept-rules");
        break;
      default:
        break;
    }
    setOpen(false);
    setQuery("");
    setUsers([]);
  };

  const getDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || user.email;
  };

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.name) {
      const nameParts = user.name.split(" ");
      if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return user.name[0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Admin Command Palette"
        description="Search for users or navigate to admin pages"
      >
        <CommandInput
          placeholder="Search users or type to navigate..."
          value={query}
          onValueChange={setQuery}
          data-testid="admin-command-input"
        />
        <CommandList>
          <CommandEmpty>
            {loading ? "Searching..." : query.trim() ? "No results found." : "Type to search users or pages..."}
          </CommandEmpty>
          
          {!query.trim() && (
            <CommandGroup heading="Quick Navigation">
              <CommandItem
                value="dashboard"
                onSelect={() => handleQuickAction("dashboard")}
                className="flex items-center gap-3"
              >
                <Settings className="h-4 w-4 text-blue-600" />
                <span>Admin Dashboard</span>
              </CommandItem>
              <CommandItem
                value="shifts"
                onSelect={() => handleQuickAction("shifts")}
                className="flex items-center gap-3"
              >
                <Calendar className="h-4 w-4 text-green-600" />
                <span>Manage Shifts</span>
              </CommandItem>
              <CommandItem
                value="users"
                onSelect={() => handleQuickAction("users")}
                className="flex items-center gap-3"
              >
                <User className="h-4 w-4 text-purple-600" />
                <span>User Management</span>
              </CommandItem>
              <CommandItem
                value="regulars"
                onSelect={() => handleQuickAction("regulars")}
                className="flex items-center gap-3"
              >
                <UserCheck className="h-4 w-4 text-yellow-600" />
                <span>Regular Volunteers</span>
              </CommandItem>
            </CommandGroup>
          )}
          
          {users.length > 0 && (
            <CommandGroup heading="Users">
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${getDisplayName(user)} ${user.email} ${user.role}`}
                  onSelect={() => handleUserSelect(user.id)}
                  data-testid={`user-search-result-${user.id}`}
                  className="flex items-center gap-3 p-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {user.profilePhotoUrl ? (
                      <img
                        src={user.profilePhotoUrl}
                        alt={getDisplayName(user)}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {getInitials(user)}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getDisplayName(user)}</span>
                        {user.role === "ADMIN" && (
                          <Shield className="h-3 w-3 text-purple-600" />
                        )}
                        {!user.profileCompleted && (
                          <UserCheck className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.role === "ADMIN" ? "Admin" : "Volunteer"}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}