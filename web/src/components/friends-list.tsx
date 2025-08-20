import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Heart, Clock } from "lucide-react";
import { Friend } from "@/lib/friends-data";
import { RemoveFriendButton } from "./remove-friend-button";
import { ViewFriendProfileButton } from "./view-friend-profile-button";
import { differenceInDays, format } from "date-fns";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/motion";

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
      <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
        <CardContent className="py-12 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground">
            {searchTerm ? "No matches found" : "No friends yet"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {searchTerm
              ? "Try adjusting your search terms to find the friends you're looking for."
              : "Start building your volunteer network by connecting with other volunteers!"}
          </p>
          {!searchTerm && (
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Badge variant="outline" className="text-sm">
                <Heart className="h-3 w-3 mr-1" />
                Connect with volunteers
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Calendar className="h-3 w-3 mr-1" />
                Share volunteering experiences
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {filteredFriends.map((friend) => {
        const displayName = friend.name || `${friend.firstName || ""} ${friend.lastName || ""}`.trim() || friend.email;
        const friendsSinceDate = new Date(friend.friendsSince);
        const daysSinceFriendship = differenceInDays(new Date(), friendsSinceDate);
        const isRecentFriend = daysSinceFriendship <= 30;
        
        return (
          <motion.div
            key={friend.friendshipId}
            variants={staggerItem}
          >
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 border-border/50 dark:border-border/70 hover:border-primary/30 dark:hover:border-primary/50 shadow-md bg-gradient-to-br from-background to-muted/20 dark:from-background dark:to-muted/10 hover:from-primary/5 hover:to-purple-500/5 dark:hover:from-primary/10 dark:hover:to-purple-500/10">
            <CardContent className="p-6 relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                      <AvatarImage 
                        src={friend.profilePhotoUrl || undefined} 
                        alt={displayName}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-purple-500/20 dark:from-primary/40 dark:to-purple-500/30 text-primary font-semibold text-lg">
                        {(friend.firstName?.[0] || friend.name?.[0] || friend.email[0]).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isRecentFriend && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full border-2 border-background flex items-center justify-center shadow-lg animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-foreground truncate group-hover:text-primary transition-colors duration-200">
                      {displayName}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Heart className="h-4 w-4 text-primary group-hover:text-red-500 transition-colors duration-200" />
                      <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                        {daysSinceFriendship === 0 ? "Today" : 
                         daysSinceFriendship === 1 ? "1 day ago" : 
                         daysSinceFriendship <= 7 ? `${daysSinceFriendship} days ago` :
                         format(friendsSinceDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
                <RemoveFriendButton friendId={friend.id} />
              </div>

              {isRecentFriend && (
                <div className="mb-4">
                  <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50">
                    <Clock className="h-3 w-3 mr-1" />
                    New Friend
                  </Badge>
                </div>
              )}
              
              <div className="space-y-4">
                <ViewFriendProfileButton friend={friend} />
                
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Connected for {daysSinceFriendship} day{daysSinceFriendship !== 1 ? 's' : ''}
                    </p>
                    <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                  </div>
                </div>
              </div>
              
              {/* Subtle background decoration */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}