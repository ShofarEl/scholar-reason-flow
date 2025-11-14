# Admin Dashboard Documentation

## Overview

The ScribeAI Admin Dashboard provides comprehensive monitoring and analytics for the application. It's exclusively accessible to `officialthinqscribe@gmail.com` and offers real-time insights into user activity, subscriptions, payments, and system health.

## Access

- **URL**: `/admin`
- **Authorization**: Only `officialthinqscribe@gmail.com` can access
- **Authentication**: Requires active Supabase session

## Features

### 1. Dashboard Overview
- **Total Users**: Complete user count with weekly growth
- **Active Subscriptions**: Current paid subscribers (Premium + Basic)
- **Total Revenue**: All-time and monthly revenue tracking
- **Trial Users**: Users currently on free trial

### 2. User Management
- **User List**: Latest 100 registered users with details:
  - Full name and email
  - Registration date and last sign-in
  - Subscription status and plan
  - Trial usage statistics
  - Total message and word usage
- **Export**: Download user data as JSON

### 3. Payment Analytics
- **Payment History**: Latest 100 transactions with:
  - Customer email and Paystack reference
  - Amount, currency, and status
  - Payment date and subscription plan
  - Success/failure tracking
- **Export**: Download payment data as JSON

### 4. Analytics Dashboard
- **Subscription Breakdown**: Premium vs Basic vs Trial distribution
- **Growth Metrics**: User acquisition and conversion rates
- **Revenue Analytics**: Total, monthly, and per-user revenue
- **User Activity**: Engagement and usage patterns
- **System Health**: Database and service status monitoring

### 5. Database Health Monitor
- **Table Status**: Checks all required database tables
- **Record Counts**: Shows data volume per table
- **Error Detection**: Identifies missing tables or connection issues
- **Setup Assistance**: Links to database setup script if needed

## Key Metrics Tracked

### User Metrics
- Total registered users
- Weekly new signups
- User retention and activity
- Trial to paid conversion rate

### Subscription Metrics
- Active subscriptions by plan
- Subscription status distribution
- Plan upgrade/downgrade tracking
- Churn analysis

### Revenue Metrics
- Total lifetime revenue
- Monthly recurring revenue
- Average revenue per user
- Payment success rates

### Usage Metrics
- AI message consumption
- Humanizer word processing
- Feature utilization rates
- Service performance

## Security Features

- **Email-based Authorization**: Hardcoded admin email check
- **Session Validation**: Requires active Supabase authentication
- **Automatic Redirects**: Unauthorized users redirected to login
- **Data Protection**: Admin-only access to sensitive analytics

## Navigation

- **Admin Button**: Appears in top-right corner for authorized users
- **Quick Access**: Direct navigation between admin and main app
- **Responsive Design**: Works on desktop and mobile devices

## Data Export

All major data sets can be exported as JSON files:
- User data with subscription details
- Payment history with transaction details
- System statistics and analytics

## Database Requirements

The dashboard requires these Supabase tables:
- `profiles` - User profile information
- `subscriptions` - Subscription plans and status
- `payment_history` - Payment transactions
- `subscription_usage` - Usage tracking
- `trial_usage` - Trial usage limits

## Troubleshooting

### Common Issues

1. **Access Denied**: Ensure you're logged in with `officialthinqscribe@gmail.com`
2. **Empty Data**: Check database setup and table creation
3. **Loading Errors**: Verify Supabase connection and permissions
4. **Export Failures**: Check browser permissions for file downloads

### Database Setup

If tables are missing:
1. Access Supabase SQL Editor
2. Run the `database-setup.sql` script
3. Verify table creation in admin dashboard
4. Check Row Level Security policies

## Performance

- **Real-time Data**: Fresh data on each page load
- **Efficient Queries**: Optimized database queries with limits
- **Caching**: Browser-level caching for static assets
- **Responsive Loading**: Progressive data loading with indicators

## Future Enhancements

Potential improvements:
- Real-time notifications for new signups/payments
- Advanced analytics with charts and graphs
- User management actions (suspend/activate)
- Automated reporting and alerts
- Integration with external analytics tools

## Support

For admin dashboard issues:
1. Check browser console for errors
2. Verify Supabase connection status
3. Ensure database tables exist and are accessible
4. Contact development team for technical support

---

**Note**: This dashboard contains sensitive business data. Access is restricted and all activities should comply with data protection policies.