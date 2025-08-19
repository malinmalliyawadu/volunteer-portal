"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Settings, MessageCircle } from "lucide-react";
import { FriendsData } from "@/lib/friends-data";
import { FriendsList } from "./friends-list";
import { FriendRequestsList } from "./friend-requests-list";
import { FriendsSearch } from "./friends-search";
import { SendFriendRequestForm } from "./send-friend-request-form";
import { FriendPrivacySettings } from "./friend-privacy-settings";

interface FriendsManagerServerProps {
  initialData: FriendsData;
}

export function FriendsManagerServer({ initialData }: FriendsManagerServerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSendRequest, setShowSendRequest] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  const { friends, pendingRequests, sentRequests } = initialData;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <FriendsSearch onSearchChange={setSearchTerm} />
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowPrivacySettings(true)}
            data-testid="privacy-settings-button"
          >
            <Settings className="h-4 w-4 mr-2" />
            Privacy Settings
          </Button>
          <Button 
            onClick={() => setShowSendRequest(true)}
            data-testid="add-friend-button"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
        </div>
      </div>

      <Tabs defaultValue="friends" className="space-y-6">
        <TabsList data-testid="friends-tabs">
          <TabsTrigger value="friends" data-testid="friends-tab">
            <Users className="h-4 w-4 mr-2" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="requests-tab">
            <MessageCircle className="h-4 w-4 mr-2" />
            Requests ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4" data-testid="friends-tab-content">
          <FriendsList friends={friends} searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4" data-testid="requests-tab-content">
          <FriendRequestsList pendingRequests={pendingRequests} />
        </TabsContent>
      </Tabs>

      <SendFriendRequestForm
        open={showSendRequest}
        onOpenChange={setShowSendRequest}
      />

      <FriendPrivacySettings
        open={showPrivacySettings}
        onOpenChange={setShowPrivacySettings}
      />
    </div>
  );
}