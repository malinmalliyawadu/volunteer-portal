"use client";

import { useState } from "react";
import { Resource, ResourceCategory } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Video, Link2, Image, Headphones, BookOpen, Download, ExternalLink, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ResourceDialog } from "./resource-dialog";

interface ResourceWithRelations extends Resource {
  category: ResourceCategory;
  creator: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ResourceGridProps {
  resources: ResourceWithRelations[];
  showCategory?: boolean;
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

export function ResourceGrid({ resources, showCategory = false }: ResourceGridProps) {
  const [selectedResource, setSelectedResource] = useState<ResourceWithRelations | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleResourceClick = (resource: ResourceWithRelations) => {
    setSelectedResource(resource);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedResource(null);
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No resources found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => {
          const Icon = typeIcons[resource.type];
          const typeColor = typeColors[resource.type];

          return (
            <Card
              key={resource.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleResourceClick(resource)}
            >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-gray-600" />
                  <Badge variant="secondary" className={typeColor}>
                    {resource.type.toLowerCase().replace('_', ' ')}
                  </Badge>
                  {resource.isFeatured && (
                    <Badge variant="default">Featured</Badge>
                  )}
                </div>
                {resource.url ? (
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                ) : (
                  <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                )}
              </div>
              
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                {resource.title}
              </CardTitle>
              
              {resource.description && (
                <CardDescription className="line-clamp-2">
                  {resource.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Category */}
                {showCategory && (
                  <div className="flex items-center gap-2">
                    {resource.category.icon && (
                      <span className="text-sm">{resource.category.icon}</span>
                    )}
                    <span className="text-sm text-gray-600">
                      {resource.category.name}
                    </span>
                  </div>
                )}

                {/* File info */}
                {resource.filePath && resource.fileSize && (
                  <div className="text-sm text-gray-500">
                    {resource.fileName} • {formatFileSize(resource.fileSize)}
                  </div>
                )}

                {/* Tags */}
                {resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {resource.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{resource.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {resource.viewCount} views
                  </div>
                  <div>
                    Added {formatDistanceToNow(new Date(resource.createdAt))} ago
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  By {getCreatorName(resource.creator)}
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
      
      <ResourceDialog
        resource={selectedResource}
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
      />
    </>
  );
}