import React, { useRef, useState } from 'react';
import { WorkerType, WORKER_CONFIGS } from '@/types/scribe';
import { useAuth } from '@/hooks/useAuth';
import { FormattingPreview } from '@/components/ui/FormattingPreview';
import { ScribeAIChat } from './ScribeAIChat';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, BookOpen, Calculator, FileText, Wand2, MessageSquare, Upload, X, Image as ImageIcon, Code as CodeIcon } from 'lucide-react';

// Import individual worker components
import { ScholarlyWriter } from './workers/ScholarlyWriter';
import { TechnicalWriter } from './workers/TechnicalWriter';
import { BatchProjectWriter } from './workers/BatchProjectWriter';
import { TextHumanizer } from './workers/TextHumanizer';
import { useIsMobile } from '@/hooks/use-mobile';

const WORKER_ICONS = {
  scholarly: BookOpen,
  technical: Calculator,
  batch: FileText,
};

export const ScribeAITabs: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkerType | 'humanizer' | 'preview' | 'chat'>('scholarly');
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [chatWorker, setChatWorker] = useState<WorkerType>('scholarly');
  const [chatCitationStyle, setChatCitationStyle] = useState<'APA' | 'MLA' | 'Chicago'>('APA');
  const isMobile = useIsMobile();

  // Listen for programmatic tab switches (e.g., "Open in Chat")
  React.useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.tab) setActiveTab(e.detail.tab);
    };
    window.addEventListener('scribeai:switch-tab', handler);
    return () => window.removeEventListener('scribeai:switch-tab', handler);
  }, []);

  // On mobile, default to Chat and hide tab UI; worker selection is available in Chat input as a toggle
  React.useEffect(() => {
    if (isMobile && activeTab !== 'chat') {
      setActiveTab('chat');
    }
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Scribe AI</h1>
              <p className="text-sm text-muted-foreground">Powered by ScribeAI</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkerType | 'humanizer' | 'preview')} className="w-full">
          {/* Tab Navigation */}
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="scholarly" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Scholarly Writing</span>
                <span className="sm:hidden">Scholarly</span>
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Technical & Calc</span>
                <span className="sm:hidden">Technical</span>
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Batch Project</span>
                <span className="sm:hidden">Batch</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">AI Chat</span>
                <span className="sm:hidden">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="humanizer" className="flex items-center space-x-2">
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Humanizer</span>
                <span className="sm:hidden">Humanize</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <span className="text-xs">👁️</span>
                <span className="hidden sm:inline">Preview</span>
                <span className="sm:hidden">Preview</span>
              </TabsTrigger>
            </TabsList>
          )}

          {/* Worker Overview Cards */}
          {!isMobile && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {Object.values(WORKER_CONFIGS).map((config) => {
              const Icon = WORKER_ICONS[config.id];
              const isActive = activeTab === config.id;
              
              return (
                <Card 
                  key={config.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isActive ? 'ring-2 ring-primary shadow-md' : ''
                  }`}
                  onClick={() => {
                    setActiveTab(config.id);
                    // Keep Chat worker in sync with chosen worker
                    setChatWorker(config.id);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                      <Icon className={`h-5 w-5 text-${config.color}-500`} />
                      <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs">
                      {config.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Chat Card */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeTab === 'chat' ? 'ring-2 ring-primary shadow-md' : ''
              }`}
              onClick={() => setActiveTab('chat')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-sm font-medium">AI Chat</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Conversational AI with persistent chat history and file uploads
                </CardDescription>
              </CardContent>
            </Card>
            
            {/* Humanizer Card */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeTab === 'humanizer' ? 'ring-2 ring-primary shadow-md' : ''
              }`}
              onClick={() => setActiveTab('humanizer')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Wand2 className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-sm font-medium">Text Humanizer</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Humanize AI-generated text while maintaining academic quality
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Tab Content */}
          <TabsContent value="scholarly" className="mt-0">
            <ScholarlyWriter />
          </TabsContent>

          <TabsContent value="technical" className="mt-0">
            <TechnicalWriter />
          </TabsContent>

          <TabsContent value="batch" className="mt-0">
            <BatchProjectWriter />
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            {/* Optional top-level file upload for Chat tab */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Attach files here or within the chat.</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => chatFileInputRef.current?.click()}
                  className="inline-flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload to Chat
                </Button>
                <input
                  ref={chatFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) setChatFiles(prev => [...prev, ...files]);
                    // Reset input value so selecting the same file again works
                    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
                  }}
                />
              </div>

              {chatFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                  {chatFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-background rounded-md px-3 py-2 text-sm">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : file.type.includes('text') || file.type.includes('code') ? (
                        <CodeIcon className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="truncate max-w-32">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setChatFiles(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ScribeAIChat
              injectedFiles={chatFiles}
              onFilesConsumed={() => setChatFiles([])}
              selectedWorker={chatWorker}
              onSelectedWorkerChange={setChatWorker}
              citationStyle={chatCitationStyle}
              onCitationStyleChange={setChatCitationStyle}
            />
          </TabsContent>

          <TabsContent value="humanizer" className="mt-0">
            <TextHumanizer />
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <FormattingPreview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};