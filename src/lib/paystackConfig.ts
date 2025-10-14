// Paystack configuration
export const PAYSTACK_CONFIG = {
    // Public key for client-side operations (safe to expose)
    PUBLIC_KEY: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    
    // Secret key for server-side operations (should be kept secure)
    SECRET_KEY: import.meta.env.VITE_PAYSTACK_SECRET_KEY || '',
    
    // Base URL for Paystack API
    API_BASE_URL: 'https://api.paystack.co',
    
    // Currency (NGN for Nigerian Naira, USD for US Dollar)
    CURRENCY: 'NGN',
    
    // Callback URL for payment verification
    CALLBACK_URL: `${window.location.origin}/payment-success`,
  };
  
  // Validate Paystack configuration
  export const validatePaystackConfig = (): string[] => {
    const issues: string[] = [];
    
    if (!PAYSTACK_CONFIG.PUBLIC_KEY) {
      issues.push('VITE_PAYSTACK_PUBLIC_KEY is not set');
    }
    
    if (!PAYSTACK_CONFIG.SECRET_KEY) {
      issues.push('VITE_PAYSTACK_SECRET_KEY is not set');
    }
    
    return issues;
  };
  
  // Debug configuration (only in development)
  if (import.meta.env.DEV) {
    console.log('🔧 Paystack Configuration:', {
      hasPublicKey: !!PAYSTACK_CONFIG.PUBLIC_KEY,
      hasSecretKey: !!PAYSTACK_CONFIG.SECRET_KEY,
      currency: PAYSTACK_CONFIG.CURRENCY,
      callbackUrl: PAYSTACK_CONFIG.CALLBACK_URL,
    });
  }
  