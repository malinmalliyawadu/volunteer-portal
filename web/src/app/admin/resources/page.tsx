import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Badge import removed as it's not used
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceManagementTable } from "@/components/admin/resource-management-table";
import { CategoryManagementTable } from "@/components/admin/category-management-table";
import { CreateResourceDialog } from "@/components/admin/create-resource-dialog";
import { CreateCategoryDialog } from "@/components/admin/create-category-dialog";
import { FileText, Video, Link2, Image, Headphones, BookOpen, Plus, FolderOpen } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Manage Resources - Admin Dashboard",
  description: "Manage volunteer resources, categories, and file uploads",
};

async function getResourceData() {
  const [resources, categories] = await Promise.all([
    prisma.resource.findMany({
      include: {
        category: true,
        creator: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            accesses: true,
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
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            resources: true,
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

export default async function AdminResourcesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { resources, categories } = await getResourceData();

  const stats = {
    total: resources.length,
    active: resources.filter(r => r.isActive).length,
    featured: resources.filter(r => r.isFeatured).length,
    totalViews: resources.reduce((sum, r) => sum + r.viewCount, 0),
    byType: Object.fromEntries(
      Object.keys(typeIcons).map(type => [
        type,
        resources.filter(r => r.type === type).length
      ])
    ),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Resources</h1>
            <p className="text-gray-600 mt-2">
              Create and manage volunteer resources, training materials, and categories
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/resources">
              View Resource Hub
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500">
                {stats.active} active, {stats.total - stats.active} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Featured</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.featured}</div>
              <p className="text-xs text-gray-500">Featured resources</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-gray-500">Resource categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews}</div>
              <p className="text-xs text-gray-500">All time views</p>
            </CardContent>
          </Card>
        </div>

        {/* Resource Types Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Resource Types</CardTitle>
            <CardDescription>
              Distribution of resources by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(typeIcons).map(([type, Icon]) => (
                <div key={type} className="text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {type.toLowerCase().replace('_', ' ')}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {stats.byType[type]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Management Tabs */}
        <Tabs defaultValue="resources" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Resources</h3>
                <p className="text-sm text-gray-600">
                  Manage all volunteer resources and training materials
                </p>
              </div>
              <CreateResourceDialog categories={categories}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </CreateResourceDialog>
            </div>
            
            <ResourceManagementTable 
              resources={resources} 
              categories={categories}
            />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Categories</h3>
                <p className="text-sm text-gray-600">
                  Organize resources into categories
                </p>
              </div>
              <CreateCategoryDialog>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </CreateCategoryDialog>
            </div>
            
            <CategoryManagementTable categories={categories} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}