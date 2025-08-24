import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Users, Mail, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/page-container";
import { CSVUploadForm } from "./csv-upload-form";
import { MigrationStatus } from "./migration-status";
import { UserInvitations } from "./user-invitations";
import { MigratedUsers } from "./migrated-users";

export const metadata: Metadata = {
  title: "User Migration | Admin Dashboard",
  description: "Migrate users from legacy volunteer portal",
};

export default function MigrationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="User Migration"
        description="Import users from the legacy volunteer portal and send invitations to join the new system."
        data-testid="page-header"
      />

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="migration-tabs">
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
                      <td className="p-2">Unique email address</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Phone</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Contact phone number</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Date of Birth</td>
                      <td className="p-2">No</td>
                      <td className="p-2">MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Contact Name</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Emergency contact name</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Contact Relationship</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Relationship to emergency contact</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Contact Phone</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Emergency contact phone</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Medical Conditions</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Medical conditions/notes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Experience Points</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Legacy system points (for reference)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Days Available</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Available days/schedule</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">Locations</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Preferred volunteer locations</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">Positions</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Preferred volunteer positions</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                *At least one of First Name or Last Name is required.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <MigrationStatus />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <UserInvitations />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <MigratedUsers />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}