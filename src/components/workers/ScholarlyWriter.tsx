import React, { useState } from 'react';
import { useScribeChat } from '@/hooks/useScribeChat';
import { ScribeMessage } from '@/types/scribe';
import { ScribeAIService } from '@/services/scribeAIService';
import { ExportService } from '@/services/exportService';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Download, 
  Sparkles, 
  BookOpen,
  FileText,
  PenTool,
  Copy,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ScholarlyTaskType = 'essay' | 'literature-review' | 'case-study' | 'analysis';
type CitationStyle = 'APA' | 'MLA' | 'Chicago';

export const ScholarlyWriter: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskType, setTaskType] = useState<ScholarlyTaskType>('essay');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { createNewChat, addMessageToChat, switchToChat, getChatsByWorker } = useScribeChat();

  const handleSaveToChat = () => {
    if (!input.trim() || !output.trim()) return;
    const userMessage: ScribeMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: input,
      timestamp: new Date(),
      worker: 'scholarly'
    };
    const chatId = createNewChat('scholarly', userMessage);
    const assistantMessage: ScribeMessage = {
      id: crypto.randomUUID(),
      sender: 'assistant',
      content: output,
      timestamp: new Date(),
      worker: 'scholarly'
    };
    addMessageToChat(chatId, assistantMessage);
    switchToChat(chatId);
    window.dispatchEvent(new CustomEvent('scribeai:switch-tab', { detail: { tab: 'chat' } }));
    toast({ title: 'Saved to Chat', description: 'The conversation was saved and opened in Chat.' });
  };

  const handleGenerate = async () => {
    if (!input.trim() || isGenerating) return;

    setIsGenerating(true);
    setOutput('');

    try {
      const enhancedPrompt = `
ACADEMIC DISCIPLINE: ${taskType.replace('-', ' ')}
CITATION FRAMEWORK: ${citationStyle}

RESEARCH INQUIRY:
${input}

Write a sophisticated academic essay that flows as continuous scholarly prose from beginning to end. Your response must be written entirely in paragraph form without any bullet points, numbered lists, or fragmented structures. Each idea should flow seamlessly into the next through elegant transitions and logical connections.

Develop your argument through sustained paragraphs that build upon one another, creating a cohesive intellectual narrative. Rather than cataloguing points or creating lists, weave multiple concepts together within each paragraph, showing how different ideas relate to and illuminate each other. When discussing multiple aspects of a topic, integrate them into flowing prose using connecting phrases such as "furthermore," "in addition to this consideration," "building upon this foundation," or "this perspective gains additional complexity when we consider."

Your analysis should demonstrate sophisticated thinking through the natural progression of ideas rather than through structural formatting. When you need to discuss several related concepts, embed them within well-developed paragraphs that maintain narrative flow. Avoid any impulse to break ideas into separate bullet points or numbered items - instead, use sophisticated academic discourse that naturally incorporates multiple perspectives and considerations within unified paragraphs.

Use ${citationStyle} citations naturally within your prose, not as standalone elements. Employ only basic markdown formatting - use **bold** very sparingly for absolutely essential terms, and use section headers (##) only if absolutely necessary for major conceptual divisions. Never use bullet points (*), numbered lists (1.), or any other list-making formatting.

Your entire response should read like a flowing academic paper that a scholar might publish in a prestigious journal - continuous, sophisticated, and elegantly argued from start to finish. Every sentence should connect naturally to the next, creating an uninterrupted flow of scholarly discourse.`;

      let accumulatedContent = '';
      
      await ScribeAIService.sendMessage(
        enhancedPrompt,
        'scholarly',
        [],
        (chunk: string) => {
          accumulatedContent += chunk;
          setOutput(accumulatedContent);
        }
      );

      toast({
        title: 'Generation Complete',
        description: 'Your scholarly content has been generated successfully.',
      });

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate content',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    if (!output.trim()) {
      toast({
        title: 'No Content',
        description: 'No content to export.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const title = `Scholarly_${taskType}_${new Date().toISOString().split('T')[0]}`;
      await ExportService.exportContent(output, title, format);
      
      toast({
        title: 'Export Successful',
        description: `Content exported as ${format.toUpperCase()} file.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export content.',
        variant: 'destructive'
      });
    }
  };

  const copyContent = async () => {
    if (!output.trim()) {
      toast({
        title: 'No Content',
        description: 'No content to copy.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied to Clipboard',
        description: 'Content has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy content:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = output;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied to Clipboard',
        description: 'Content has been copied to your clipboard.',
      });
    }
  };

  const taskTypeOptions = [
    { value: 'essay', label: 'Essay Writing', icon: PenTool },
    { value: 'literature-review', label: 'Literature Review', icon: BookOpen },
    { value: 'case-study', label: 'Case Study', icon: FileText },
    { value: 'analysis', label: 'Academic Analysis', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <span>Scholarly Writing Model</span>
          </CardTitle>
          <CardDescription>
            Academic writing for humanities, medical sciences, business, and arts - pure research and writing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Type</label>
              <Select value={taskType} onValueChange={(value: ScholarlyTaskType) => setTaskType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Citation Style</label>
              <Select value={citationStyle} onValueChange={(value: CitationStyle) => setCitationStyle(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APA">APA Style</SelectItem>
                  <SelectItem value="MLA">MLA Style</SelectItem>
                  <SelectItem value="Chicago">Chicago Style</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Scholarly Discourse</Badge>
            <Badge variant="outline">Theoretical Integration</Badge>
            <Badge variant="outline">Citation Support</Badge>
            <Badge variant="outline">Original Analysis</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Request</CardTitle>
          <CardDescription>
            Describe your scholarly writing task, research question, or topic for analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Example: "Write a comprehensive literature review on the impact of digital transformation on organizational culture in healthcare institutions. Include theoretical frameworks from organizational behavior and change management literature."`}
            className="min-h-[120px]"
            disabled={isGenerating}
          />
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              {input.length} characters
            </span>
            <Button 
              onClick={handleGenerate}
              disabled={!input.trim() || isGenerating}
              className="flex items-center space-x-2"
            >
              {isGenerating ? (
                <Sparkles className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Output Section */}
      {(output || isGenerating) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Content</CardTitle>
              {output && !isGenerating && (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyContent}
                    className="flex items-center space-x-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('docx')}>
                        Export as DOCX
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('txt')}>
                        Export as TXT
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="default" size="sm" onClick={handleSaveToChat}>
                    Open in Chat
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-4 rounded-lg border">
              {output ? (
                <MarkdownRenderer 
                  content={output} 
                  className="max-w-none" 
                />
              ) : (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Generating scholarly content...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scholarly History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Scholarly Chats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {getChatsByWorker('scholarly').slice(0, 5).map(chat => (
            <div key={chat.id} className="flex items-center justify-between text-sm">
              <span className="truncate mr-2">{chat.title}</span>
              <Button size="sm" variant="outline" onClick={() => { switchToChat(chat.id); window.dispatchEvent(new CustomEvent('scribeai:switch-tab', { detail: { tab: 'chat' } })); }}>Open</Button>
            </div>
          ))}
          {getChatsByWorker('scholarly').length === 0 && (
            <div className="text-xs text-muted-foreground">No saved scholarly chats yet.</div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tips for Exceptional Academic Writing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Be intellectually ambitious:</strong> Pose complex questions that engage with current scholarly debates</p>
            <p><strong>Provide rich context:</strong> Include your academic level, discipline, and any specific theoretical approaches</p>
            <p><strong>Specify scope and depth:</strong> Indicate desired length, key concepts to explore, or particular perspectives to consider</p>
            <p><strong>Request synthesis:</strong> Ask for integration of multiple sources or theoretical frameworks rather than simple summaries</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};