import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, RefreshCcw, Home, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';

const Downtime: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-8">
      <div className="max-w-lg w-full space-y-8 animate-fade-in">
        {/* Icon and Main Message */}
        <div className="text-center space-y-6">
          {/* Animated Icon Container */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-amber-200 rounded-full blur-3xl opacity-40 animate-pulse"></div>
            <div className="relative z-10 mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-lg">
              <Wrench className="h-12 w-12 text-amber-600" />
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
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200/50 shadow-lg">
          <CardContent className="pt-6 pb-6 space-y-4">
            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-3 text-amber-700">
              <div className="relative">
                <Clock className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full animate-pulse"></span>
              </div>
              <span className="font-medium">{t.downtimeStatus}</span>
            </div>

            {/* Info Message */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {t.downtimeInfo}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            onClick={handleRefresh}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
          >
            <RefreshCcw className="h-4 w-4" />
            {t.downtimeRefresh}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleGoHome}
            className="w-full sm:w-auto gap-2 border-amber-300 hover:bg-amber-50"
          >
            <Home className="h-4 w-4" />
            {t.downtimeGoHome}
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
