/**
 * HealthKit Integration Components
 *
 * Components for displaying and managing Apple HealthKit data.
 * Perfect for dental apps that want to integrate with patient health metrics.
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  Heart,
  Footprints,
  Flame,
  Moon,
  Loader2,
  RefreshCw,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useHealthKit, useDespiaNative, useHaptics } from '@/hooks/useDespia';
import { cn } from '@/lib/utils';
import type { HealthKitQuantityType, HealthKitCategoryType } from '@/lib/despia';

// ============================================
// HEALTHKIT AUTHORIZATION CARD
// ============================================

interface HealthKitAuthCardProps {
  title?: string;
  description?: string;
  readTypes: (HealthKitQuantityType | HealthKitCategoryType)[];
  writeTypes?: HealthKitQuantityType[];
  onAuthorized?: () => void;
  onDenied?: () => void;
}

export function HealthKitAuthCard({
  title = 'Connect to Apple Health',
  description = 'Allow Caberu to access your health data for a more personalized experience.',
  readTypes,
  writeTypes = [],
  onAuthorized,
  onDenied,
}: HealthKitAuthCardProps) {
  const isNative = useDespiaNative();
  const haptics = useHaptics();
  const { isAuthorized, requestAuth, isLoading } = useHealthKit({
    readTypes,
    writeTypes,
  });

  const handleAuthorize = async () => {
    haptics.impact();
    const authorized = await requestAuth();
    if (authorized) {
      haptics.success();
      onAuthorized?.();
    } else {
      haptics.warning();
      onDenied?.();
    }
  };

  if (!isNative) {
    return (
      <Card className="border-dashed opacity-75">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>
            HealthKit integration is only available in the native iOS app.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isAuthorized) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg text-green-800">Health Connected</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <Shield className="h-3 w-3 mr-1" />
              Authorized
            </Badge>
          </div>
          <CardDescription className="text-green-700">
            Your Apple Health data is securely connected.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleAuthorize}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Heart className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Connecting...' : 'Connect Apple Health'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// HEALTH METRIC CARD
// ============================================

interface HealthMetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  target?: number;
  current?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: 'red' | 'green' | 'blue' | 'orange' | 'purple';
  className?: string;
}

export function HealthMetricCard({
  icon,
  label,
  value,
  unit,
  target,
  current,
  trend,
  color = 'blue',
  className,
}: HealthMetricCardProps) {
  const colorClasses = {
    red: 'text-red-500 bg-red-50',
    green: 'text-green-500 bg-green-50',
    blue: 'text-blue-500 bg-blue-50',
    orange: 'text-orange-500 bg-orange-50',
    purple: 'text-purple-500 bg-purple-50',
  };

  const progressPercentage = target && current ? Math.min((current / target) * 100, 100) : undefined;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            {icon}
          </div>
          {trend && (
            <Badge variant="outline" className={cn(
              trend === 'up' && 'text-green-600 border-green-200',
              trend === 'down' && 'text-red-600 border-red-200',
              trend === 'stable' && 'text-gray-600 border-gray-200'
            )}>
              {trend === 'up' ? '+' : trend === 'down' ? '-' : '='}
              {trend}
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold">{value}</span>
            {unit && <span className="text-muted-foreground">{unit}</span>}
          </div>
        </div>

        {progressPercentage !== undefined && (
          <div className="mt-4 space-y-2">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {current?.toLocaleString()} / {target?.toLocaleString()} {unit}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// HEALTH DASHBOARD
// ============================================

interface HealthDashboardProps {
  userId?: string;
  className?: string;
}

export function HealthDashboard({ userId, className }: HealthDashboardProps) {
  const isNative = useDespiaNative();
  const haptics = useHaptics();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isAuthorized, isLoading, data, read, requestAuth } = useHealthKit({
    readTypes: [
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierHeartRate',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
    ],
  });

  const refreshData = async () => {
    if (!isAuthorized) return;

    setIsRefreshing(true);
    haptics.light();

    await read([
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierHeartRate',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
    ], 7);

    setIsRefreshing(false);
    haptics.success();
  };

  useEffect(() => {
    if (isAuthorized) {
      refreshData();
    }
  }, [isAuthorized]);

  if (!isNative) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Dashboard
          </CardTitle>
          <CardDescription>
            Open in the iOS app to view your health data.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isAuthorized) {
    return (
      <HealthKitAuthCard
        readTypes={[
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
        ]}
        onAuthorized={refreshData}
      />
    );
  }

  if (isLoading && !data) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Health Dashboard</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-20 mt-4" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Extract latest values from data
  const getLatestValue = (key: string): number | undefined => {
    const values = data?.[key];
    if (!values || values.length === 0) return undefined;
    return values[0].value;
  };

  const steps = getLatestValue('HKQuantityTypeIdentifierStepCount');
  const heartRate = getLatestValue('HKQuantityTypeIdentifierHeartRate');
  const calories = getLatestValue('HKQuantityTypeIdentifierActiveEnergyBurned');
  const distance = getLatestValue('HKQuantityTypeIdentifierDistanceWalkingRunning');

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Health Dashboard
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshData}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <HealthMetricCard
          icon={<Footprints className="h-5 w-5" />}
          label="Steps Today"
          value={steps?.toLocaleString() || '--'}
          target={10000}
          current={steps}
          color="blue"
        />

        <HealthMetricCard
          icon={<Heart className="h-5 w-5" />}
          label="Heart Rate"
          value={heartRate?.toFixed(0) || '--'}
          unit="bpm"
          color="red"
        />

        <HealthMetricCard
          icon={<Flame className="h-5 w-5" />}
          label="Calories Burned"
          value={calories?.toFixed(0) || '--'}
          unit="kcal"
          target={500}
          current={calories}
          color="orange"
        />

        <HealthMetricCard
          icon={<Activity className="h-5 w-5" />}
          label="Distance"
          value={distance ? (distance / 1000).toFixed(1) : '--'}
          unit="km"
          color="green"
        />
      </div>
    </div>
  );
}

export default {
  HealthKitAuthCard,
  HealthMetricCard,
  HealthDashboard,
};
