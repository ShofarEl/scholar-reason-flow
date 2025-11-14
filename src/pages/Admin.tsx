import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CreditCard, Activity, TrendingUp, RefreshCw, Download, Calendar, DollarSign } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { DatabaseHealth } from '@/components/admin/DatabaseHealth';
import { DatabaseSetupRequired } from '@/components/admin/DatabaseSetupRequired';

export default function Admin() {
  const navigate = useNavigate();
  const {
    isAuthorized,
    loading,
    stats,
    users,
    payments,
    refreshData,
    exportData,
  } = useAdmin();

  const [databaseError, setDatabaseError] = React.useState(false);

  React.useEffect(() => {
    if (!loading && isAuthorized && !stats && users.length === 0) {
      setDatabaseError(true);
    }
  }, [loading, isAuthorized, stats, users]);

  React.useEffect(() => {
    if (isAuthorized === false) {
      navigate('/auth');
    }
  }, [isAuthorized, navigate]);

  if (isAuthorized === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isAuthorized === null ? 'Checking authorization...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null; // redirect handled above
  }

  if (databaseError) {
    return <DatabaseSetupRequired />;
  }

  const safeNumber = (v: number | undefined | null) => (v ?? 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">ScribeAI Analytics & Management</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportData('stats')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Stats
            </Button>
            <Button onClick={() => refreshData(true)} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeNumber(stats?.totalUsers)}</div>
              <p className="text-xs text-muted-foreground">+{safeNumber(stats?.recentSignups)} this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeNumber(stats?.activeSubscriptions)}</div>
              <p className="text-xs text-muted-foreground">
                {safeNumber(stats?.premiumUsers)} premium, {safeNumber(stats?.basicUsers)} basic
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{(safeNumber(stats?.totalRevenue)).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ₦{(safeNumber(stats?.monthlyRevenue)).toLocaleString()} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeNumber(stats?.trialUsers)}</div>
              <p className="text-xs text-muted-foreground">Active trial accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Data */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest 100 registered users</CardDescription>
                </div>
                <Button onClick={() => exportData('users')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Users
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                          {user.last_sign_in_at && (
                            <span className="ml-2">• Last seen: {new Date(user.last_sign_in_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.subscription ? (
                          <div className="text-right">
                            <Badge variant={(user.subscription?.status === 'active') ? 'default' : 'secondary'}>
                              {user.subscription?.plan ?? 'plan'} - {user.subscription?.status ?? 'status'}
                            </Badge>
                            {user.subscription?.end_date && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Expires: {new Date(user.subscription.end_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-right">
                            <Badge variant="outline">Trial</Badge>
                            {user.trial_usage && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {safeNumber(user.trial_usage.ai_messages)} msgs used
                              </div>
                            )}
                          </div>
                        )}
                        {user.usage_stats && (
                          <div className="text-xs text-muted-foreground text-right">
                            <div>{safeNumber(user.usage_stats.total_messages)} total msgs</div>
                            <div>{safeNumber(user.usage_stats.total_words)} words</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Latest payment transactions</CardDescription>
                </div>
                <Button onClick={() => exportData('payments')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Payments
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{payment.customer_email}</div>
                        <div className="text-sm text-muted-foreground">
                          Ref: {payment.paystack_reference}{payment.subscription ? <span className="ml-2">• {payment.subscription.plan} plan</span> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payment.status === 'success' ? new Date(payment.created_at).toLocaleString() : 'Pending'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-medium">{payment.currency} {safeNumber(payment.amount).toLocaleString()}</div>
                          <Badge variant={
                            payment.status === 'success' ? 'default' :
                            payment.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Premium Users:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{safeNumber(stats?.premiumUsers)}</span>
                        <Badge variant="default" className="text-xs">
                          {safeNumber(stats?.totalUsers) ? ((safeNumber(stats?.premiumUsers) / safeNumber(stats?.totalUsers)) * 100).toFixed(1) : '0.0'}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Basic Users:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{safeNumber(stats?.basicUsers)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {safeNumber(stats?.totalUsers) ? ((safeNumber(stats?.basicUsers) / safeNumber(stats?.totalUsers)) * 100).toFixed(1) : '0.0'}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Trial Users:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{safeNumber(stats?.trialUsers)}</span>
                        <Badge variant="outline" className="text-xs">
                          {safeNumber(stats?.totalUsers) ? ((safeNumber(stats?.trialUsers) / safeNumber(stats?.totalUsers)) * 100).toFixed(1) : '0.0'}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>Total Active:</span>
                      <span>{safeNumber(stats?.activeSubscriptions)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Growth Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Users:</span>
                      <span className="font-medium">{safeNumber(stats?.totalUsers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New This Week:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{safeNumber(stats?.recentSignups)}</span>
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Conversion Rate:</span>
                      <span className="font-medium">
                        {safeNumber(stats?.totalUsers) ? ((safeNumber(stats?.activeSubscriptions) / safeNumber(stats?.totalUsers)) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium Rate:</span>
                      <span className="font-medium">
                        {safeNumber(stats?.activeSubscriptions) ? ((safeNumber(stats?.premiumUsers) / safeNumber(stats?.activeSubscriptions)) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Revenue:</span>
                      <span className="font-medium">₦{safeNumber(stats?.totalRevenue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Revenue:</span>
                      <span className="font-medium">₦{safeNumber(stats?.monthlyRevenue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg per User:</span>
                      <span className="font-medium">
                        ₦{safeNumber(stats?.activeSubscriptions) ? (safeNumber(stats?.totalRevenue) / safeNumber(stats?.activeSubscriptions)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium Revenue (est):</span>
                      <span className="font-medium">
                        ₦{stats?.premiumUsers && stats?.totalRevenue && stats?.totalUsers ? 
                          Math.round((stats.totalRevenue * stats.premiumUsers) / Math.max(1, stats.totalUsers)).toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Database Health */}
        <div className="mt-8">
          <DatabaseHealth />
        </div>
      </div>
    </div>
  );
}