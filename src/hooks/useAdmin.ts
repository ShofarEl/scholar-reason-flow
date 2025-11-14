import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'officialthinqscribe@gmail.com';

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  trialUsers: number;
  recentSignups: number;
  premiumUsers: number;
  basicUsers: number;
  monthlyRevenue: number;
  weeklySignups: number;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  last_sign_in_at?: string;
  subscription?: {
    plan?: string;
    status?: string;
    end_date?: string;
    start_date?: string;
  } | null;
  trial_usage?: {
    ai_messages?: number;
    tokens_used?: number;
  } | null;
  usage_stats?: {
    total_messages: number;
    total_words: number;
  };
  payment?: any | null;
}

export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer_email: string;
  paid_at?: string | null;
  created_at: string;
  paystack_reference: string;
  subscription?: {
    plan?: string;
    user_email?: string;
  } | null;
}

export const useAdmin = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);

  const checkAuthorization = async (): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = (data as any)?.session;

      if (!session?.user) {
        setIsAuthorized(false);
        return false;
      }

      // Prefer environment or JWT admin claim if available
      const jwt = supabase.auth.getUser; // placeholder for jwt usage; we use email fallback below
      const authorized = session.user.email === ADMIN_EMAIL;
      setIsAuthorized(authorized);

      if (!authorized) {
        toast({
          title: 'Unauthorized Access',
          description: "You don't have permission to access the admin dashboard.",
          variant: 'destructive',
        });
      }

      return authorized;
    } catch (error) {
      console.error('Authorization check failed:', error);
      setIsAuthorized(false);
      return false;
    }
  };

  const loadStats = async (): Promise<AdminStats> => {
    try {
      // Total users
      const { count: totalUsers, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profilesError) {
        console.error('Error loading profiles count:', profilesError);
      }

      // Active subscriptions count
      const { count: activeSubscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (subsError) {
        console.error('Error loading subscriptions count:', subsError);
      }

      // Subscription breakdown (active)
      const { data: subscriptionData, error: subsDataError } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('status', 'active');

      if (subsDataError) {
        console.error('Error loading subscription data:', subsDataError);
      }

      const premiumUsers = subscriptionData?.filter((s: any) => s.plan === 'premium').length || 0;
      const basicUsers = subscriptionData?.filter((s: any) => s.plan === 'basic').length || 0;

      // Revenue using created_at (payment_history has created_at, not paid_at)
      const { data: revenueData, error: revenueError } = await supabase
        .from('payment_history')
        .select('amount, created_at, status')
        .eq('status', 'success');

      if (revenueError) {
        console.error('Error loading revenue data:', revenueError);
      }

      const totalRevenue = revenueData?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) || 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyRevenue = revenueData
        ?.filter((payment: any) => payment.created_at && new Date(payment.created_at) >= thirtyDaysAgo)
        .reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) || 0;

      // Trial users count
      const { count: trialUsers, error: trialError } = await supabase
        .from('trial_usage')
        .select('*', { count: 'exact', head: true });

      if (trialError) {
        console.error('Error loading trial users count:', trialError);
      }

      // Recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentSignups, error: recentError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      if (recentError) {
        console.error('Error loading recent signups:', recentError);
      }

      // Weekly signups (same as recentSignups in your original impl)
      const weeklySignups = recentSignups || 0;

      const statsData: AdminStats = {
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        totalRevenue,
        monthlyRevenue,
        trialUsers: trialUsers || 0,
        recentSignups: recentSignups || 0,
        weeklySignups,
        premiumUsers,
        basicUsers,
      };

      setStats(statsData);
      return statsData;
    } catch (error) {
      console.error('Failed to load stats:', error);
      throw error;
    }
  };

  // New function: uses RPC get_admin_dashboard_data to fetch enriched users and payments
  const loadEnrichedData = async (limitUsers = 100) => {
    try {
      // Call the RPC we created server-side
      const { data, error } = await supabase
        .rpc('get_admin_dashboard_data', { limit_users: limitUsers });

      if (error) {
        console.error('Error calling get_admin_dashboard_data:', error);
        throw error;
      }

      // RPC returns rows with user_id, full_name, created_at, email, subscription, trial_usage, usage_stats, payment
      const enrichedUsers: AdminUser[] = (data || []).map((row: any) => {
        return {
          id: row.user_id,
          full_name: row.full_name ?? row.name ?? null,
          created_at: row.created_at,
          email: row.email || `User ${String(row.user_id).substring(0, 8)}`,
          subscription: row.subscription || null,
          trial_usage: row.trial_usage || null,
          usage_stats: {
            total_messages: (row.usage_stats?.total_messages ?? 0),
            total_words: (row.usage_stats?.total_words ?? 0),
          },
          payment: row.payment || null,
        };
      });

      // Build payments list from returned payment objects (flatten & filter)
      const paymentsList: AdminPayment[] = (data || [])
        .map((row: any) => {
          const p = row.payment;
          if (!p) return null;
          return {
            id: p.id || `${row.user_id}-${String(p.paystack_reference || p.created_at)}`,
            amount: Number(p.amount || 0),
            currency: p.currency || 'NGN',
            status: p.status || 'unknown',
            customer_email: p.customer_email || row.email || '',
            paid_at: p.paid_at || null,
            created_at: p.created_at || p.created_at || '',
            paystack_reference: p.paystack_reference || '',
            subscription: p.subscription_id ? { plan: undefined, user_email: row.email } : undefined,
          } as AdminPayment;
        })
        .filter(Boolean) as AdminPayment[];

      setUsers(enrichedUsers);
      setPayments(paymentsList);

      return { users: enrichedUsers, payments: paymentsList };
    } catch (error) {
      console.error('Failed to load enriched data:', error);
      throw error;
    }
  };

  const refreshData = async (showToast: boolean = true) => {
    try {
      setLoading(true);
      // Use RPC for users/payments, loadStats separately (small)
      await Promise.all([loadStats(), loadEnrichedData(100)]);

      if (showToast) {
        toast({
          title: 'Data Refreshed',
          description: 'Dashboard data has been updated successfully.',
        });
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
      if (showToast) {
        toast({
          title: 'Refresh Failed',
          description: 'Failed to refresh dashboard data. Please try again.',
          variant: 'destructive',
        });
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: 'users' | 'payments' | 'stats') => {
    try {
      let data: any;
      let filename: string;

      switch (type) {
        case 'users':
          data = users;
          filename = `users-export-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'payments':
          data = payments;
          filename = `payments-export-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'stats':
          data = stats;
          filename = `stats-export-${new Date().toISOString().split('T')[0]}.json`;
          break;
        default:
          throw new Error('Invalid export type');
      }

      if (typeof window === 'undefined') {
        throw new Error('Export must be run in a browser environment.');
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `${type} data has been exported successfully.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const initializeAdmin = async () => {
      try {
        const authorized = await checkAuthorization();
        if (authorized) {
          try {
            await refreshData(false);
          } catch (dataError) {
            console.error('Failed to load admin data:', dataError);
          }
        }
      } catch (authError) {
        console.error('Authorization failed:', authError);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isAuthorized,
    loading,
    stats,
    users,
    payments,
    checkAuthorization,
    refreshData,
    exportData,
  };
};