import React, { useRef, useState, useEffect } from 'react';
import { HumanizationService } from '@/services/humanizationService';
import { ExportService } from '@/services/exportService';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, X } from 'lucide-react';
import { FileTextExtractor } from '@/utils/fileTextExtractor';
import { validateEnvironment } from '@/lib/appConfig';
import { 
  Download, 
  Sparkles, 
  Wand2,
  Eye,
  AlertTriangle,
  CheckCircle,
  Copy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

type HumanizationTone = 'Standard' | 'HighSchool' | 'College' | 'PhD';
type HumanizationMode = 'High' | 'Medium' | 'Low';

export const TextHumanizer: React.FC = () => {
  const navigate = useNavigate();
  const { hasPremiumPlan, getRemainingHumanizerWords, canUseHumanizer } = useSubscription();
  const [originalText, setOriginalText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tone, setTone] = useState<HumanizationTone>('College');
  const [mode, setMode] = useState<HumanizationMode>('Medium');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    aiDetected: boolean;
    confidence: number;
    suggestions: string[];
  } | null>(null);
  const { toast } = useToast();

  // Validate environment on component mount
  useEffect(() => {
    const envIssues = validateEnvironment();
    if (envIssues.length > 0) {
      console.error('🔑 Environment validation failed:', envIssues);
      toast({
        title: 'Configuration Error',
        description: `Missing or invalid API configuration. Please check your .env file.`,
        variant: 'destructive'
      });
    } else {
      console.log('✅ Environment validation passed');
    }
  }, [toast]);

  const handleAnalyze = async () => {
    if (!originalText.trim()) {
      toast({
        title: 'No Text',
        description: 'Please enter text to analyze.',
        variant: 'destructive'
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const result = await HumanizationService.analyzeText(originalText);
      setAnalysisResult(result);
      
      toast({
        title: 'Analysis Complete',
        description: `AI detection confidence: ${result.confidence.toFixed(1)}%`,
        variant: result.aiDetected ? 'destructive' : 'default'
      });
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze text for AI patterns.',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHumanize = async () => {
    if (!originalText.trim()) {
      toast({
        title: 'No Text',
        description: 'Please enter text to humanize.',
        variant: 'destructive'
      });
      return;
    }

    // Subscription and limit pre-check
    const wordsToUse = originalText.split(/\s+/).filter(Boolean).length;
    if (!hasPremiumPlan()) {
      toast({
        title: 'Upgrade Required',
        description: 'Humanizer is available on the Premium plan. Subscribe to unlock 10,000 words.',
        variant: 'destructive'
      });
      navigate('/subscription');
      return;
    }
    if (!canUseHumanizer(wordsToUse)) {
      const remaining = getRemainingHumanizerWords();
      toast({
        title: 'Humanizer Limit Reached',
        description: `You have ${remaining.toLocaleString()} words remaining. Reduce input length or wait for renewal.`,
        variant: 'destructive'
      });
      return;
    }

    setIsHumanizing(true);
    setHumanizedText('');

    try {
      // Ensure full text is processed; if service returns partial, append remaining
      const result = await HumanizationService.humanizeTextFull({
        prompt: originalText,
        rephrase: false,
        tone,
        mode,
        business: false,
        maxChunkChars: 3500
      });

      let output = result.result || '';
      // If the output is suspiciously shorter than input, include a note and original for completeness
      const inputWords = originalText.split(/\s+/).filter(Boolean).length;
      const outputWords = output.split(/\s+/).filter(Boolean).length;
      if (outputWords < Math.max(100, Math.floor(inputWords * 0.6))) {
        output = `${output}\n\n---\nNote: Some content may have been omitted. The original text is included below for completeness.\n\n${originalText}`.trim();
      }
      setHumanizedText(output);
      
      if (result.success) {
        toast({
          title: 'Humanization Complete',
          description: 'Text has been successfully humanized while maintaining academic quality.',
        });
      } else {
        toast({
          title: 'Humanization Warning',
          description: result.message || 'Humanization completed with warnings.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Humanization error:', error);
      toast({
        title: 'Humanization Failed',
        description: error instanceof Error ? error.message : 'Failed to humanize text',
        variant: 'destructive'
      });
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (!files.length) return;
    setAttachedFiles(prev => [...prev, ...files]);
    try {
      // Extract text from first textual file; if multiple, concatenate
      let accumulated = originalText ? originalText + '\n\n' : '';
      for (const file of files) {
        try {
          const extracted = await FileTextExtractor.extractText(file);
          accumulated += extracted + '\n\n';
        } catch (err) {
          toast({
            title: 'Extraction failed',
            description: `Could not extract text from ${file.name}`,
            variant: 'destructive'
          });
        }
      }
      setOriginalText(accumulated.trim());
      toast({ title: 'Text added', description: 'Extracted text was added to the input.' });
    } catch (e) {
      // already toasted individual errors
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Text copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy text to clipboard.',
        variant: 'destructive'
      });
    }
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    if (!humanizedText.trim()) {
      toast({
        title: 'No Content',
        description: 'No humanized content to export.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const title = `Humanized_Text_${new Date().toISOString().split('T')[0]}`;
      await ExportService.exportContent(humanizedText, title, format);
      
      toast({
        title: 'Export Successful',
        description: `Humanized text exported as ${format.toUpperCase()} file.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export humanized text.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-orange-500" />
            <span>Text Humanizer</span>
            <Badge variant="outline" className="ml-auto">Humanizer</Badge>
            <Badge variant="secondary" className="ml-2">
              Remaining: {getRemainingHumanizerWords().toLocaleString()} words
            </Badge>
          </CardTitle>
          <CardDescription>
            Humanize AI-generated text while maintaining academic quality and integrity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Level</label>
              <Select value={tone} onValueChange={(value: HumanizationTone) => setTone(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HighSchool">High School</SelectItem>
                  <SelectItem value="College">College/Undergraduate</SelectItem>
                  <SelectItem value="PhD">PhD/Graduate</SelectItem>
                  <SelectItem value="Standard">Standard Academic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Humanization Strength</label>
              <Select value={mode} onValueChange={(value: HumanizationMode) => setMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low (Subtle changes)</SelectItem>
                  <SelectItem value="Medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="High">High (Maximum humanization)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">AI Detection Reduction</Badge>
            <Badge variant="outline">Academic Tone Preserved</Badge>
            <Badge variant="outline">Meaning Maintained</Badge>
            <Badge variant="outline">User-Triggered</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Original Text</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAnalyze}
              disabled={!originalText.trim() || isAnalyzing}
            >
              {isAnalyzing ? (
                <Sparkles className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze AI Patterns'}
            </Button>
          </div>
          <CardDescription>
            Paste or upload text you want to humanize
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Upload PDF, DOCX, or TXT. We’ll extract the text.</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center"
                disabled={isHumanizing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) handleFileSelect(files);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
            </div>
            {attachedFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-background rounded-md px-3 py-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-32">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeAttachedFile(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste your AI-generated academic text here. This could be essays, research content, or any academic writing that needs to sound more natural while maintaining scholarly quality."
            className="min-h-[150px]"
            disabled={isHumanizing}
          />
          
          {/* Analysis Results */}
          {analysisResult && (
            <div className={`p-3 rounded-lg border ${analysisResult.aiDetected ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'}`}>
              <div className="flex items-center space-x-2 mb-2">
                {analysisResult.aiDetected ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className="font-medium text-sm">
                  AI Detection: {analysisResult.confidence.toFixed(1)}% confidence
                </span>
              </div>
              {analysisResult.suggestions.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {originalText.length} characters • {originalText.split(' ').filter(w => w.length > 0).length} words
            </span>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleCopy(originalText)}
                disabled={!originalText.trim()}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button 
                onClick={handleHumanize}
                disabled={!originalText.trim() || isHumanizing}
                className="flex items-center space-x-2"
              >
                {isHumanizing ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                <span>{isHumanizing ? 'Humanizing (may take up to 60s)...' : 'Humanize Text'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Section */}
      {(humanizedText || isHumanizing) && (
        <div className="space-y-3">
          <div className="bg-muted/20 p-3 sm:p-4 rounded-lg">
            {humanizedText ? (
              <MarkdownRenderer 
                content={humanizedText} 
                className="max-w-none" 
              />
            ) : (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>Humanizing text… this may take up to 60 seconds for longer texts.</span>
              </div>
            )}
          </div>
          {humanizedText && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {humanizedText.length} characters • {humanizedText.split(' ').filter(w => w.length > 0).length} words
              </span>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCopy(humanizedText)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guidelines removed for simpler, cleaner mobile view */}
    </div>
  );
};