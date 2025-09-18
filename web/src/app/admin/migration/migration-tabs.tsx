"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Users, Mail, CheckCircle, Database } from "lucide-react";
import { CSVUploadForm } from "./csv-upload-form";
import { MigrationStatus } from "./migration-status";
import { UserInvitations } from "./user-invitations";
import { MigratedUsers } from "./migrated-users";
import { NovaHistoricalData } from "./nova-historical-data";

export function MigrationTabs() {
  const [activeTab, setActiveTab] = useState("upload");

  // Handle hash-based navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['upload', 'status', 'invitations', 'users', 'historical'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update hash without reloading page
    window.history.replaceState(null, '', `#${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-5" data-testid="migration-tabs">
        <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload-csv">
          <Upload className="h-4 w-4" />
          Upload CSV
        </TabsTrigger>
        <TabsTrigger value="status" className="flex items-center gap-2" data-testid="tab-migration-status">
          <CheckCircle className="h-4 w-4" />
          Migration Status
        </TabsTrigger>
        <TabsTrigger value="invitations" className="flex items-center gap-2" data-testid="tab-user-invitations">
          <Mail className="h-4 w-4" />
          User Invitations
        </TabsTrigger>
        <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-migrated-users">
          <Users className="h-4 w-4" />
          Migrated Users
        </TabsTrigger>
        <TabsTrigger value="historical" className="flex items-center gap-2" data-testid="tab-historical-data">
          <Database className="h-4 w-4" />
          Historical Data
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="space-y-6" data-testid="tab-content-upload">
        <Card>
          <CardHeader>
            <CardTitle data-testid="csv-upload-title">Upload Legacy User Data</CardTitle>
            <CardDescription>
              Upload a CSV file containing user data from the legacy volunteer portal.
              The system will validate the data before allowing migration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CSVUploadForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required CSV Format</CardTitle>
            <CardDescription>
              Your CSV file must contain the following columns in this exact order:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Column Name</th>
                    <th className="text-left p-2 font-medium">Required</th>
                    <th className="text-left p-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="p-2 font-mono">First Name</td>
                    <td className="p-2">No*</td>
                    <td className="p-2">User&apos;s first name</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-mono">Last Name</td>
                    <td className="p-2">No*</td>
                    <td className="p-2">User&apos;s last name</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-mono">Email</td>
                    <td className="p-2">Yes</td>
                    <td className="p-2">User&apos;s email address (must be unique)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-mono">Phone</td>
                    <td className="p-2">No</td>
                    <td className="p-2">User&apos;s phone number</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                * Either First Name or Last Name must be provided
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="status" className="space-y-6" data-testid="tab-content-status">
        <MigrationStatus />
      </TabsContent>

      <TabsContent value="invitations" className="space-y-6" data-testid="tab-content-invitations">
        <UserInvitations />
      </TabsContent>

      <TabsContent value="users" className="space-y-6" data-testid="tab-content-users">
        <MigratedUsers />
      </TabsContent>

      <TabsContent value="historical" className="space-y-6" data-testid="tab-content-historical">
        <NovaHistoricalData />
      </TabsContent>
    </Tabs>
  );
}