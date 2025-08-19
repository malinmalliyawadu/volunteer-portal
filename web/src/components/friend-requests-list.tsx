import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";
import { FriendRequest } from "@/lib/friends-data";
import { AcceptFriendRequestButton } from "./accept-friend-request-button";
import { DeclineFriendRequestButton } from "./decline-friend-request-button";

interface FriendRequestsListProps {
  pendingRequests: FriendRequest[];
}

export function FriendRequestsList({ pendingRequests }: FriendRequestsListProps) {
  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No pending requests</h3>
          <p className="text-gray-600">
            You don&apos;t have any pending friend requests.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingRequests.map((request) => (
        <Card key={request.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={request.fromUser.profilePhotoUrl || undefined} 
                    alt={request.fromUser.name || "User"}
                  />
                  <AvatarFallback className="bg-blue-500 text-white">
                    {(request.fromUser.firstName?.[0] || 
                      request.fromUser.name?.[0] || 
                      request.fromUser.email[0]).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {request.fromUser.name || 
                     `${request.fromUser.firstName || ""} ${request.fromUser.lastName || ""}`.trim() || 
                     request.fromUser.email}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Sent {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                  {request.message && (
                    <p className="text-sm mt-1 italic">
                      &quot;{request.message}&quot;
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <AcceptFriendRequestButton requestId={request.id} />
                <DeclineFriendRequestButton requestId={request.id} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}