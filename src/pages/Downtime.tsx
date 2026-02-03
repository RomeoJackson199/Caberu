import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, RefreshCcw, Clock, Lock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const Downtime: React.FC = () => {
  const { t } = useLanguage();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8">
      <div className="max-w-lg w-full space-y-8 animate-fade-in">
        {/* Icon and Main Message */}
        <div className="text-center space-y-6">
          {/* Animated Icon Container */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-200 rounded-full blur-3xl opacity-40 animate-pulse"></div>
            <div className="relative z-10 mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          {/* Title and Description */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {t.downtimeTitle}
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              {t.downtimeMessage}
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-200/50 shadow-lg">
          <CardContent className="pt-6 pb-6 space-y-4">
            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-3 text-blue-700">
              <div className="relative">
                <Clock className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
              </div>
              <span className="font-medium">{t.downtimeStatus}</span>
            </div>

            {/* Info Message */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                {t.downtimeInfo}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleRefresh}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
          >
            <RefreshCcw className="h-4 w-4" />
            {t.downtimeRefresh}
          </Button>
        </div>

        {/* Footer Message */}
        <p className="text-center text-sm text-gray-500">
          {t.downtimeApology}
        </p>
      </div>
    </div>
  );
};

export default Downtime;
