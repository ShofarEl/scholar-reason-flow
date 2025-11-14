import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Database, ExternalLink } from 'lucide-react';

export const DatabaseSetupRequired: React.FC = () => {
  const setupSteps = [
    'Go to your Supabase project dashboard',
    'Navigate to the SQL Editor tab',
    'Copy the contents of database-setup.sql file',
    'Paste it into the SQL Editor',
    'Click Run to execute the script',
    'Refresh this page'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-8 w-8 text-orange-500" />
            <CardTitle className="text-2xl">Database Setup Required</CardTitle>
          </div>
          <CardDescription>
            The admin dashboard requires database tables to be set up in Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Database className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Missing Database Tables</h3>
                <p className="text-sm text-orange-700">
                  The required database tables (profiles, subscriptions, payment_history, etc.) 
                  haven't been created yet. Please run the database setup script.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Setup Steps:</h3>
            <ol className="space-y-2">
              {setupSteps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-3">
            <Button asChild className="flex-1">
              <a 
                href="https://supabase.com/dashboard/project/unhulaavbftqpvflarqi/sql/new" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase SQL Editor
              </a>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>

          <div className="p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Database Setup Script Location:</h4>
            <code className="text-xs bg-white px-2 py-1 rounded border">
              database-setup.sql
            </code>
            <p className="text-xs text-gray-600 mt-2">
              This file is in the root of your project directory.
            </p>
          </div>

          <div className="text-xs text-gray-500 border-t pt-4">
            <p><strong>Note:</strong> You only need to run this setup once. After the tables are created, 
            the admin dashboard will load automatically.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};