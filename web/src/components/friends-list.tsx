import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { Friend } from "@/lib/friends-data";
import { RemoveFriendButton } from "./remove-friend-button";
import { ViewFriendProfileButton } from "./view-friend-profile-button";

interface FriendsListProps {
  friends: Friend[];
  searchTerm: string;
}

export function FriendsList({ friends, searchTerm }: FriendsListProps) {
  const filteredFriends = friends.filter(friend =>
    friend.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filteredFriends.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No friends yet</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "No friends match your search."
              : "Start building your volunteer network by adding friends!"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredFriends.map((friend) => (
        <Card key={friend.friendshipId}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={friend.profilePhotoUrl || undefined} 
                    alt={friend.name || "Friend"}
                  />
                  <AvatarFallback className="bg-blue-500 text-white">
                    {(friend.firstName?.[0] || friend.name?.[0] || friend.email[0]).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {friend.name || `${friend.firstName || ""} ${friend.lastName || ""}`.trim() || friend.email}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Friends since {new Date(friend.friendsSince).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <RemoveFriendButton friendId={friend.id} />
            </div>
            
            <div className="mt-4 flex space-x-2">
              <ViewFriendProfileButton friend={friend} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}