"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { ResourceCategory } from "@prisma/client";

interface ResourceCategoryWithCount extends ResourceCategory {
  _count: {
    resources: number;
  };
}

interface ResourceSearchProps {
  categories: ResourceCategoryWithCount[];
  selectedCategory?: string;
  selectedType?: string;
  searchQuery?: string;
}

const resourceTypes = [
  { value: "DOCUMENT", label: "Documents" },
  { value: "VIDEO", label: "Videos" },
  { value: "LINK", label: "Links" },
  { value: "IMAGE", label: "Images" },
  { value: "AUDIO", label: "Audio" },
  { value: "ARTICLE", label: "Articles" },
];

export function ResourceSearch({
  categories,
  selectedCategory,
  selectedType,
  searchQuery,
}: ResourceSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchQuery || "");

  const updateSearch = (params: Record<string, string | undefined>) => {
    const newSearchParams = new URLSearchParams(searchParams);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });

    router.push(`/resources?${newSearchParams.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearch({ search: search || undefined });
  };

  const clearFilters = () => {
    setSearch("");
    router.push("/resources");
  };

  const hasFilters = selectedCategory || selectedType || searchQuery;

  return (
    <div className="space-y-4 mb-8">
      {/* Search Form */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" className="px-6">Search</Button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Category Filter */}
        <Select
          value={selectedCategory || "all"}
          onValueChange={(value) =>
            updateSearch({ category: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  {category.icon && <span>{category.icon}</span>}
                  <span>{category.name}</span>
                  <span className="text-gray-500">
                    ({category._count.resources})
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={selectedType || "all"}
          onValueChange={(value) =>
            updateSearch({ type: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {resourceTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: &quot;{searchQuery}&quot;
              <button
                onClick={() => updateSearch({ search: undefined })}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              Category: {categories.find(c => c.id === selectedCategory)?.name}
              <button
                onClick={() => updateSearch({ category: undefined })}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {selectedType && (
            <Badge variant="secondary" className="gap-1">
              Type: {resourceTypes.find(t => t.value === selectedType)?.label}
              <button
                onClick={() => updateSearch({ type: undefined })}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}