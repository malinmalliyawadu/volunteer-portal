"use client";

import { useState } from "react";
import { Resource, ResourceCategory } from "@prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Video, Link2, Image, Headphones, BookOpen, MoreHorizontal, Eye, Download, Edit, Trash2, Star, StarOff, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ResourceWithRelations extends Resource {
  category: ResourceCategory;
  creator: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  _count: {
    accesses: number;
  };
}

interface ResourceManagementTableProps {
  resources: ResourceWithRelations[];
  categories: ResourceCategory[];
}

const typeIcons = {
  DOCUMENT: FileText,
  VIDEO: Video,
  LINK: Link2,
  IMAGE: Image,
  AUDIO: Headphones,
  ARTICLE: BookOpen,
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

export function ResourceManagementTable({ resources, categories }: ResourceManagementTableProps) {
  const [filteredResources, setFilteredResources] = useState(resources);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Apply filters
  const applyFilters = (search: string, category: string, type: string, status: string) => {
    let filtered = resources;

    if (search) {
      filtered = filtered.filter(
        resource =>
          resource.title.toLowerCase().includes(search.toLowerCase()) ||
          resource.description?.toLowerCase().includes(search.toLowerCase()) ||
          resource.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (category !== "all") {
      filtered = filtered.filter(resource => resource.categoryId === category);
    }

    if (type !== "all") {
      filtered = filtered.filter(resource => resource.type === type);
    }

    if (status !== "all") {
      if (status === "active") {
        filtered = filtered.filter(resource => resource.isActive);
      } else if (status === "inactive") {
        filtered = filtered.filter(resource => !resource.isActive);
      } else if (status === "featured") {
        filtered = filtered.filter(resource => resource.isFeatured);
      }
    }

    setFilteredResources(filtered);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    applyFilters(value, categoryFilter, typeFilter, statusFilter);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    applyFilters(searchTerm, value, typeFilter, statusFilter);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    applyFilters(searchTerm, categoryFilter, value, statusFilter);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    applyFilters(searchTerm, categoryFilter, typeFilter, value);
  };

  const toggleFeatured = async (resourceId: string, currentFeatured: boolean) => {
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      });

      if (response.ok) {
        // Update local state
        const updatedResources = resources.map(r =>
          r.id === resourceId ? { ...r, isFeatured: !currentFeatured } : r
        );
        setFilteredResources(updatedResources);
        toast.success(currentFeatured ? "Removed from featured" : "Added to featured");
      } else {
        toast.error("Failed to update resource");
      }
    } catch {
      toast.error("Failed to update resource");
    }
  };

  const toggleActive = async (resourceId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (response.ok) {
        // Update local state
        const updatedResources = resources.map(r =>
          r.id === resourceId ? { ...r, isActive: !currentActive } : r
        );
        setFilteredResources(updatedResources);
        toast.success(currentActive ? "Resource deactivated" : "Resource activated");
      } else {
        toast.error("Failed to update resource");
      }
    } catch {
      toast.error("Failed to update resource");
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Update local state
        const updatedResources = resources.filter(r => r.id !== resourceId);
        setFilteredResources(updatedResources.filter(r => 
          filteredResources.find(fr => fr.id === r.id)
        ));
        toast.success("Resource deleted successfully");
      } else {
        toast.error("Failed to delete resource");
      }
    } catch {
      toast.error("Failed to delete resource");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="DOCUMENT">Documents</SelectItem>
            <SelectItem value="VIDEO">Videos</SelectItem>
            <SelectItem value="LINK">Links</SelectItem>
            <SelectItem value="IMAGE">Images</SelectItem>
            <SelectItem value="AUDIO">Audio</SelectItem>
            <SelectItem value="ARTICLE">Articles</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No resources found.
                </TableCell>
              </TableRow>
            ) : (
              filteredResources.map((resource) => {
                const Icon = typeIcons[resource.type];
                
                return (
                  <TableRow key={resource.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 text-gray-600 mt-1 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{resource.title}</div>
                          {resource.description && (
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {resource.description}
                            </div>
                          )}
                          {resource.filePath && resource.fileSize && (
                            <div className="text-xs text-gray-400 mt-1">
                              {resource.fileName} • {formatFileSize(resource.fileSize)}
                            </div>
                          )}
                          {resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {resource.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {resource.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{resource.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {resource.category.icon && (
                          <span className="text-sm">{resource.category.icon}</span>
                        )}
                        <span className="text-sm">{resource.category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {resource.type.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={resource.isActive ? "default" : "secondary"}>
                          {resource.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {resource.isFeatured && (
                          <Badge variant="outline" className="text-yellow-600">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Eye className="h-3 w-3" />
                        {resource.viewCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(resource.createdAt))} ago
                    </TableCell>
                    <TableCell className="text-sm">
                      {getCreatorName(resource.creator)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              if (resource.url) {
                                window.open(resource.url, "_blank");
                              } else if (resource.filePath) {
                                window.open(resource.filePath, "_blank");
                              }
                            }}
                          >
                            {resource.url ? (
                              <>
                                <Link2 className="h-4 w-4 mr-2" />
                                Open Link
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleFeatured(resource.id, resource.isFeatured)}
                          >
                            {resource.isFeatured ? (
                              <>
                                <StarOff className="h-4 w-4 mr-2" />
                                Remove Featured
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Make Featured
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive(resource.id, resource.isActive)}
                          >
                            {resource.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteResource(resource.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-gray-500">
        Showing {filteredResources.length} of {resources.length} resources
      </div>
    </div>
  );
}