"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Settings,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { FriendsData } from "@/lib/friends-data";
import { FriendsList } from "./friends-list";
import { FriendRequestsList } from "./friend-requests-list";
import { FriendsSearch } from "./friends-search";
import { SendFriendRequestForm } from "./send-friend-request-form";
import { FriendPrivacySettings } from "./friend-privacy-settings";

interface FriendsManagerServerProps {
  initialData: FriendsData;
}

export function FriendsManagerServer({
  initialData,
}: FriendsManagerServerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSendRequest, setShowSendRequest] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  const { friends, pendingRequests } = initialData;

  const hasNewRequests = pendingRequests.length > 0;

  return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <FriendsSearch onSearchChange={setSearchTerm} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPrivacySettings(true)}
            data-testid="privacy-settings-button"
            className="hover:bg-muted/50 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Privacy Settings
          </Button>
          <Button
            onClick={() => setShowSendRequest(true)}
            data-testid="add-friend-button"
            className="bg-primary hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Friend
            <Sparkles className="h-3 w-3 ml-2" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="friends" className="space-y-8">
        <TabsList
          data-testid="friends-tabs"
          className="grid w-full grid-cols-2 lg:w-96"
        >
          <TabsTrigger
            value="friends"
            data-testid="friends-tab"
            className="relative transition-all"
          >
            <Users className="h-4 w-4 mr-2" />
            Friends
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {friends.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            data-testid="requests-tab"
            className="relative transition-all"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Requests
            {hasNewRequests && (
              <Badge
                variant="destructive"
                className="ml-2 text-xs animate-pulse"
              >
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="friends"
          className="space-y-6"
          data-testid="friends-tab-content"
        >
          <FriendsList friends={friends} searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent
          value="requests"
          className="space-y-6"
          data-testid="requests-tab-content"
        >
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
