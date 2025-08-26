"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: string;
}

interface Location {
  value: string;
  label: string;
}

export default function RestaurantManagerForm() {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch admin users
        const usersResponse = await fetch("/api/admin/users");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          // Filter for admin users only
          const adminUsers = usersData.filter((user: User) => user.role === "ADMIN");
          setUsers(adminUsers);
        }

        // Fetch available locations
        const locationsResponse = await fetch("/api/locations");
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          setLocations(locationsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleLocationSelect = (location: string) => {
    if (!selectedLocations.includes(location)) {
      setSelectedLocations([...selectedLocations, location]);
    }
  };

  const removeLocation = (location: string) => {
    setSelectedLocations(selectedLocations.filter(l => l !== location));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    if (selectedLocations.length === 0) {
      toast.error("Please select at least one location");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/restaurant-managers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser,
          locations: selectedLocations,
          receiveNotifications,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign manager");
      }

      const result = await response.json();
      
      toast.success(`Successfully assigned ${getUserDisplayName(result.user)} as restaurant manager`);
      
      // Reset form
      setSelectedUser("");
      setSelectedLocations([]);
      setReceiveNotifications(true);
      
      // Refresh the table by emitting a custom event
      window.dispatchEvent(new CustomEvent('restaurant-manager-updated'));
      
    } catch (error) {
      console.error("Error assigning manager:", error);
      toast.error(error instanceof Error ? error.message : "Failed to assign manager");
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || user.email;
  };

  if (loadingData) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>No admin users available for assignment.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Selection */}
      <div className="space-y-2">
        <Label htmlFor="user-select">Admin User</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Select an admin user..." />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div>
                  <div className="font-medium">{getUserDisplayName(user)}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Selection */}
      <div className="space-y-2">
        <Label>Restaurant Locations</Label>
        <Select onValueChange={handleLocationSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Add location..." />
          </SelectTrigger>
          <SelectContent>
            {locations
              .filter(location => !selectedLocations.includes(location.value))
              .map((location) => (
                <SelectItem key={location.value} value={location.value}>
                  {location.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        
        {/* Selected Locations */}
        {selectedLocations.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
            {selectedLocations.map((location) => (
              <Badge key={location} variant="secondary" className="gap-1">
                {location}
                <button
                  type="button"
                  onClick={() => removeLocation(location)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Notification Preference */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="notifications"
          checked={receiveNotifications}
          onCheckedChange={(checked) => setReceiveNotifications(checked === true)}
        />
        <Label htmlFor="notifications" className="text-sm font-normal">
          Receive shift cancellation notifications via email
        </Label>
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={loading || !selectedUser || selectedLocations.length === 0}>
        {loading ? "Assigning..." : "Assign Manager"}
      </Button>
    </form>
  );
}