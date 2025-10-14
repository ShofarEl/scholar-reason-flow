import { Resend } from 'resend';
import { generatePasswordResetToken } from '@/utils/tokenUtils';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

export interface EmailData {
  to: string;
  name?: string;
  resetLink?: string;
  magicLink?: string;
}

export class EmailService {
  private static instance: EmailService;
  private resend: Resend;
  private fromEmail: string;

  private constructor() {
    this.resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);
    
    // Use production domain for production environment
    const isProduction = import.meta.env.VITE_USE_PRODUCTION_EMAIL === 'true';
    this.fromEmail = isProduction 
      ? 'ScribeAI <noreply@ai.thinqscribe.com>'
      : 'ScribeAI <onboarding@resend.dev>';
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendWelcomeEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Sending welcome email to:', data.to);
      console.log('👤 User name:', data.name);
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'welcome',
          data: {
            to: data.to,
            name: data.name
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ API error:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Welcome email sent successfully:', result);
      console.log('🆔 Email ID:', result.id);
      console.log('📧 Sent to:', data.to);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to send welcome email:', error);
      console.error('📊 Error details:', error);
      return { success: false, error: error.message };
    }
  }

  async sendForgotPasswordEmail(emailAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Sending password reset email to:', emailAddress);
      
      // Generate a secure token for password reset (valid for 24 hours)
      const resetToken = generatePasswordResetToken(emailAddress, 24);
      
      // Create the reset link with the token
      const resetLink = `${window.location.origin}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
      
      // Send our custom branded email via API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'password-reset',
          data: {
            to: emailAddress,
            resetLink: resetLink
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ API error:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Password reset email sent successfully:', result);
      console.log('🆔 Email ID:', result.id);
      console.log('📧 Sent to:', emailAddress);
      console.log('🔗 Reset link:', resetLink);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to send password reset email:', error);
      console.error('📊 Error details:', error);
      return { success: false, error: error.message };
    }
  }

  async sendMagicLinkEmail(emailAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Sending magic link email to:', emailAddress);
      
      // Send our custom branded email via API (Resend only)
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'magic-link',
          data: {
            to: emailAddress
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ API error:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Magic link email sent successfully:', result);
      console.log('🆔 Email ID:', result.id);
      console.log('📧 Sent to:', emailAddress);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to send magic link email:', error);
      console.error('📊 Error details:', error);
      return { success: false, error: error.message };
    }
  }

  private generateWelcomeEmailHTML(data: EmailData): string {
    const userName = data.name || 'there';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ScribeAI</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .title {
            font-size: 28px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #718096;
            font-size: 16px;
          }
          .content {
            margin-bottom: 40px;
          }
          .feature {
            background: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 16px;
            margin: 16px 0;
            border-radius: 0 8px 8px 0;
          }
          .feature-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 4px;
          }
          .feature-desc {
            color: #718096;
            font-size: 14px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
          }
          .social-links {
            margin-top: 20px;
          }
          .social-links a {
            color: #1f2937;
            text-decoration: none;
            margin: 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">S</div>
            <h1 class="title">Welcome to ScribeAI!</h1>
            <p class="subtitle">Your intelligent academic companion</p>
          </div>
          
          <div class="content">
            <p>Hi ${userName},</p>
            
            <p>Welcome to ScribeAI! We're excited to have you join our community of scholars, researchers, and students who are transforming their academic writing experience.</p>
            
            <p>With ScribeAI, you now have access to powerful tools that will help you:</p>
            
            <div class="feature">
              <div class="feature-title">📝 Craft Scholarly Essays</div>
              <div class="feature-desc">Generate well-structured academic papers with proper citations and formatting</div>
            </div>
            
            <div class="feature">
              <div class="feature-title">🔬 Solve Technical Problems</div>
              <div class="feature-desc">Get step-by-step solutions with LaTeX formatting for complex mathematical problems</div>
            </div>
            
            <div class="feature">
              <div class="feature-title">📊 Analyze Documents</div>
              <div class="feature-desc">Upload and analyze academic papers, research documents, and technical content</div>
            </div>
            
            <div class="feature">
              <div class="feature-title">🎯 Humanize Content</div>
              <div class="feature-desc">Transform AI-generated text into natural, human-like writing</div>
            </div>
            
            <p>Ready to get started? Click the button below to access your dashboard:</p>
            
            <div style="text-align: center;">
              <a href="${window.location.origin}" class="cta-button">Get Started with ScribeAI</a>
            </div>
            
            <p>If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help you succeed!</p>
          </div>
          
          <div class="footer">
            <p>Best regards,<br>The ScribeAI Team</p>
            
            <div class="social-links">
              <a href="#">Website</a> | 
              <a href="#">Support</a> | 
              <a href="#">Documentation</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
              This email was sent to ${data.to}. If you didn't create an account with ScribeAI, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailText(data: EmailData): string {
    const userName = data.name || 'there';
    
    return `
Welcome to ScribeAI!

Hi ${userName},

Welcome to ScribeAI! We're excited to have you join our community of scholars, researchers, and students who are transforming their academic writing experience.

With ScribeAI, you now have access to powerful tools that will help you:

📝 Craft Scholarly Essays
Generate well-structured academic papers with proper citations and formatting

🔬 Solve Technical Problems
Get step-by-step solutions with LaTeX formatting for complex mathematical problems

📊 Analyze Documents
Upload and analyze academic papers, research documents, and technical content

🎯 Humanize Content
Transform AI-generated text into natural, human-like writing

Ready to get started? Visit your dashboard at: ${window.location.origin}

If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help you succeed!

Best regards,
The ScribeAI Team

---
This email was sent to ${data.to}. If you didn't create an account with ScribeAI, you can safely ignore this email.
    `;
  }

  private generateForgotPasswordEmailHTML(data: EmailData): string {
    const resetLink = data.resetLink || `${window.location.origin}/auth/reset-password`;
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your ScribeAI Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 24px;
            font-weight: bold;
            color: white;
          }
          .title {
            font-size: 28px;
            font-weight: 700;
            color: #2d3748;
            margin: 0 0 10px;
          }
          .subtitle {
            color: #718096;
            font-size: 16px;
            margin: 0;
          }
          .content {
            margin-bottom: 30px;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
          }
          .warning {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            color: #c53030;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">S</div>
            <h1 class="title">Reset Your Password</h1>
            <p class="subtitle">Secure access to your ScribeAI account</p>
          </div>
          
          <div class="content">
            <p>Hello,</p>
            
            <p>We received a request to reset the password for your ScribeAI account. If you made this request, click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="reset-button">Reset My Password</a>
            </div>
            
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1f2937;">${resetLink}</p>
          </div>
          
          <div class="footer">
            <p>Best regards,<br>The ScribeAI Team</p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
              This email was sent to ${data.to}. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateForgotPasswordEmailText(data: EmailData): string {
    const resetLink = data.resetLink || `${window.location.origin}/auth/reset-password`;
    
    return `
Reset Your ScribeAI Password

Hello,

We received a request to reset the password for your ScribeAI account. If you made this request, click the link below to create a new password:

${resetLink}

Security Notice: This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.

Best regards,
The ScribeAI Team

This email was sent to ${data.to}. If you didn't request a password reset, you can safely ignore this email.
    `;
  }

  private generateMagicLinkEmailHTML(data: EmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to ScribeAI</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 24px;
            font-weight: bold;
            color: white;
          }
          .title {
            font-size: 28px;
            font-weight: 700;
            color: #2d3748;
            margin: 0 0 10px;
          }
          .subtitle {
            color: #718096;
            font-size: 16px;
            margin: 0;
          }
          .content {
            margin-bottom: 30px;
          }
          .signin-button {
            display: inline-block;
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
          }
          .warning {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            color: #c53030;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">S</div>
            <h1 class="title">Sign in to ScribeAI</h1>
            <p class="subtitle">Secure access to your account</p>
          </div>
          
          <div class="content">
            <p>Hello,</p>
            
            <p>You requested a magic sign-in link for your ScribeAI account. Click the button below to go to the sign-in page:</p>
            
            <div style="text-align: center;">
              <a href="${window.location.origin}/auth" class="signin-button">Go to Sign-in Page</a>
            </div>
            
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request this sign-in link, you can safely ignore this email.
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1f2937;">${window.location.origin}/auth</p>
          </div>
          
          <div class="footer">
            <p>Best regards,<br>The ScribeAI Team</p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
              This email was sent to ${data.to}. If you didn't request a sign-in link, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateMagicLinkEmailText(data: EmailData): string {
    return `
Sign in to ScribeAI

Hello,

You requested a magic sign-in link for your ScribeAI account. Click the link below to go to the sign-in page:

${window.location.origin}/auth

Security Notice: If you didn't request this sign-in link, you can safely ignore this email.

Best regards,
The ScribeAI Team

This email was sent to ${data.to}. If you didn't request a sign-in link, you can safely ignore this email.
    `;
  }
}

export default EmailService;