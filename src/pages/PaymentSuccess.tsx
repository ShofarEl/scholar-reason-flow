import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyPayment, subscription, loading, error } = useSubscription();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');

    if (!reference && !trxref) {
      setVerificationStatus('failed');
      return;
    }

    const paymentReference = reference || trxref;
    
    if (paymentReference) {
      verifyPayment(paymentReference)
        .then(() => {
          setVerificationStatus('success');
        })
        .catch(() => {
          setVerificationStatus('failed');
        });
    }
  }, [searchParams, verifyPayment]);

  const handleContinue = () => {
    navigate('/');
  };

  const handleViewSubscription = () => {
    navigate('/subscription');
  };

  if (loading || verificationStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'failed' || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-red-600">Payment Verification Failed</h2>
            <p className="text-gray-600 mb-6">
              {error || 'We were unable to verify your payment. Please contact support if you believe this is an error.'}
            </p>
            <div className="space-y-3">
              <Button onClick={handleContinue} className="w-full">
                Return to Home
              </Button>
              <Button variant="outline" onClick={() => navigate('/subscription')} className="w-full">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-green-600">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your subscription has been activated successfully. You now have access to all the features in your plan.
          </p>

          {subscription && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <h3 className="font-semibold mb-2">Subscription Details:</h3>
              <p className="text-sm text-gray-600">
                <strong>Plan:</strong> {subscription.plan === 'basic' ? 'Basic Plan' : 'Premium Plan'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> Active
              </p>
              <p className="text-sm text-gray-600">
                <strong>Expires:</strong> {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={handleContinue} className="w-full">
              Start Using ScribeAI
            </Button>
            <Button variant="outline" onClick={handleViewSubscription} className="w-full">
              View Subscription Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
