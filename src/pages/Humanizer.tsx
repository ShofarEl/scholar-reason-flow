import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MobileHumanizer from '@/mobile/MobileHumanizer';
import { ArrowLeft } from 'lucide-react';

const HumanizerPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className="flex items-center justify-between px-4 py-3 border-b bg-card/95 backdrop-blur-sm sticky top-0 z-40"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <Button variant="ghost" size="sm" className="h-10 px-3" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="font-semibold">Humanizer</div>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <div className="w-full max-w-lg mx-auto">
          <MobileHumanizer />
        </div>
      </div>
    </div>
  );
};

export default HumanizerPage;


