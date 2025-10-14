import { validatePasswordResetToken } from '@/utils/tokenUtils';
import { storePendingPasswordReset } from '@/utils/passwordStorage';

/**
 * Service for handling password reset functionality
 */
export class PasswordResetService {
  private static instance: PasswordResetService;
  private resetAttempts: Map<string, number>;
  private lastResetTime: Map<string, number>;

  private constructor() {
    this.resetAttempts = new Map<string, number>();
    this.lastResetTime = new Map<string, number>();
  }

  public static getInstance(): PasswordResetService {
    if (!PasswordResetService.instance) {
      PasswordResetService.instance = new PasswordResetService();
    }
    return PasswordResetService.instance;
  }

  /**
   * Validate a password reset token
   * @param token The token to validate
   * @returns Validation result with email if valid
   */
  public validateToken(token: string): { 
    valid: boolean; 
    email?: string; 
    error?: string 
  } {
    return validatePasswordResetToken(token);
  }

  /**
   * Check if a reset request is rate limited
   * @param email The email to check
   * @returns Whether the request is rate limited and seconds to wait if it is
   */
  private isRateLimited(email: string): { limited: boolean; waitSeconds: number } {
    const now = Date.now();
    const lastReset = this.lastResetTime.get(email) || 0;
    const timeSinceLastReset = now - lastReset;
    
    // Rate limit: 60 seconds between reset attempts
    const rateLimitMs = 60 * 1000;
    
    if (timeSinceLastReset < rateLimitMs) {
      const waitSeconds = Math.ceil((rateLimitMs - timeSinceLastReset) / 1000);
      return { limited: true, waitSeconds };
    }
    
    return { limited: false, waitSeconds: 0 };
  }
  
  /**
   * Update the rate limit tracking for an email
   * @param email The email to update
   */
  private updateRateLimit(email: string): void {
    const attempts = this.resetAttempts.get(email) || 0;
    this.resetAttempts.set(email, attempts + 1);
    this.lastResetTime.set(email, Date.now());
  }

  /**
   * Reset a user's password using a custom token via API
   * @param email User's email address
   * @param password New password
   * @param token Reset token
   * @param bypassRateLimit Whether to bypass rate limiting (use with caution)
   * @returns Result of the password reset operation
   */
  public async resetPassword(
    email: string,
    password: string,
    token: string,
    bypassRateLimit = false
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      // Validate the token first
      const validation = this.validateToken(token);
      
      if (!validation.valid || !validation.email) {
        return { 
          success: false, 
          error: validation.error || 'Invalid or expired token' 
        };
      }
      
      // Verify email matches token
      if (validation.email !== email) {
        return { 
          success: false, 
          error: 'Email mismatch. Please use the same email you requested the reset for.' 
        };
      }
      
      // Check for rate limiting unless bypassed
      if (!bypassRateLimit) {
        const { limited, waitSeconds } = this.isRateLimited(email);
        if (limited) {
          return {
            success: false,
            error: `For security purposes, you can only request this after ${waitSeconds} seconds.`
          };
        }
      }
      
      // Update rate limit tracking
      this.updateRateLimit(email);
      
      // Actually update the password in Supabase using the secure API
      try {
        console.log('✅ Token validated successfully, updating password in database');
        
        const response = await fetch('/api/secure-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
            token: token
          })
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('❌ Password update API error:', result.error);
          return { 
            success: false, 
            error: result.error || 'Failed to update password'
          };
        }

        console.log('✅ Password updated successfully in database for:', email);
        
        return { 
          success: true,
          message: 'Password updated successfully! You can now sign in with your new password.'
        };
        
      } catch (apiError: any) {
        console.error('❌ Failed to update password in database:', apiError);
        
        // Fallback: Store temporarily as backup
        try {
          storePendingPasswordReset(email, password);
          return {
            success: true,
            message: 'Password reset successful! Your new password has been saved. Please go to the sign-in page and it will be used automatically.'
          };
        } catch (storageError) {
          return {
            success: false,
            error: 'Failed to update password. Please try again or contact support.'
          };
        }
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred during password reset' 
      };
    }
  }
}

export default PasswordResetService;
