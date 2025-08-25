"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, File, AlertCircle, CheckCircle, X, Play, AlertTriangle } from "lucide-react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { toast } from "sonner";

interface ValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    value: string;
    warning: string;
  }>;
  summary: {
    duplicateEmails: string[];
    missingRequiredFields: number;
    invalidDates: number;
    invalidPhones: number;
    emptyFields: Record<string, number>;
  };
}

interface MigrationResult {
  totalRecords: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  createdUsers?: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>;
}

export function CSVUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [migrationResult, setMigrationResult] =
    useState<MigrationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDryRun, setPendingDryRun] = useState(false);
  const [lastRunWasDryRun, setLastRunWasDryRun] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type !== "text/csv" &&
        !selectedFile.name.endsWith(".csv")
      ) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setValidationResult(null);
      setMigrationResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      if (
        droppedFile.type !== "text/csv" &&
        !droppedFile.name.endsWith(".csv")
      ) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(droppedFile);
      setValidationResult(null);
      setMigrationResult(null);
    }
  };

  const validateCSV = async () => {
    if (!file) return;

    setIsValidating(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/migration/validate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);

      if (result.invalidRecords === 0) {
        toast.success("✅ All records are valid! Ready for migration.");
      } else {
        toast.warning(
          `⚠️ Found ${result.invalidRecords} invalid records. Please review before migration.`
        );
      }
    } catch (error) {
      toast.error("Failed to validate CSV file");
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleMigrationClick = (dryRun = false) => {
    if (!file || !validationResult) return;
    
    // If there are validation errors and it's not a dry run, show confirmation dialog
    if (validationResult.invalidRecords > 0 && !dryRun) {
      setPendingDryRun(false);
      setShowConfirmDialog(true);
      return;
    }
    
    // If it's a dry run with errors, show confirmation dialog
    if (validationResult.invalidRecords > 0 && dryRun) {
      setPendingDryRun(true);
      setShowConfirmDialog(true);
      return;
    }
    
    // Otherwise proceed directly
    executeMigration(dryRun);
  };

  const executeMigration = async (dryRun = false) => {
    if (!file || !validationResult) return;

    setShowConfirmDialog(false);
    setIsMigrating(true);
    setUploadProgress(0);
    setLastRunWasDryRun(dryRun);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dryRun", dryRun.toString());

    try {
      const response = await fetch("/api/admin/migration/execute", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Migration failed");
      }

      const result: MigrationResult = await response.json();
      setMigrationResult(result);

      if (dryRun) {
        toast.success("🧪 Dry run completed successfully!");
      } else {
        toast.success(
          `🎉 Migration completed! ${result.successful} users migrated successfully.`
        );
      }
    } catch (error) {
      toast.error(
        `Failed to ${dryRun ? "run dry migration" : "execute migration"}`
      );
      console.error("Migration error:", error);
    } finally {
      setIsMigrating(false);
      setUploadProgress(100);
    }
  };

  const clearFile = () => {
    setFile(null);
    setValidationResult(null);
    setMigrationResult(null);
    setLastRunWasDryRun(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!file ? (
          <div className="space-y-4">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              Select CSV File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <File className="h-12 w-12 mx-auto text-green-600" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={validateCSV}
                disabled={isValidating}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isValidating ? "Validating..." : "Validate CSV"}
              </Button>
              <Button onClick={clearFile} variant="outline">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Migration Progress */}
      {isMigrating && (
        <Card>
          <CardHeader>
            <CardTitle>Migration in Progress</CardTitle>
            <CardDescription>
              Please wait while the migration is being processed...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={uploadProgress} className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResult && (
        <Card data-testid="validation-results">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="validation-title">
              {validationResult.invalidRecords === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              Validation completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4" data-testid="validation-content">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center" data-testid="total-records">
                <div className="text-2xl font-bold">
                  {validationResult.totalRecords}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Records
                </div>
              </div>
              <div className="text-center" data-testid="valid-records">
                <div className="text-2xl font-bold text-green-600">
                  {validationResult.validRecords}
                </div>
                <div className="text-sm text-muted-foreground">Valid Records: {validationResult.validRecords}</div>
              </div>
              <div className="text-center" data-testid="invalid-records">
                <div className="text-2xl font-bold text-red-600">
                  {validationResult.invalidRecords}
                </div>
                <div className="text-sm text-muted-foreground">Invalid Records: {validationResult.invalidRecords}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(
                    (validationResult.validRecords /
                      validationResult.totalRecords) *
                    100
                  ).toFixed(1)}
                  %
                </div>
                <div className="text-sm text-muted-foreground">
                  Success Rate
                </div>
              </div>
            </div>

            {validationResult.summary.duplicateEmails.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Duplicate emails found:</strong>{" "}
                  {validationResult.summary.duplicateEmails.length} emails
                  <div className="mt-1 text-sm">
                    {validationResult.summary.duplicateEmails
                      .slice(0, 3)
                      .map((email) => (
                        <Badge
                          key={email}
                          variant="destructive"
                          className="mr-1 mb-1"
                        >
                          {email}
                        </Badge>
                      ))}
                    {validationResult.summary.duplicateEmails.length > 3 && (
                      <span className="text-muted-foreground">
                        and{" "}
                        {validationResult.summary.duplicateEmails.length - 3}{" "}
                        more...
                      </span>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.errors.length > 0 && (
              <Alert data-testid="validation-errors">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>
                    {validationResult.errors.length} validation errors found.
                  </strong>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">
                      View Errors
                    </summary>
                    <div className="mt-2 max-h-60 overflow-y-auto text-sm space-y-2">
                      {validationResult.errors
                        .slice(0, 20)
                        .map((error, index) => (
                          <div key={index} className="p-2 bg-red-50 border border-red-200 rounded">
                            <div className="font-medium text-red-800">
                              Row {error.row} - {error.field}: {error.error}
                            </div>
                            {error.value && (
                              <div className="text-red-600 text-xs mt-1 font-mono">
                                Value: &quot;{error.value}&quot;
                              </div>
                            )}
                          </div>
                        ))}
                      {validationResult.errors.length > 20 && (
                        <div className="text-muted-foreground p-2">
                          and {validationResult.errors.length - 20} more
                          errors...
                        </div>
                      )}
                    </div>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>
                    {validationResult.warnings.length} warnings found.
                  </strong>{" "}
                  Migration will proceed but data may need manual review.
                </AlertDescription>
              </Alert>
            )}

            {validationResult.invalidRecords > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Migration blocked:</strong> {validationResult.invalidRecords} records have critical validation errors that must be fixed before migration can proceed. These include missing emails, invalid email formats, duplicate emails, missing names, or invalid date formats.
                </AlertDescription>
              </Alert>
            )}

            {/* Migration Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => handleMigrationClick(true)}
                disabled={isMigrating}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="dry-run-button"
              >
                <Play className="h-4 w-4" />
                Dry Run
                {validationResult.invalidRecords > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {validationResult.invalidRecords} errors
                  </Badge>
                )}
              </Button>
              <Button
                onClick={() => handleMigrationClick(false)}
                disabled={isMigrating}
                className="flex items-center gap-2"
                variant={validationResult.invalidRecords > 0 ? "destructive" : "default"}
                data-testid="execute-migration-button"
              >
                <Upload className="h-4 w-4" />
                Execute Migration
                {validationResult.invalidRecords > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs bg-white text-red-600">
                    {validationResult.invalidRecords} errors
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Migration Results */}
      {migrationResult && (
        <Card data-testid="migration-results">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="migration-results-title">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {lastRunWasDryRun ? "Dry run completed" : "Migration completed"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center" data-testid="total-migration-records">
                <div className="text-2xl font-bold">
                  {migrationResult.totalRecords}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Records: {migrationResult.totalRecords}
                </div>
              </div>
              <div className="text-center" data-testid="successful-migrations">
                <div className="text-2xl font-bold text-green-600">
                  {migrationResult.successful}
                </div>
                <div className="text-sm text-muted-foreground">Successful: {migrationResult.successful}</div>
              </div>
              <div className="text-center" data-testid="failed-migrations">
                <div className="text-2xl font-bold text-red-600">
                  {migrationResult.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed: {migrationResult.failed}</div>
              </div>
              <div className="text-center" data-testid="skipped-migrations">
                <div className="text-2xl font-bold text-amber-600">
                  {migrationResult.skipped}
                </div>
                <div className="text-sm text-muted-foreground">Skipped: {migrationResult.skipped}</div>
              </div>
            </div>

            {migrationResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>
                    {migrationResult.errors.length} migration errors:
                  </strong>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">
                      View Errors
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto text-sm">
                      {migrationResult.errors.map((error, index) => (
                        <div key={index} className="py-1">
                          Row {error.row} ({error.email}): {error.error}
                        </div>
                      ))}
                    </div>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            {migrationResult.createdUsers && migrationResult.createdUsers.length > 0 && (
              <div data-testid="created-users">
                <h4 className="font-medium mb-2">Created Users:</h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg p-3 bg-green-50">
                  <div className="space-y-2">
                    {migrationResult.createdUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-white border border-green-200 rounded text-sm">
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {user.email}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.phone || "No phone"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {migrationResult.successful > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Next steps:</strong>
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    <li>Send invitation emails to migrated users</li>
                    <li>Review emergency contact information</li>
                    <li>Map legacy positions to current shift types</li>
                    <li>Convert experience points to achievements</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <ResponsiveDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <ResponsiveDialogContent className="max-w-2xl" data-testid="confirmation-dialog">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2" data-testid="confirmation-title">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Confirm Migration with Errors
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription data-testid="confirmation-description">
              There are validation errors in your data. The CSV file contains {validationResult?.invalidRecords} validation errors. 
              These records will be skipped during migration.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What will happen:</strong>
                <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                  <li>{validationResult?.validRecords} valid records will be processed</li>
                  <li>{validationResult?.invalidRecords} invalid records will be skipped</li>
                  <li>You can review the results and fix issues later</li>
                  <li>{pendingDryRun ? "This is a dry run - no actual data will be created" : "This will create actual user accounts"}</li>
                </ul>
              </AlertDescription>
            </Alert>

            {validationResult && validationResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Sample Errors:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {validationResult.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <div className="font-medium text-red-800">
                        Row {error.row} - {error.field}: {error.error}
                      </div>
                      {error.value && (
                        <div className="text-red-600 text-xs mt-1 font-mono">
                          Value: &quot;{error.value}&quot;
                        </div>
                      )}
                    </div>
                  ))}
                  {validationResult.errors.length > 5 && (
                    <div className="text-muted-foreground text-sm">
                      and {validationResult.errors.length - 5} more errors...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => executeMigration(pendingDryRun)}
              variant={pendingDryRun ? "outline" : "destructive"}
              className="flex items-center gap-2"
              data-testid="confirm-migration-button"
            >
              {pendingDryRun ? (
                <>
                  <Play className="h-4 w-4" />
                  Continue Dry Run
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Yes, Execute Migration
                </>
              )}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
