"use client";

import { useState } from "react";
import { Resource, ResourceCategory } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Video, Link2, Image, Headphones, BookOpen, Download, ExternalLink, Eye, Calendar, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ResourceWithRelations extends Resource {
  category: ResourceCategory;
  creator: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ResourceDialogProps {
  resource: ResourceWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons = {
  DOCUMENT: FileText,
  VIDEO: Video,
  LINK: Link2,
  IMAGE: Image,
  AUDIO: Headphones,
  ARTICLE: BookOpen,
};

const typeColors = {
  DOCUMENT: "bg-blue-100 text-blue-800",
  VIDEO: "bg-red-100 text-red-800",
  LINK: "bg-green-100 text-green-800",
  IMAGE: "bg-purple-100 text-purple-800",
  AUDIO: "bg-yellow-100 text-yellow-800",
  ARTICLE: "bg-indigo-100 text-indigo-800",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getCreatorName(creator: ResourceWithRelations["creator"]): string {
  if (creator.name) return creator.name;
  if (creator.firstName && creator.lastName) {
    return `${creator.firstName} ${creator.lastName}`;
  }
  if (creator.firstName) return creator.firstName;
  return "Unknown";
}

export function ResourceDialog({ resource, isOpen, onClose }: ResourceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!resource) return null;

  const Icon = typeIcons[resource.type];
  const typeColor = typeColors[resource.type];

  const handleAccessResource = async () => {
    setIsLoading(true);
    
    try {
      // Track resource access
      await fetch(`/api/resources/${resource.id}/access`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to track resource access:", error);
    } finally {
      setIsLoading(false);
    }

    // Open resource
    if (resource.url) {
      window.open(resource.url, "_blank");
    } else if (resource.filePath) {
      window.open(resource.filePath, "_blank");
    }
  };

  const isExternalLink = resource.type === "LINK" || resource.url;
  const isDownloadable = resource.filePath && !resource.url;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3 mb-2">
            <Icon className="h-6 w-6 text-gray-600 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl leading-tight pr-8">
                {resource.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className={typeColor}>
                  {resource.type.toLowerCase().replace('_', ' ')}
                </Badge>
                {resource.isFeatured && (
                  <Badge variant="default">Featured</Badge>
                )}
              </div>
            </div>
          </div>
          
          {resource.description && (
            <DialogDescription className="text-base leading-relaxed">
              {resource.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Category and File Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {resource.category.icon && (
                <span className="text-base">{resource.category.icon}</span>
              )}
              <span className="font-medium">Category:</span>
              <span>{resource.category.name}</span>
            </div>

            {resource.filePath && resource.fileSize && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span className="font-medium">File:</span>
                <span>{resource.fileName} ({formatFileSize(resource.fileSize)})</span>
              </div>
            )}

            {resource.url && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="h-4 w-4" />
                <span className="font-medium">Link:</span>
                <span className="truncate">{resource.url}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700 mb-2 block">Tags:</span>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="h-4 w-4" />
              <span>Created by {getCreatorName(resource.creator)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Added {formatDistanceToNow(new Date(resource.createdAt))} ago</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>{resource.viewCount} views</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={handleAccessResource}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                "Loading..."
              ) : isExternalLink ? (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </>
              ) : isDownloadable ? (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}