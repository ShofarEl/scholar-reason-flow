import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquare as ChatIcon, Wand2 as HumanizerIcon, Crown as SubscriptionIcon } from 'lucide-react';
import { ChatGPTInterface } from './ChatGPTInterface';
import MobileHumanizer from '@/mobile/MobileHumanizer';
import { SubscriptionStatus } from './subscription/SubscriptionStatus';
import { SubscriptionPlans } from './subscription/SubscriptionPlans';
import { useSubscription } from '@/hooks/useSubscription';

export const ScribeAITabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { hasActiveSubscription } = useSubscription();

  return (
    <div className="flex h-screen bg-chat-bg">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col w-full">
        {/* Tab Navigation */}
        <div className="border-b bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-3">
              <img src="/AI.png" alt="ScribeAI" className="w-8 h-8 rounded-lg object-cover" />
              <h1 className="text-lg font-semibold">ScribeAI</h1>
            </div>
            
            <TabsList className="grid w-auto grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <ChatIcon className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="humanizer" className="flex items-center space-x-2">
                <HumanizerIcon className="h-4 w-4" />
                <span>Humanizer</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center space-x-2">
                <SubscriptionIcon className="h-4 w-4" />
                <span>Subscription</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full m-0">
            <ChatGPTInterface />
          </TabsContent>
          
          <TabsContent value="humanizer" className="h-full m-0">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="w-full max-w-4xl mx-auto">
                  <MobileHumanizer />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="subscription" className="h-full m-0">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                  <SubscriptionStatus />
                  <SubscriptionPlans />
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};