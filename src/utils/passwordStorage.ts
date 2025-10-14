/**
 * Simple password storage utility for temporary password reset functionality
 * This is a temporary solution to bypass Supabase rate limiting
 */

interface PasswordResetData {
    email: string;
    password: string;
    timestamp: number;
  }
  
  const STORAGE_KEY = 'pending_password_reset';
  const EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Store a password reset temporarily
   */
  export const storePendingPasswordReset = (email: string, password: string): void => {
    const data: PasswordResetData = {
      email,
      password,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('✅ Password reset stored temporarily for:', email);
    } catch (error) {
      console.error('❌ Failed to store password reset:', error);
    }
  };
  
  /**
   * Retrieve and clear a stored password reset
   */
  export const retrievePendingPasswordReset = (email: string): string | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const data: PasswordResetData = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() - data.timestamp > EXPIRY_TIME) {
        clearPendingPasswordReset();
        return null;
      }
      
      // Check if email matches
      if (data.email !== email) {
        return null;
      }
      
      // Clear the stored data after retrieval
      clearPendingPasswordReset();
      
      console.log('✅ Retrieved password reset for:', email);
      return data.password;
    } catch (error) {
      console.error('❌ Failed to retrieve password reset:', error);
      return null;
    }
  };
  
  /**
   * Clear any stored password reset data
   */
  export const clearPendingPasswordReset = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('❌ Failed to clear password reset:', error);
    }
  };
  
  /**
   * Check if there's a pending password reset for an email
   */
  export const hasPendingPasswordReset = (email: string): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      
      const data: PasswordResetData = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() - data.timestamp > EXPIRY_TIME) {
        clearPendingPasswordReset();
        return false;
      }
      
      return data.email === email;
    } catch (error) {
      console.error('❌ Failed to check pending password reset:', error);
      return false;
    }
  };
  