import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Lock, Loader2, User, Eye, EyeOff, Chrome } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/ui/logo';
import EmailService from '@/services/emailService';


const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [lastResetTime, setLastResetTime] = useState(0);
  const [resetCooldown, setResetCooldown] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('User already authenticated, redirecting to home');
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const validateSignInForm = () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return false;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const validateSignUpForm = () => {
    if (!email || !password || !fullName || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return false;
    }

    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignUpForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Attempting to sign up with email:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            display_name: fullName.trim()
          }
        }
      });

      if (error) {
        console.log('Supabase signup error:', error);
        setError(error.message);
      } else {
        console.log('Signup successful:', data);
        
        // Send welcome email to the registered user's email
        try {
          console.log('🎯 About to send welcome email');
          console.log('📧 User email from form:', email.trim());
          console.log('👤 User name from form:', fullName.trim());
          
          const emailService = EmailService.getInstance();
          const result = await emailService.sendWelcomeEmail({
            to: email.trim(), // Use the exact email from the form
            name: fullName.trim()
          });
          
          if (result.success) {
            console.log('✅ Welcome email sent successfully to user');
          } else {
            console.error('❌ Welcome email failed:', result.error);
          }
        } catch (emailError) {
          console.error('❌ Failed to send welcome email:', emailError);
          // Don't fail the signup if email fails
        }
        
        toast({
          title: "Account created successfully!",
          description: `Welcome email sent to ${email.trim()}! You can now sign in with your credentials.`,
        });
        
        // Clear the form
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'An unexpected error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignInForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Attempting to sign in with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.log('Supabase signin error:', error);
        
        // Provide more specific error messages
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a moment and try again.');
        } else {
          setError(error.message);
        }
      } else if (data.user) {
        console.log('User signed in successfully:', data.user.email);
        
        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Signin error:', error);
      setError(error.message || 'An unexpected error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider, 
        options: { redirectTo: window.location.origin } 
      });
      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'OAuth sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const sendMagicLink = async () => {
    const emailToUse = forgotEmail || email;
    
    if (!emailToUse || !emailToUse.includes('@')) {
      setError('Enter a valid email to receive a login link');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const emailService = EmailService.getInstance();
      const result = await emailService.sendMagicLinkEmail(emailToUse.trim());
      
      if (result.success) {
        toast({ 
          title: 'Magic link sent', 
          description: 'If this email is registered, you will receive a sign-in link shortly.' 
        });
        setForgotOpen(false);
        setForgotEmail('');
      } else {
        setError(result.error || 'Failed to send magic link');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  // Effect to handle cooldown timer for password reset
  useEffect(() => {
    if (resetCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResetCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const sendPasswordReset = async () => {
    const emailToUse = forgotEmail || email;
    
    if (!emailToUse || !emailToUse.includes('@')) {
      setError('Enter a valid email to reset your password');
      return;
    }
    
    // Check for rate limiting
    const now = Date.now();
    const timeSinceLastReset = now - lastResetTime;
    const rateLimitMs = 60 * 1000; // 60 seconds
    
    if (timeSinceLastReset < rateLimitMs) {
      const waitSeconds = Math.ceil((rateLimitMs - timeSinceLastReset) / 1000);
      setResetCooldown(waitSeconds);
      setError(`For security purposes, you can only request this after ${waitSeconds} seconds.`);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const emailService = EmailService.getInstance();
      const result = await emailService.sendForgotPasswordEmail(emailToUse.trim());
      
      if (result.success) {
        // Update rate limit tracking
        setLastResetTime(Date.now());
        
        toast({ 
          title: 'Password reset sent', 
          description: 'If this email is registered, you will receive a password reset link shortly.' 
        });
        setForgotOpen(false);
        setForgotEmail('');
      } else {
        // Check if the error is related to rate limiting
        if (result.error?.toLowerCase().includes('security purposes') || 
            result.error?.toLowerCase().includes('rate limit')) {
          const match = result.error.match(/(\d+)\s+seconds/);
          if (match && match[1]) {
            setResetCooldown(parseInt(match[1]));
          } else {
            setResetCooldown(60); // Default to 60 seconds
          }
        }
        setError(result.error || 'Failed to send password reset email');
      }
    } catch (err: any) {
      // Check if the error is related to rate limiting
      if (err.message?.toLowerCase().includes('security purposes') || 
          err.message?.toLowerCase().includes('rate limit')) {
        const match = err.message.match(/(\d+)\s+seconds/);
        if (match && match[1]) {
          setResetCooldown(parseInt(match[1]));
        } else {
          setResetCooldown(60); // Default to 60 seconds
        }
      }
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4 touch-manipulation">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:block">
          <div className="relative rounded-3xl border border-white/20 bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur p-8 shadow-xl overflow-hidden">
            <div className="absolute -top-16 -right-16 h-64 w-64 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-64 w-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                    <Logo size="md" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">ScribeAI</div>
                    <div className="text-sm text-white/80">Academic writing and technical solutions</div>
                  </div>
                </div>
              <div className="space-y-3 text-sm text-white/90">
                <div className="p-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">Craft scholarly essays with citations and structured markdown.</div>
                <div className="p-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">Solve technical problems with step-by-step LaTeX formatting.</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-center mb-6 md:mb-8 md:hidden">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <Logo size="md" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              ScribeAI
            </h1>
            <p className="text-muted-foreground mt-2">Your intelligent academic companion</p>
          </div>

          <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-2xl text-center">Welcome</CardTitle>
              <CardDescription className="text-center">Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-5">
                <Button 
                  variant="outline" 
                  className="w-full touch-manipulation" 
                  disabled={loading} 
                  onClick={() => handleOAuth('google')}
                  type="button"
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Continue with Google
                </Button>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or continue with email</span>
                <Separator className="flex-1" />
              </div>

              {error && (
                <Alert className="mb-4 border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="signup" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signin-email" 
                          type="email" 
                          placeholder="Enter your email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          className="pl-10" 
                          disabled={loading} 
                          autoComplete="email" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signin-password" 
                          type={showSignInPassword ? 'text' : 'password'} 
                          placeholder="Enter your password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className="pl-10 pr-10" 
                          disabled={loading} 
                          autoComplete="current-password" 
                        />
                        <button 
                          type="button" 
                          className="absolute right-3 top-2.5 text-muted-foreground" 
                          onClick={() => setShowSignInPassword((v) => !v)} 
                          aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          checked={rememberMe} 
                          onChange={(e) => setRememberMe(e.target.checked)} 
                        />
                        Remember me
                      </label>
                      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                        <DialogTrigger asChild>
                          <button type="button" className="text-sm text-primary hover:underline">
                            Trouble signing in?
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Get help signing in</DialogTitle>
                            <DialogDescription>
                              We can send you a magic login link or a password reset email.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <Label htmlFor="help-email">Email</Label>
                            <Input 
                              id="help-email" 
                              type="email" 
                              placeholder="you@example.com" 
                              value={forgotEmail} 
                              onChange={(e) => setForgotEmail(e.target.value)} 
                            />
                          </div>
                          {error && (
                            <Alert className="border-destructive/50 bg-destructive/10">
                              <AlertDescription className="text-destructive">{error}</AlertDescription>
                            </Alert>
                          )}
                          <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={sendMagicLink} disabled={loading}>
                              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Send magic link
                            </Button>
                            <Button 
                              onClick={sendPasswordReset} 
                              disabled={loading || resetCooldown > 0}
                            >
                              {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : resetCooldown > 0 ? (
                                <span className="mr-2">{resetCooldown}s</span>
                              ) : null}
                              {resetCooldown > 0 ? 'Please wait...' : 'Send reset email'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-name" 
                          type="text" 
                          placeholder="Enter your full name" 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)} 
                          className="pl-10" 
                          disabled={loading} 
                          autoComplete="name" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-email" 
                          type="email" 
                          placeholder="Enter your email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          className="pl-10" 
                          disabled={loading} 
                          autoComplete="email" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-password" 
                          type={showSignUpPassword ? 'text' : 'password'} 
                          placeholder="Create a password (min 6 characters)" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className="pl-10 pr-10" 
                          disabled={loading} 
                          autoComplete="new-password" 
                        />
                        <button 
                          type="button" 
                          className="absolute right-3 top-2.5 text-muted-foreground" 
                          onClick={() => setShowSignUpPassword((v) => !v)} 
                          aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Use at least 6 characters. Add numbers and symbols for a stronger password.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-confirm" 
                          type={showSignUpConfirmPassword ? 'text' : 'password'} 
                          placeholder="Re-enter your password" 
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)} 
                          className="pl-10 pr-10" 
                          disabled={loading} 
                          autoComplete="new-password" 
                        />
                        <button 
                          type="button" 
                          className="absolute right-3 top-2.5 text-muted-foreground" 
                          onClick={() => setShowSignUpConfirmPassword((v) => !v)} 
                          aria-label={showSignUpConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignUpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;