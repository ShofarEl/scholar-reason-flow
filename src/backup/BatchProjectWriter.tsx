import React, { useState, useEffect } from 'react';
import { useScribeChat } from '@/hooks/useScribeChat';
import { ScribeMessage } from '@/types/scribe';
import { BatchAPIService } from '@/services/batchAPIService';
import { ExportService } from '@/services/exportService';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { BatchProjectConfig, BatchOutline } from '@/types/scribe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Download, 
  Sparkles, 
  FileText,
  CheckCircle,
  Clock,
  Edit3,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Target,
  Timer
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

type ProjectPhase = 'input' | 'outline' | 'generating' | 'completed';

interface BatchStats {
  totalWords: number;
  avgWordsPerSection: number;
  successRate: number;
  totalTokens: number;
  targetWords: number;
  actualWords: number;
}

export const BatchProjectWriter: React.FC = () => {
  const [phase, setPhase] = useState<ProjectPhase>('input');
  const [config, setConfig] = useState<BatchProjectConfig>({
    topic: '',
    requirements: '',
    citationStyle: 'APA',
    estimatedLength: 'medium',
    includeReferences: true
  });
  const [outline, setOutline] = useState<BatchOutline | null>(null);
  const [finalContent, setFinalContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [batchAvailable, setBatchAvailable] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();
  const { createNewChat, addMessageToChat, switchToChat, getChatsByWorker } = useScribeChat();

  // Check batch availability on component mount
  useEffect(() => {
    checkBatchAvailability();
  }, []);

    const checkBatchAvailability = async () => {
    try {
      const availability = await BatchAPIService.checkBatchAvailability();
      setBatchAvailable(availability.available);
    
      if (!availability.available) {
        toast({
          title: 'Batch Processing Unavailable',
          description: availability.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      setBatchAvailable(false);
    }
  };

  const debugBatchConfiguration = async () => {
    try {
      const debug = await BatchAPIService.debugBatchConfiguration();
      const debugText = `Debug Info:
- Supabase URL: ${debug.supabaseUrl}
- Has API Key: ${debug.hasApiKey}
- Endpoint Accessible: ${debug.endpointAccessible}
- Message: ${debug.message}`;
      
      setDebugInfo(debugText);
      console.log('Batch Debug Info:', debug);
      
      toast({
        title: 'Debug Info Retrieved',
        description: 'Check console for detailed batch configuration information.',
      });
    } catch (error) {
      toast({
        title: 'Debug Failed',
        description: error instanceof Error ? error.message : 'Failed to get debug information',
        variant: 'destructive'
      });
    }
  };

  const debugBatchResults = async () => {
    if (!batchId) {
      toast({
        title: 'No Batch ID',
        description: 'No batch ID available for debugging.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const debug = await BatchAPIService.debugBatchResults(batchId);
      const debugText = `Batch Debug Results:
- Batch ID: ${debug.batchId}
- Success: ${debug.success}
- Status: ${JSON.stringify(debug.status, null, 2)}
- Debug Results: ${JSON.stringify(debug.debugResults, null, 2)}`;
      
      setDebugInfo(debugText);
      console.log('Batch Results Debug Info:', debug);
      
      toast({
        title: 'Batch Debug Results Retrieved',
        description: 'Check console for detailed batch results debugging information.',
      });
    } catch (error) {
      toast({
        title: 'Batch Debug Failed',
        description: error instanceof Error ? error.message : 'Failed to get batch debug information',
        variant: 'destructive'
      });
    }
  };

  const handleGenerateOutline = async () => {
    if (!config.topic.trim() || !config.requirements.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both topic and requirements.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Determine section count from explicit control or preset
      const presetSections = config.estimatedLength === 'short' ? 5 : 
                            config.estimatedLength === 'medium' ? 8 : 12;
      const sectionCount = config.sectionsCount && config.sectionsCount > 0 ? config.sectionsCount : presetSections;

      // Compute target words based on pages if provided, else fallback to 2500/section
      const wordsPerPage = config.wordsPerPage && config.wordsPerPage > 0 ? config.wordsPerPage : 300;
      const targetWordsFromPages = config.targetPages && config.targetPages > 0 ? config.targetPages * wordsPerPage : undefined;
      const wordsPerSection = targetWordsFromPages ? Math.max(1200, Math.floor(targetWordsFromPages / sectionCount)) : 2500;
      
      const outlineSections = [
        'Introduction and Background',
        'Literature Review and Theoretical Framework',
        'Methodology and Research Design',
        'Data Analysis and Findings',
        'Discussion and Interpretation',
        ...(sectionCount > 5 ? ['Case Studies and Applications'] : []),
        ...(sectionCount > 6 ? ['Comparative Analysis'] : []),
        ...(sectionCount > 7 ? ['Policy Implications'] : []),
        ...(sectionCount > 8 ? ['Future Research Directions'] : []),
        ...(sectionCount > 9 ? ['Limitations and Considerations'] : []),
        ...(sectionCount > 10 ? ['Recommendations'] : []),
        'Conclusion and Summary'
      ].slice(0, sectionCount);
      
      const generatedOutline: BatchOutline = {
        title: config.topic,
        chapters: outlineSections.map((title, index) => ({
          number: index + 1,
          title,
          subchapters: [],
          estimatedLength: wordsPerSection
        })),
        totalEstimatedTokens: sectionCount * wordsPerSection,
        figureCount: Math.floor(sectionCount * 1.5)
      };
      
      setOutline(generatedOutline);
      setPhase('outline');

      // Calculate estimated processing time
      const timeEstimate = BatchAPIService.estimateProcessingTime(sectionCount);
      setEstimatedTime(`${timeEstimate.minMinutes}-${timeEstimate.maxMinutes} minutes`);
      
      toast({
        title: 'Comprehensive Outline Generated',
        description: `${sectionCount} sections planned for ${(sectionCount * wordsPerSection).toLocaleString()} words. Review and proceed to batch generation.`,
      });
    } catch (error) {
      console.error('Outline generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate outline',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateProject = async () => {
    if (!outline || !batchAvailable) return;

    setIsGenerating(true);
    setPhase('generating');
    setProgress(0);
    setStartTime(new Date());
    setBatchStats(null);

    try {
      // Extract section titles from outline
      const sectionTitles = outline.chapters.map(chapter => chapter.title);
      
      console.log(`🚀 Starting batch generation for ${sectionTitles.length} sections`);
      console.log(`🎯 Target: ${sectionTitles.length * 2500} words total`);
      console.log(`📝 Section titles:`, sectionTitles);

      // Use the enhanced batch API service with timeout
      const sections = await Promise.race([
        BatchAPIService.processBatchProject(
          sectionTitles,
          config.topic,
          config.citationStyle,
          (newBatchId) => {
            setBatchId(newBatchId);
          },
          (status) => {
            // Update progress based on batch status; guard against zero counts
            const total = Math.max(status.requestCount || 0, 1);
            const done = Math.min(status.completedCount || 0, total);
            const progressPercent = (done / total) * 100;
            setProgress(progressPercent);

            console.log(`📊 Batch progress: ${done}/${total} (${progressPercent.toFixed(1)}%)`);
            console.log(`📊 Batch status: ${status.status} - ${status.message}`);

            // Update batch stats if available
            if (typeof status.actualWordCount === 'number') {
              setBatchStats({
                totalWords: status.actualWordCount,
                avgWordsPerSection: Math.round(status.actualWordCount / total),
                successRate: (done / total) * 100,
                totalTokens: 0,
                targetWords: status.targetWordCount || sectionTitles.length * 2500,
                actualWords: status.actualWordCount
              });
            }
          },
          (sectionIndex, content) => {
            // Handle individual section completion
            const wordCount = content.split(/\s+/).length;
            console.log(`✅ Section ${sectionIndex + 1} completed: ${wordCount} words`);
          },
          {
            includeFigures: config.includeFigures ?? true,
            includeTables: config.includeTables ?? true,
            targetWordsPerSection: outline.chapters[0]?.estimatedLength ?? 2500
          }
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Batch processing timeout after 30 minutes. Please try again with a smaller project or contact support.')), 30 * 60 * 1000)
        )
      ]);
      
      // Combine all sections with clear separators
      const combinedContent = sections.map((section, index) => {
        const sectionTitle = sectionTitles[index];
        return `# Chapter ${index + 1}: ${sectionTitle}\n\n${section}`;
      }).join('\n\n' + '='.repeat(80) + '\n\n');
      
      setFinalContent(combinedContent);
      setPhase('completed');

      // Save to Chat history
      const userMessage: ScribeMessage = {
        id: crypto.randomUUID(),
        sender: 'user',
        content: `Batch Project: ${outline?.title || 'Untitled Project'}\n\n${sectionTitles.map((t,i)=>`${i+1}. ${t}`).join('\n')}`,
        timestamp: new Date(),
        worker: 'batch'
      };
      const chatId = createNewChat('batch', userMessage);
      const assistantMessage: ScribeMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        content: combinedContent,
        timestamp: new Date(),
        worker: 'batch'
      };
      addMessageToChat(chatId, assistantMessage);

      // Calculate final statistics
      const finalStats = BatchAPIService.getBatchStats(
        sections.map((content, index) => ({
          id: sectionTitles[index],
          content,
          status: 'success',
          tokens: Math.floor(content.length / 4), // Rough token estimate
          wordCount: content.split(/\s+/).length
        }))
      );

      setBatchStats({
        totalWords: finalStats.totalWords,
        avgWordsPerSection: Math.round(finalStats.avgWordsPerSection),
        successRate: finalStats.successRate,
        totalTokens: finalStats.totalTokens,
        targetWords: sectionTitles.length * 2500,
        actualWords: finalStats.totalWords
      });
      
      toast({
        title: 'Batch Project Generated Successfully!',
        description: `Generated ${finalStats.totalWords.toLocaleString()} words across ${sections.length} comprehensive sections.`,
      });

    } catch (error) {
      console.error('Batch project generation error:', error);
      toast({
        title: 'Batch Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate project using batch processing',
        variant: 'destructive'
      });
      setPhase('outline');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    if (!finalContent.trim()) {
      toast({
        title: 'No Content',
        description: 'No content to export.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const title = outline?.title || `Batch_Project_${new Date().toISOString().split('T')[0]}`;
      await ExportService.exportContent(finalContent, title, format, {
        includeMetadata: true,
        processFigures: true
      });
      
      toast({
        title: 'Export Successful',
        description: `Project exported as ${format.toUpperCase()} with ${batchStats?.totalWords || 'comprehensive'} words.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export project.',
        variant: 'destructive'
      });
    }
  };

  const resetProject = () => {
    setPhase('input');
    setOutline(null);
    setFinalContent('');
    setBatchId(null);
    setProgress(0);
    setIsGenerating(false);
    setBatchStats(null);
    setStartTime(null);
  };

  const getElapsedTime = (): string => {
    if (!startTime) return '';
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Batch Availability Warning */}
      {!batchAvailable && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Batch Processing Unavailable</AlertTitle>
          <AlertDescription>
            The ScribeAI Batch API is not properly configured. Please ensure your API key is set and the batch endpoint is accessible.
            <div className="flex space-x-2 mt-2">
              <Button variant="outline" size="sm" onClick={checkBatchAvailability}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
              <Button variant="outline" size="sm" onClick={debugBatchConfiguration}>
                <AlertCircle className="h-4 w-4 mr-1" />
                Debug Config
              </Button>
              {batchId && (
                <Button variant="outline" size="sm" onClick={debugBatchResults}>
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Debug Results
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Info Display */}
      {debugInfo && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Debug Information</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap text-xs">
            {debugInfo}
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Progress and Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-500" />
            <span>Enhanced Batch Project Writer</span>
            <Badge variant="outline" className="ml-auto">
              {phase === 'input' && 'Step 1: Configuration'}
              {phase === 'outline' && 'Step 2: Outline Review'}
              {phase === 'generating' && 'Step 3: Batch Processing'}
              {phase === 'completed' && 'Completed'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Large academic works using ScribeAI Batch API - Generate 12,500+ words with comprehensive scholarly content
          </CardDescription>
          
          {/* Enhanced Progress Indicator */}
          <div className="flex items-center space-x-4 pt-2">
            <div className={`flex items-center space-x-2 ${phase === 'input' ? 'text-primary' : 'text-green-500'}`}>
              <div className={`w-3 h-3 rounded-full ${phase === 'input' ? 'bg-primary' : 'bg-green-500'}`} />
              <span className="text-sm">Setup</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex items-center space-x-2 ${phase === 'outline' ? 'text-primary' : phase === 'generating' || phase === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`}>
              <div className={`w-3 h-3 rounded-full ${phase === 'outline' ? 'bg-primary' : phase === 'generating' || phase === 'completed' ? 'bg-green-500' : 'bg-muted'}`} />
              <span className="text-sm">Plan</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex items-center space-x-2 ${phase === 'generating' ? 'text-primary' : phase === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`}>
              <div className={`w-3 h-3 rounded-full ${phase === 'generating' ? 'bg-primary animate-pulse' : phase === 'completed' ? 'bg-green-500' : 'bg-muted'}`} />
              <span className="text-sm">Batch Gen</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex items-center space-x-2 ${phase === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`}>
              <CheckCircle className={`h-3 w-3 ${phase === 'completed' ? 'text-green-500' : 'text-muted'}`} />
              <span className="text-sm">Ready</span>
            </div>
          </div>

          {/* Real-time Stats */}
          {(phase === 'generating' || phase === 'completed') && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
              {batchStats && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{batchStats.actualWords.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Words Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{batchStats.avgWordsPerSection}</div>
                    <div className="text-xs text-muted-foreground">Avg per Section</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(batchStats.successRate)}%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                </>
              )}
              {phase === 'generating' && startTime && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{getElapsedTime()}</div>
                  <div className="text-xs text-muted-foreground">Elapsed</div>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Step 1: Enhanced Input Configuration */}
      {phase === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle>Project Configuration for Batch Processing</CardTitle>
            <CardDescription>
              Configure your project for high-volume batch generation targeting 12,500+ words
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Topic *</label>
              <Input
                value={config.topic}
                onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                placeholder="e.g., The Impact of Artificial Intelligence on Modern Healthcare Systems"
                disabled={isGenerating}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Detailed Requirements & Specifications *</label>
              <Textarea
                value={config.requirements}
                onChange={(e) => setConfig({ ...config, requirements: e.target.value })}
                placeholder="Detailed requirements: academic level (undergraduate/graduate/doctoral), specific areas to cover, methodology preferences, key sources to include, theoretical frameworks, target audience, specific research questions, etc. The more detail you provide, the better the batch generation will be."
                className="min-h-[120px] text-base"
                disabled={isGenerating}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Citation Style</label>
                <Select 
                  value={config.citationStyle} 
                  onValueChange={(value: 'APA' | 'MLA' | 'Chicago') => setConfig({ ...config, citationStyle: value })}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APA">APA Style (7th Edition)</SelectItem>
                    <SelectItem value="MLA">MLA Style (9th Edition)</SelectItem>
                    <SelectItem value="Chicago">Chicago Style (17th Edition)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Scope</label>
                <Select 
                  value={config.estimatedLength} 
                  onValueChange={(value: 'short' | 'medium' | 'long') => setConfig({ ...config, estimatedLength: value })}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Compact (5 sections, ~12,500 words)</SelectItem>
                    <SelectItem value="medium">Standard (8 sections, ~20,000 words)</SelectItem>
                    <SelectItem value="long">Comprehensive (12 sections, ~30,000 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Pages</label>
                <Input
                  type="number"
                  min={1}
                  value={config.targetPages ?? ''}
                  onChange={(e) => setConfig({ ...config, targetPages: Number(e.target.value) || undefined })}
                  placeholder="e.g., 40"
                  disabled={isGenerating}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">Approximate pages (defaults to words target if empty)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sections/Chapters</label>
                <Input
                  type="number"
                  min={1}
                  value={config.sectionsCount ?? ''}
                  onChange={(e) => setConfig({ ...config, sectionsCount: Number(e.target.value) || undefined })}
                  placeholder="e.g., 8"
                  disabled={isGenerating}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">Overrides scope preset when provided</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Words per Page</label>
                <Input
                  type="number"
                  min={100}
                  value={config.wordsPerPage ?? 300}
                  onChange={(e) => setConfig({ ...config, wordsPerPage: Number(e.target.value) || 300 })}
                  placeholder="Default 300"
                  disabled={isGenerating}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">Used to estimate target words from pages</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  id="include-figures"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={config.includeFigures ?? true}
                  onChange={(e) => setConfig({ ...config, includeFigures: e.target.checked })}
                  disabled={isGenerating}
                />
                <label htmlFor="include-figures" className="text-sm">Include figure placeholders</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="include-tables"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={config.includeTables ?? true}
                  onChange={(e) => setConfig({ ...config, includeTables: e.target.checked })}
                  disabled={isGenerating}
                />
                <label htmlFor="include-tables" className="text-sm">Include table placeholders</label>
              </div>
            </div>

            {estimatedTime && (
              <Alert>
                <Timer className="h-4 w-4" />
                <AlertTitle>Estimated Processing Time</AlertTitle>
                <AlertDescription>
            Batch processing will take approximately {estimatedTime} once submitted to ScribeAI's servers.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between pt-4">
              <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-green-600">ScribeAI Batch API</Badge>
                <Badge variant="outline" className="text-purple-600">12,500+ Words</Badge>
                <Badge variant="outline" className="text-blue-600">Concurrent Processing</Badge>
                <Badge variant="outline" className="text-orange-600">2,500 words/section</Badge>
              </div>
              
              <Button 
                onClick={handleGenerateOutline}
                disabled={!config.topic.trim() || !config.requirements.trim() || isGenerating || !batchAvailable}
                className="flex items-center space-x-2"
                size="lg"
              >
                {isGenerating ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
                <span>{isGenerating ? 'Preparing...' : 'Create Batch Plan'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Enhanced Outline Review */}
      {phase === 'outline' && outline && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Batch Generation Plan</CardTitle>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPhase('input')}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Config
                </Button>
                <Button 
                  onClick={handleGenerateProject} 
                  disabled={isGenerating || !batchAvailable}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Batch Generation
                </Button>
              </div>
            </div>
            <CardDescription>
            Review your comprehensive outline before starting batch processing with ScribeAI API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg">
              <h3 className="font-bold text-xl mb-4">{outline.title}</h3>
              
              <div className="grid gap-3">
                {outline.chapters.map((chapter) => (
                  <div key={chapter.number} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <h4 className="font-semibold text-lg mb-2 flex items-center">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm mr-3">
                        {chapter.number}
                      </div>
                      {chapter.title}
                      <Badge variant="outline" className="ml-auto">
                        ~{chapter.estimatedLength.toLocaleString()} words
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive coverage with detailed analysis, examples, and scholarly integration
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="font-semibold text-blue-700 dark:text-blue-300">Sections</div>
                <div className="text-2xl font-bold text-blue-600">{outline.chapters.length}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="font-semibold text-green-700 dark:text-green-300">Target Words</div>
                <div className="text-2xl font-bold text-green-600">{outline.totalEstimatedTokens.toLocaleString()}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="font-semibold text-purple-700 dark:text-purple-300">Est. Time</div>
                <div className="text-2xl font-bold text-purple-600">{estimatedTime}</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg text-center">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="font-semibold text-orange-700 dark:text-orange-300">Batch Mode</div>
                <div className="text-2xl font-bold text-orange-600">ScribeAI (Anthropic)</div>
              </div>
            </div>

            <Alert>
              <Target className="h-4 w-4" />
              <AlertTitle>Batch Generation Ready</AlertTitle>
              <AlertDescription>
                This project will be processed using ScribeAI's Batch API (Anthropic) for optimal performance and consistency. 
                All {outline.chapters.length} sections will be generated concurrently with comprehensive scholarly content.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Enhanced Generation Progress */}
      {phase === 'generating' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="relative">
                <Clock className="h-5 w-5 animate-spin" />
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              </div>
              <span>Batch Processing in Progress</span>
              {startTime && (
                <Badge variant="secondary" className="ml-auto">
                  {getElapsedTime()}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Your comprehensive project is being generated using ScribeAI Batch API with enhanced scholarly prompts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full h-3" />
            </div>

            {batchStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{batchStats.actualWords.toLocaleString()}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Words Generated</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{batchStats.avgWordsPerSection}</div>
                  <div className="text-xs text-green-700 dark:text-green-300">Avg per Section</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(batchStats.successRate)}%</div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">Success Rate</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{(batchStats.actualWords / batchStats.targetWords * 100).toFixed(0)}%</div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">Target Progress</div>
                </div>
              </div>
            )}

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Batch ID: {batchId || 'Processing...'}
              </p>
              <p className="text-xs text-muted-foreground">
                Large projects using batch processing may take 10-30 minutes. 
                Please keep this tab open to monitor progress.
              </p>
            </div>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>High-Quality Generation in Progress</AlertTitle>
              <AlertDescription>
                Each section is being crafted with comprehensive scholarly content, targeting 2,500+ words per section 
                with detailed analysis, examples, and proper citations.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Enhanced Completion Results */}
      {phase === 'completed' && finalContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Batch Project Completed Successfully</span>
              </CardTitle>
              <div className="space-x-2">
                <Button variant="default" size="sm" onClick={() => { const chats = getChatsByWorker('batch'); if (chats[0]) { switchToChat(chats[0].id); window.dispatchEvent(new CustomEvent('scribeai:switch-tab', { detail: { tab: 'chat' } })); } }}>
                  Open in Chat
                </Button>
                <Button variant="outline" size="sm" onClick={resetProject}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New Project
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                      <Download className="h-4 w-4 mr-2" />
                      Export Project
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('docx')}>
                      Export as DOCX ({batchStats?.totalWords.toLocaleString()} words)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      Export as PDF ({batchStats?.totalWords.toLocaleString()} words)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('txt')}>
                      Export as TXT ({batchStats?.totalWords.toLocaleString()} words)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardDescription>
              Your comprehensive academic project has been generated using ScribeAI Batch API
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Final Statistics Dashboard */}
            {batchStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 p-4 rounded-lg text-center">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">{batchStats.totalWords.toLocaleString()}</div>
                  <div className="text-xs text-green-700 dark:text-green-300 font-medium">Total Words</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 p-4 rounded-lg text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">{batchStats.avgWordsPerSection}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Avg per Section</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 p-4 rounded-lg text-center">
                  <Target className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-600">{Math.round(batchStats.successRate)}%</div>
                  <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Success Rate</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 p-4 rounded-lg text-center">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold text-orange-600">{(batchStats.totalTokens / 1000).toFixed(1)}K</div>
                  <div className="text-xs text-orange-700 dark:text-orange-300 font-medium">Tokens Used</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 p-4 rounded-lg text-center">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-indigo-600" />
                  <div className="text-2xl font-bold text-indigo-600">{outline?.chapters.length || 0}</div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Sections</div>
                </div>
              </div>
            )}

            {/* Content Preview */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 p-6 rounded-lg border max-h-96 overflow-y-auto">
              <MarkdownRenderer 
                content={finalContent} 
                className="max-w-none prose-sm" 
              />
            </div>

            {/* Summary Information */}
            <div className="flex justify-between items-center mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg">
              <div className="text-sm text-muted-foreground">
                <strong>Project contains:</strong> {finalContent.split(' ').length.toLocaleString()} words • 
                {outline?.chapters.length || 0} comprehensive sections • 
                {(finalContent.match(/\[FIGURE \d+:/g) || []).length} figures • 
                Generated via ScribeAI Batch API
              </div>
              {batchStats && batchStats.totalWords >= 12500 && (
                <Badge variant="default" className="bg-green-600">
                  ✓ 12,500+ Word Target Achieved
                </Badge>
              )}
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Batch Generation Complete</AlertTitle>
              <AlertDescription>
                Your comprehensive academic project has been successfully generated with 
                {batchStats ? ` ${batchStats.totalWords.toLocaleString()} words` : ' comprehensive content'} 
                across all sections. The content is ready for export and further editing.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};