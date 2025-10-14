/**
 * Utility functions for generating and validating secure tokens
 */

/**
 * Generate a secure token for password reset
 * @param email - The user's email
 * @param expiryHours - Number of hours until the token expires (default: 24)
 * @returns The generated token string
 */
export const generatePasswordResetToken = (email: string, expiryHours = 24): string => {
    // Create a payload with email and expiration time
    const payload = {
      email,
      exp: Date.now() + expiryHours * 60 * 60 * 1000, // Current time + expiryHours in milliseconds
    };
    
    // Encode the payload as base64
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // Add a simple signature (in a real app, you might want to use a more secure signing method)
    const signature = btoa(
      email + import.meta.env.VITE_TOKEN_SECRET + payload.exp
    ).replace(/=/g, '');
    
    // Combine the payload and signature
    return `${encodedPayload}.${signature}`;
  };
  
  /**
   * Validate a password reset token
   * @param token - The token to validate
   * @returns An object with validation result and the email if valid
   */
  export const validatePasswordResetToken = (token: string): { 
    valid: boolean;
    email?: string;
    error?: string;
  } => {
    try {
      // Split the token into payload and signature
      const [encodedPayload, signature] = token.split('.');
      
      if (!encodedPayload || !signature) {
        return { valid: false, error: 'Invalid token format' };
      }
      
      // Decode the payload
      const payload = JSON.parse(atob(encodedPayload));
      
      // Check if the token has expired
      if (payload.exp < Date.now()) {
        return { valid: false, error: 'Token has expired' };
      }
      
      // Verify the signature
      const expectedSignature = btoa(
        payload.email + import.meta.env.VITE_TOKEN_SECRET + payload.exp
      ).replace(/=/g, '');
      
      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid token signature' };
      }
      
      return { valid: true, email: payload.email };
    } catch (error) {
      return { valid: false, error: 'Invalid token' };
    }
  };
  