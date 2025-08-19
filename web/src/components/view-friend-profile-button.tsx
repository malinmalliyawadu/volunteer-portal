"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { Friend } from "@/lib/friends-data";
import { FriendProfileDialog } from "./friend-profile-dialog";

interface ViewFriendProfileButtonProps {
  friend: Friend;
}

export function ViewFriendProfileButton({ friend }: ViewFriendProfileButtonProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1"
        onClick={() => setShowProfile(true)}
        data-testid="view-friend-profile-button"
      >
        <Calendar className="h-3 w-3 mr-1" />
        View Profile
      </Button>
      
      <FriendProfileDialog
        friend={friend}
        open={showProfile}
        onOpenChange={setShowProfile}
      />
    </>
  );
}