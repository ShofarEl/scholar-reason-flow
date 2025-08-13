import React, { useState } from 'react';
import { HumanizationService } from '@/services/humanizationService';
import { ExportService } from '@/services/exportService';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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

type HumanizationTone = 'Standard' | 'HighSchool' | 'College' | 'PhD';
type HumanizationMode = 'High' | 'Medium' | 'Low';

export const TextHumanizer: React.FC = () => {
  const [originalText, setOriginalText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tone, setTone] = useState<HumanizationTone>('College');
  const [mode, setMode] = useState<HumanizationMode>('Medium');
  const [analysisResult, setAnalysisResult] = useState<{
    aiDetected: boolean;
    confidence: number;
    suggestions: string[];
  } | null>(null);
  const { toast } = useToast();

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

    setIsHumanizing(true);
    setHumanizedText('');

    try {
      const result = await HumanizationService.humanizeText({
        prompt: originalText,
        rephrase: false,
        tone,
        mode,
        business: false
      });

      setHumanizedText(result.result);
      
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
            <Badge variant="outline" className="ml-auto">StealthGPT Powered</Badge>
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
            Paste your AI-generated text that you want to humanize
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <span>{isHumanizing ? 'Humanizing...' : 'Humanize Text'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Section */}
      {(humanizedText || isHumanizing) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Humanized Text</CardTitle>
              {humanizedText && !isHumanizing && (
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
              )}
            </div>
            <CardDescription>
              Text processed to reduce AI detection while maintaining academic quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-4 rounded-lg border">
              {humanizedText ? (
                <MarkdownRenderer 
                  content={humanizedText} 
                  className="max-w-none" 
                />
              ) : (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Humanizing text using StealthGPT...</span>
                </div>
              )}
            </div>
            {humanizedText && (
              <div className="text-center mt-3">
                <span className="text-sm text-muted-foreground">
                  {humanizedText.length} characters • {humanizedText.split(' ').filter(w => w.length > 0).length} words
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Humanization Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>Academic Integrity:</strong> Use responsibly and in accordance with your institution's policies</p>
            <p>• <strong>Quality Check:</strong> Always review humanized text for accuracy and coherence</p>
            <p>• <strong>Tone Selection:</strong> Choose academic level that matches your target audience</p>
            <p>• <strong>Mode Selection:</strong> Higher modes provide more humanization but may alter meaning</p>
            <p>• <strong>Best Practice:</strong> Combine with manual editing for optimal results</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};