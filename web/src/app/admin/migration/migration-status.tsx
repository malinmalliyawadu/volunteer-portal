"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Users, Mail, CheckCircle, AlertCircle } from "lucide-react";

interface MigrationStats {
  totalMigrated: number;
  pendingInvitations: number;
  completedRegistrations: number;
  failedInvitations: number;
  lastMigrationDate?: string;
  recentActivity: Array<{
    id: string;
    type: 'migration' | 'invitation' | 'registration';
    email: string;
    status: 'success' | 'failed' | 'pending';
    timestamp: string;
  }>;
}

export function MigrationStatus() {
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/migration/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch migration stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Migration Status</CardTitle>
          <CardDescription>Loading migration statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionRate = stats.totalMigrated > 0 
    ? (stats.completedRegistrations / stats.totalMigrated) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="total-migrations-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Migrations</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalMigrated}</div>
          </CardContent>
        </Card>

        <Card data-testid="successful-migrations-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Successful</span>
            </div>
            <div className="text-2xl font-bold">{stats.completedRegistrations}</div>
          </CardContent>
        </Card>

        <Card data-testid="failed-migrations-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            <div className="text-2xl font-bold">{stats.failedInvitations}</div>
          </CardContent>
        </Card>

        <Card data-testid="last-migration-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Last Migration</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.lastMigrationDate 
                ? new Date(stats.lastMigrationDate).toLocaleDateString()
                : 'Never'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registration Progress</CardTitle>
              <CardDescription>
                User registration completion rate
              </CardDescription>
            </div>
            <Button
              onClick={fetchStats}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Rate</span>
              <span>{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="w-full" />
          </div>
          
          {stats.lastMigrationDate && (
            <p className="text-sm text-muted-foreground">
              Last migration: {new Date(stats.lastMigrationDate).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card data-testid="recent-migration-activity">
        <CardHeader>
          <CardTitle>Recent Migration Activity</CardTitle>
          <CardDescription>
            Latest migration and registration events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {activity.type === 'migration' && <Users className="h-4 w-4 text-blue-600" />}
                      {activity.type === 'invitation' && <Mail className="h-4 w-4 text-amber-600" />}
                      {activity.type === 'registration' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      <span className="text-sm font-medium capitalize">{activity.type}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        activity.status === 'success' ? 'default' :
                        activity.status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {activity.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No recent activity found. Start by migrating users from the Upload CSV tab.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}