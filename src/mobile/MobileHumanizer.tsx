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
import { Upload, Wand2, Copy, Download, X, FileText, Sparkles, CheckCircle, BookOpen, GraduationCap, FileBarChart, Search, Scroll } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

type HumanizationTone = 'Standard' | 'HighSchool' | 'College' | 'PhD';
type HumanizationMode = 'Low' | 'Medium' | 'High';

// Academic writing presets
const ACADEMIC_PRESETS = {
  essay: {
    name: 'Academic Essay',
    description: 'Research papers, argumentative essays, and academic writing',
    tone: 'College' as HumanizationTone,
    mode: 'Medium' as HumanizationMode,
    icon: BookOpen,
    color: 'bg-blue-500',
    textColor: 'text-blue-600'
  },
  thesis: {
    name: 'Thesis/Dissertation',
    description: 'Advanced academic writing for graduate and doctoral work',
    tone: 'PhD' as HumanizationTone,
    mode: 'High' as HumanizationMode,
    icon: GraduationCap,
    color: 'bg-purple-500',
    textColor: 'text-purple-600'
  },
  report: {
    name: 'Research Report',
    description: 'Professional research reports and scientific papers',
    tone: 'College' as HumanizationTone,
    mode: 'Medium' as HumanizationMode,
    icon: FileBarChart,
    color: 'bg-green-500',
    textColor: 'text-green-600'
  },
  analysis: {
    name: 'Critical Analysis',
    description: 'Analytical writing with sophisticated argumentation',
    tone: 'PhD' as HumanizationTone,
    mode: 'High' as HumanizationMode,
    icon: Search,
    color: 'bg-orange-500',
    textColor: 'text-orange-600'
  },
  summary: {
    name: 'Literature Review',
    description: 'Comprehensive literature reviews and summaries',
    tone: 'College' as HumanizationTone,
    mode: 'Medium' as HumanizationMode,
    icon: Scroll,
    color: 'bg-indigo-500',
    textColor: 'text-indigo-600'
  }
};

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
  const [selectedPreset, setSelectedPreset] = useState<string>('essay');
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const uploadRef = useRef<HTMLInputElement>(null);
  
  const applyPreset = (presetKey: keyof typeof ACADEMIC_PRESETS) => {
    const preset = ACADEMIC_PRESETS[presetKey];
    setTone(preset.tone);
    setMode(preset.mode);
    setSelectedPreset(presetKey);
    toast({
      title: "Academic Preset Applied",
      description: `Applied ${preset.name} settings for optimal academic humanization.`,
    });
  };

  const onFilesSelected = async (selected: File[]) => {
    if (!selected.length) return;
    setFiles(prev => [...prev, ...selected]);
    let combined = input ? input + '\n\n' : '';
    
    for (const file of selected) {
      try {
        const text = await FileTextExtractor.extractText(file);
        combined += `**${file.name}**\n${text}\n\n`;
      } catch (error) {
        console.error('Error extracting text from file:', error);
        combined += `**${file.name}**\n[Error extracting text from this file]\n\n`;
      }
    }
    setInput(combined);
  };

  const handleHumanize = async () => {
    if (!input.trim()) {
      toast({
        title: "No Text to Humanize",
        description: "Please enter some text or upload a file to humanize.",
        variant: "destructive",
      });
      return;
    }
    
    if (!canUseHumanizer) {
      toast({
        title: "Premium Required",
        description: "Humanization is only available for premium users. Please upgrade to continue.",
        variant: "destructive",
      });
      return;
    }
    
    const wordCount = input.trim().split(/\s+/).length;
    const remaining = await getRemainingHumanizerWords();
    
    if (wordCount > remaining) {
      toast({
        title: "Word Limit Exceeded",
        description: `You have ${remaining} words remaining. Your text has ${wordCount} words. Please upgrade for more words.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsHumanizing(true);
    try {
      const humanized = await HumanizationService.humanizeTextFull({
        prompt: input,
        rephrase: true,
        tone: tone,
        mode: mode,
        business: false
      });
      setResult(typeof humanized === 'string' ? humanized : humanized.result || '');
        toast({
        title: "Text Humanized Successfully",
        description: "Your academic writing has been enhanced with professional language.",
      });
    } catch (error) {
      console.error('Humanization error:', error);
      toast({
        title: "Humanization Failed",
        description: "Failed to humanize text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast({
        title: "Copied to Clipboard",
        description: "Humanized text has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy text to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!result) return;
    ExportService.exportToTxt(result, 'humanized-text.txt');
      toast({
      title: "Download Started",
      description: "Your humanized text is being downloaded.",
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const wordCount = input.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Academic Humanizer</h1>
                <p className="text-sm text-slate-500">Enhance your academic writing</p>
              </div>
            </div>
            {hasPremiumPlan && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                Premium
              </Badge>
            )}
          </div>
          </div>
        </div>

      <div className="px-4 py-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'presets'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Quick Presets
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'custom'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Custom Settings
          </button>
      </div>

        {/* Academic Presets */}
        {activeTab === 'presets' && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                <span>Academic Writing Presets</span>
          </CardTitle>
              <CardDescription className="text-slate-600">
                Choose a preset optimized for your type of academic writing
          </CardDescription>
        </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(ACADEMIC_PRESETS).map(([key, preset]) => {
                const IconComponent = preset.icon;
                const isSelected = selectedPreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => applyPreset(key as keyof typeof ACADEMIC_PRESETS)}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${preset.color} shadow-sm`}>
                        <IconComponent className="h-5 w-5 text-white" />
                  </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 mb-1">{preset.name}</h3>
                        <p className="text-sm text-slate-600 mb-2">{preset.description}</p>
                        <div className="flex items-center space-x-4 text-xs">
                          <span className={`px-2 py-1 rounded-full ${preset.textColor} bg-opacity-10`}>
                            {preset.tone} Level
                          </span>
                          <span className={`px-2 py-1 rounded-full ${preset.textColor} bg-opacity-10`}>
                            {preset.mode} Intensity
                          </span>
              </div>
            </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Custom Settings */}
        {activeTab === 'custom' && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-800">Custom Settings</CardTitle>
              <CardDescription className="text-slate-600">
                Fine-tune the humanization settings for your specific needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Academic Level */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Academic Level</label>
                <Select value={tone} onValueChange={(value: HumanizationTone) => setTone(value)}>
                  <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Standard">
                      <div className="py-1">
                        <div className="font-medium">Standard</div>
                        <div className="text-xs text-slate-500">General academic writing</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="HighSchool">
                      <div className="py-1">
                        <div className="font-medium">High School</div>
                        <div className="text-xs text-slate-500">Appropriate for secondary education</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="College">
                      <div className="py-1">
                        <div className="font-medium">College/Undergraduate</div>
                        <div className="text-xs text-slate-500">University-level academic writing</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="PhD">
                      <div className="py-1">
                        <div className="font-medium">PhD/Graduate</div>
                        <div className="text-xs text-slate-500">Advanced scholarly writing</div>
                      </div>
                    </SelectItem>
                </SelectContent>
              </Select>
            </div>

              {/* Humanization Intensity */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Humanization Intensity</label>
                <Select value={mode} onValueChange={(value: HumanizationMode) => setMode(value)}>
                  <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Low">
                      <div className="py-1">
                        <div className="font-medium">Low</div>
                        <div className="text-xs text-slate-500">Subtle improvements to natural flow</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="Medium">
                      <div className="py-1">
                        <div className="font-medium">Medium</div>
                        <div className="text-xs text-slate-500">Balanced enhancement of clarity and style</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="High">
                      <div className="py-1">
                        <div className="font-medium">High</div>
                        <div className="text-xs text-slate-500">Comprehensive rewriting for maximum impact</div>
                      </div>
                    </SelectItem>
                </SelectContent>
              </Select>
            </div>
            </CardContent>
          </Card>
        )}

        {/* File Upload */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-500" />
              <span>Upload Documents</span>
            </CardTitle>
            <CardDescription className="text-slate-600">
              Upload text files, PDFs, or Word documents to extract and humanize content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input 
                ref={uploadRef} 
                type="file" 
                multiple 
                accept=".txt,.pdf,.doc,.docx"
                onChange={(e) => e.target.files && onFilesSelected(Array.from(e.target.files))}
                className="hidden" 
              />
              <Button
                onClick={() => uploadRef.current?.click()}
                variant="outline"
                className="w-full h-12 border-dashed border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all duration-200"
              >
                <Upload className="h-5 w-5 mr-2" />
                Choose Files or Drag & Drop
              </Button>
              
              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">Uploaded Files</h4>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Text Input */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Your Text</CardTitle>
            <CardDescription className="text-slate-600">
              Enter the text you want to humanize or enhance for academic writing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your text here or upload a document above..."
              className="min-h-[200px] border-slate-200 rounded-xl resize-none text-base"
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-slate-500">
                {wordCount} words
              </span>
              {!hasPremiumPlan && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Premium Required
                </Badge>
              )}
          </div>
          </CardContent>
        </Card>

        {/* Humanize Button */}
          <Button 
            onClick={handleHumanize} 
          disabled={!input.trim() || isHumanizing || !canUseHumanizer}
          className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isHumanizing ? (
              <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Enhancing Academic Writing...
              </>
            ) : (
              <>
              <Sparkles className="h-5 w-5 mr-2" />
              Enhance Academic Writing
              </>
            )}
          </Button>

        {/* Current Settings Display */}
        <div className="flex items-center justify-center space-x-6 py-3 bg-white/60 rounded-xl border border-slate-200">
          <div className="text-center">
            <div className="text-xs text-slate-500">Academic Level</div>
            <div className="font-semibold text-slate-700">{tone}</div>
          </div>
          <div className="w-px h-8 bg-slate-300"></div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Intensity</div>
            <div className="font-semibold text-slate-700">{mode}</div>
          </div>
          <div className="w-px h-8 bg-slate-300"></div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Words</div>
            <div className="font-semibold text-slate-700">{wordCount}</div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Enhanced Academic Writing</span>
                </CardTitle>
                <div className="flex space-x-2">
                      <Button 
                    onClick={handleCopy}
                        variant="outline" 
                        size="sm" 
                    className="h-9 border-slate-200 hover:bg-slate-50"
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button 
                    onClick={handleDownload}
                        variant="outline" 
                        size="sm" 
                    className="h-9 border-slate-200 hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
            </div>
              <CardDescription className="text-slate-600">
                Your text has been enhanced with professional academic language and improved clarity
              </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={result} />
            </div>
          </CardContent>
        </Card>
      )}
            </div>
    </div>
  );
};

export default MobileHumanizer;
