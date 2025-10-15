import React, { useMemo, useRef, useState } from 'react';
import { ChatGPTMobileChat } from './ChatGPTMobileChat';
import { Button } from '@/components/ui/button';
import { WorkerType, WORKER_CONFIGS } from '@/types/scribe';
import { Upload, X, FileText, Image, Code, Settings, MessageSquare, LogOut, Menu, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (file.type.includes('text') || file.type.includes('code')) return <Code className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const MobileScribeChat: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeWorker, setActiveWorker] = useState<WorkerType>('scholarly');
  const [citationStyle, setCitationStyle] = useState<'APA' | 'MLA' | 'Chicago'>('APA');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const workerTabs = useMemo(() => Object.values(WORKER_CONFIGS), []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top App Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b bg-card/95 backdrop-blur-sm sticky top-0 z-40"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
      >
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 mr-1" onClick={() => setDrawerOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <img
            src="/AI.png"
            alt="ScribeAI"
            className="w-6 h-6 rounded object-cover"
          />
          <div className="text-base font-semibold">ScribeAI</div>
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => navigate('/humanizer')}
            title="Open Humanizer"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => navigate('/subscription')}
            title="Subscription & Billing"
          >
            <CreditCard className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut} title="Sign Out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload shortcut */}
      <div className="border-b bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) setPendingFiles((prev) => [...prev, ...files]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
          </div>
        </div>

        {pendingFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
            {pendingFiles.map((file, idx) => (
              <div key={idx} className="flex items-center space-x-2 bg-background rounded-md px-2 py-1 text-xs">
                {getFileIcon(file)}
                <span className="truncate max-w-24">{file.name}</span>
                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0">
        <ChatGPTMobileChat
          injectedFiles={pendingFiles}
          onFilesConsumed={() => setPendingFiles([])}
        />
      </div>

      {/* Drawer for account + quick actions */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div
            className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-card border-r p-4"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate max-w-[160px]">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">Signed in</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick worker switch */}
            <div className="mt-2">
              <div className="text-xs mb-2 text-muted-foreground">Workers</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(WORKER_CONFIGS).map((config) => (
                  <Button
                    key={config.id}
                    variant={activeWorker === config.id ? 'default' : 'outline'}
                    className="justify-start h-10"
                    onClick={() => setActiveWorker(config.id)}
                  >
                    <span className="mr-2">{config.icon}</span>
                    {config.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Account */}
            <div className="mt-4">
              <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileScribeChat;


