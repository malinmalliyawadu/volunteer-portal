import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ResourceGrid } from "@/components/resource-grid";
import { ResourceSearch } from "@/components/resource-search";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  FileText,
  Video,
  Link2,
  Image,
  Headphones,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resources - Everybody Eats Volunteer Portal",
  description:
    "Access helpful resources, training materials, and guides for volunteers",
};

interface ResourcePageProps {
  searchParams: {
    category?: string;
    type?: string;
    search?: string;
  };
}

async function getResources(searchParams: ResourcePageProps["searchParams"]) {
  const { category, type, search } = searchParams;

  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (category) {
    where.categoryId = category;
  }

  if (type) {
    where.type = type;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }

  const [resources, categories] = await Promise.all([
    prisma.resource.findMany({
      where,
      include: {
        category: true,
        creator: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.resourceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            resources: {
              where: { isActive: true },
            },
          },
        },
      },
    }),
  ]);

  return { resources, categories };
}

const typeIcons = {
  DOCUMENT: FileText,
  VIDEO: Video,
  LINK: Link2,
  IMAGE: Image,
  AUDIO: Headphones,
  ARTICLE: BookOpen,
};

export default async function ResourcesPage({
  searchParams,
}: ResourcePageProps) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.user && (session.user as { role?: string }).role === "ADMIN";

  const { resources, categories } = await getResources(searchParams);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Resource Hub
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Access training materials, guides, videos, and helpful resources to
            enhance your volunteer experience
          </p>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="mb-6 flex justify-end">
            <Button asChild>
              <Link href="/admin/resources">Manage Resources</Link>
            </Button>
          </div>
        )}

        {/* Search and Filters */}
        <ResourceSearch
          categories={categories}
          selectedCategory={searchParams.category}
          selectedType={searchParams.type}
          searchQuery={searchParams.search}
        />

        {/* Featured Resources */}
        {!searchParams.category &&
          !searchParams.type &&
          !searchParams.search && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Featured Resources
              </h2>
              <ResourceGrid
                resources={resources.filter((r) => r.isFeatured)}
                showCategory={true}
              />
            </section>
          )}

        {/* Resource Types Overview */}
        {!searchParams.category &&
          !searchParams.type &&
          !searchParams.search && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Browse by Type
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(typeIcons).map(([type, Icon]) => {
                  const count = resources.filter((r) => r.type === type).length;
                  if (count === 0) return null;

                  return (
                    <Link
                      key={type}
                      href={`/resources?type=${type}`}
                      className="group"
                    >
                      <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <Icon className="h-8 w-8 mx-auto mb-2 text-blue-600 group-hover:text-blue-700" />
                          <p className="font-medium text-sm mb-1 capitalize">
                            {type.toLowerCase().replace("_", " ")}
                          </p>
                          <p className="text-xs text-gray-500">{count} items</p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

        {/* Categories */}
        {categories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Categories
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/resources?category=${category.id}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {category.icon && (
                          <span className="text-2xl">{category.icon}</span>
                        )}
                        {category.name}
                      </CardTitle>
                      {category.description && (
                        <CardDescription>
                          {category.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500">
                        {category._count.resources} resource
                        {category._count.resources !== 1 ? "s" : ""}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Resources */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {searchParams.category || searchParams.type || searchParams.search
              ? "Search Results"
              : "All Resources"}
          </h2>

          {resources.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-4">No resources found.</p>
                {(searchParams.category ||
                  searchParams.type ||
                  searchParams.search) && (
                  <Button asChild variant="outline">
                    <Link href="/resources">Clear Filters</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <ResourceGrid
              resources={resources}
              showCategory={!searchParams.category}
            />
          )}
        </section>
      </div>
    </div>
  );
}
