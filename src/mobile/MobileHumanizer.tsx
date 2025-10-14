import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HumanizationService } from '@/services/humanizationService';
import { ExportService } from '@/services/exportService';
import { FileTextExtractor } from '@/utils/fileTextExtractor';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Upload, Wand2, Copy, Download, X, FileText, Sparkles, CheckCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

type HumanizationTone = 'Standard' | 'HighSchool' | 'College' | 'PhD';
type HumanizationMode = 'High' | 'Medium' | 'Low';

const MobileHumanizer: React.FC = () => {
  const { hasPremiumPlan, canUseHumanizer, getRemainingHumanizerWords } = useSubscription();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [tone, setTone] = useState<HumanizationTone>('College');
  const [mode, setMode] = useState<HumanizationMode>('Medium');
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [result, setResult] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [copied, setCopied] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const onFilesSelected = async (selected: File[]) => {
    if (!selected.length) return;
    setFiles(prev => [...prev, ...selected]);
    let combined = input ? input + '\n\n' : '';
    for (const f of selected) {
      try {
        const text = await FileTextExtractor.extractText(f);
        if (text && text.trim().length) {
          combined += text.trim() + '\n\n';
        }
      } catch {}
    }
    setInput(combined.trim());
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleHumanize = async () => {
    if (!input.trim()) {
      toast({
        title: "No text to humanize",
        description: "Please enter some text to humanize.",
        variant: "destructive"
      });
      return;
    }
    
    const wordsToUse = input.split(/\s+/).filter(Boolean).length;
    if (!hasPremiumPlan()) {
      toast({
        title: "Premium Required",
        description: "Humanizer is available on the Premium plan. Please subscribe to unlock up to 10,000 words.",
        variant: "destructive"
      });
      return;
    }
    
    if (!canUseHumanizer(wordsToUse)) {
      const remaining = getRemainingHumanizerWords();
      toast({
        title: "Word limit reached",
        description: `You have ${remaining.toLocaleString()} words remaining. Please upgrade your plan for more capacity.`,
        variant: "destructive"
      });
      return;
    }
    
    setIsHumanizing(true);
    setResult('');
    
    try {
      const resp = await HumanizationService.humanizeTextFull({
        prompt: input,
        rephrase: false,
        tone,
        mode,
        business: false,
        maxChunkChars: 3500
      });
      
      if (resp.success) {
        setResult(resp.result || '');
        toast({
          title: "Text humanized successfully",
          description: "Your text has been processed and made more natural.",
        });
      } else {
        toast({
          title: "Humanization failed",
          description: resp.message || "Failed to humanize text. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Humanization error:', error);
      toast({
        title: "Error occurred",
        description: "An error occurred while humanizing your text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsHumanizing(false);
    }
  };

  const copyOut = async () => {
    if (!result.trim()) {
      toast({
        title: "No content to copy",
        description: "Please humanize some text first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "The humanized text has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy text to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportOut = async (format: 'docx' | 'pdf' | 'txt') => {
    if (!result.trim()) {
      toast({
        title: "No content to export",
        description: "Please humanize some text first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await ExportService.exportContent(result, `Humanized_${new Date().toISOString().split('T')[0]}`, format);
      toast({
        title: "Export successful",
        description: `Your humanized text has been exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export text. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Text Humanizer</h1>
        </div>
        <p className="text-muted-foreground">
          Transform AI-generated text into natural, human-like content
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Input Text</span>
          </CardTitle>
          <CardDescription>
            Paste or type the text you want to humanize. The AI will make it sound more natural and human-like.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste or type text to humanize... (e.g., AI-generated content, academic text, or any text that needs to sound more natural)"
            className="min-h-[200px] resize-y border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            disabled={isHumanizing}
          />
          
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Uploaded Files:</div>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tone</label>
              <Select value={tone} onValueChange={(v) => setTone(v as HumanizationTone)} disabled={isHumanizing}>
                <SelectTrigger className="border-2 border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HighSchool">High School</SelectItem>
                  <SelectItem value="College">College</SelectItem>
                  <SelectItem value="PhD">PhD Level</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Intensity</label>
              <Select value={mode} onValueChange={(v) => setMode(v as HumanizationMode)} disabled={isHumanizing}>
                <SelectTrigger className="border-2 border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select intensity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Files</label>
              <Button 
                variant="outline" 
                className="w-full border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200" 
                onClick={() => uploadRef.current?.click()}
                disabled={isHumanizing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <input 
                ref={uploadRef} 
                type="file" 
                multiple 
                className="hidden" 
                onChange={(e) => onFilesSelected(Array.from(e.target.files || []))} 
                accept=".txt,.doc,.docx,.pdf"
              />
            </div>
          </div>

          <Button 
            onClick={handleHumanize} 
            disabled={!input.trim() || isHumanizing} 
            className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            {isHumanizing ? (
              <>
                <Wand2 className="h-5 w-5 mr-2 animate-spin" />
                Humanizing Text...
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5 mr-2" />
                Humanize Text
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output Section */}
      {(result || isHumanizing) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Humanized Text</span>
                </CardTitle>
                <CardDescription>
                  Your text has been processed to sound more natural and human-like.
                </CardDescription>
              </div>
              {result && (
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copyOut}
                        className="flex items-center space-x-2 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all duration-200"
                      >
                        {copied ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => exportOut('docx')}
                        className="flex items-center space-x-2 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all duration-200"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                      </Button>
                    </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/20 p-6 rounded-lg border border-border shadow-sm">
              {result ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-foreground">
                    <MarkdownRenderer content={result} className="max-w-none" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">{result.length} characters</span>
                      <span className="font-medium">{result.split(/\s+/).filter(Boolean).length} words</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                        {tone} tone
                      </Badge>
                      <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                        {mode} intensity
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <Wand2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground font-medium">Processing your text...</p>
                    <p className="text-xs text-muted-foreground">This may take a few moments</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <span>Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Natural Language Processing</h4>
              <p className="text-sm text-muted-foreground">
                Advanced AI algorithms to make text sound more human and natural.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Multiple Tones</h4>
              <p className="text-sm text-muted-foreground">
                Choose from High School, College, PhD, or Standard writing levels.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Adjustable Intensity</h4>
              <p className="text-sm text-muted-foreground">
                Control how much the text is modified with Low, Medium, or High settings.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">File Support</h4>
              <p className="text-sm text-muted-foreground">
                Upload and process text from various file formats including PDF, DOC, and TXT.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileHumanizer;


