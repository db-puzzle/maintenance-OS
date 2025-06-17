import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, TrendingDown, Minus, Clock, Users, BarChart3, Download } from 'lucide-react';

// Simple utility functions inline
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

const formatDuration = (minutes: number | null): string => {
  if (!minutes || minutes <= 0) return 'N/A';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
};

const getRelativeTime = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatDate(dateString);
};

interface Stats {
  total: number;
  completed: number;
  in_progress: number;
  failed: number;
  completion_rate: number;
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

interface ExecutionSummary {
  id: number;
  routine_name: string;
  asset_tag: string | null;
  executor_name: string;
  status: string;
  started_at: string;
  duration_minutes: number | null;
  progress: number;
}

interface PerformanceMetrics {
  average_duration_minutes: number;
  median_duration_minutes: number;
  fastest_execution_minutes: number;
  slowest_execution_minutes: number;
  total_execution_time_hours: number;
}

interface HistoryProps {
  stats: Stats;
  recentExecutions: ExecutionSummary[];
  dailyTrend: any[];
  performanceMetrics: PerformanceMetrics;
  filters: any;
  filterOptions: any;
}

const History: React.FC<HistoryProps> = ({
  stats,
  recentExecutions,
  dailyTrend,
  performanceMetrics,
  filters,
  filterOptions,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Simplified components
  const ExecutionFilters = () => (
    <div className="text-sm text-muted-foreground">
      Filters component will be implemented here
    </div>
  );

  const ExecutionTrendChart = () => (
    <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
      <div className="text-center">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Trend chart will be implemented here</p>
      </div>
    </div>
  );

  const RecentExecutionsList = () => (
    <div className="space-y-3">
      {recentExecutions.map((execution) => (
        <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1">
            <div className="font-medium">{execution.routine_name}</div>
            <div className="text-sm text-muted-foreground">
              {execution.asset_tag} • {execution.executor_name}
            </div>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(execution.status)}>
              {execution.status.replace('_', ' ')}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {getRelativeTime(execution.started_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const PerformanceMetricsWidget = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Average Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(performanceMetrics.average_duration_minutes)}
          </div>
          <p className="text-sm text-muted-foreground">Per execution</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {performanceMetrics.total_execution_time_hours}h
          </div>
          <p className="text-sm text-muted-foreground">All executions</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fastest/Slowest</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Fastest:</span>
              <span className="font-medium">{formatDuration(performanceMetrics.fastest_execution_minutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Slowest:</span>
              <span className="font-medium">{formatDuration(performanceMetrics.slowest_execution_minutes)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <Head title="Execution History - Maintenance" />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Execution History</h1>
            <p className="text-muted-foreground">
              Track and analyze routine execution performance
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/maintenance/executions">
                <BarChart3 className="h-4 w-4 mr-2" />
                View All Executions
              </Link>
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <ExecutionFilters />
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(stats.trend.direction)}
                <span className="ml-1">
                  {stats.trend.percentage}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {stats.completion_rate}% completion rate
              </div>
              <Progress value={stats.completion_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.in_progress.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {stats.total > 0 ? ((stats.in_progress / stats.total) * 100).toFixed(1) : 0}% of total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed/Cancelled</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}% of total
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Executions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Executions</CardTitle>
                  <CardDescription>
                    Latest execution activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentExecutionsList />
                  <div className="mt-4">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/maintenance/executions">
                        View All Executions
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Execution Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of execution statuses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor('completed')}>
                        Completed
                      </Badge>
                    </div>
                    <span className="font-medium">{stats.completed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor('in_progress')}>
                        In Progress
                      </Badge>
                    </div>
                    <span className="font-medium">{stats.in_progress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor('cancelled')}>
                        Failed/Cancelled
                      </Badge>
                    </div>
                    <span className="font-medium">{stats.failed}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Trends</CardTitle>
                <CardDescription>
                  Daily execution activity over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExecutionTrendChart />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMetricsWidget />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default History;