import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const PaymentCancelled: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleCloseWindow = () => {
    window.close();

    if (!window.closed) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-600">
            {t.paymentCancelled}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t.paymentCancelledMessage}
          </p>

          <Button
            onClick={handleCloseWindow}
            className="w-full"
          >
            {t.closeWindow}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancelled;