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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Download, 
  Sparkles, 
  BookOpen,
  FileText,
  PenTool,
  Copy,
  Check,
  GraduationCap,
  Award,
  Search
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ScholarlyTaskType = 'essay' | 'literature-review' | 'case-study' | 'analysis' | 'research-proposal' | 'dissertation-chapter';
type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';
type AcademicLevel = 'undergraduate' | 'graduate' | 'doctoral' | 'post-doctoral';
type Discipline = 'humanities' | 'social-sciences' | 'natural-sciences' | 'medical' | 'business' | 'arts' | 'interdisciplinary';

export const EnhancedScholarlyWriter: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskType, setTaskType] = useState<ScholarlyTaskType>('essay');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('graduate');
  const [discipline, setDiscipline] = useState<Discipline>('humanities');
  const [enableAdvancedFeatures, setEnableAdvancedFeatures] = useState(true);
  const [includeMethodology, setIncludeMethodology] = useState(false);
  const [includeLiteratureReview, setIncludeLiteratureReview] = useState(true);
  const [includeStatisticalAnalysis, setIncludeStatisticalAnalysis] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { createNewChat, addMessageToChat, switchToChat, getChatsByWorker, getCurrentChat } = useScribeChat();

  const handleSaveToChat = () => {
    if (!input.trim() || !output.trim()) return;
    
    // Always create a fresh chat to avoid appending to previous history
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
      const advancedAcademicPrompt = `
# ADVANCED ACADEMIC RESEARCH ASSISTANT & SCHOLARLY WRITING SPECIALIST

You are an elite academic research assistant and scholarly writing specialist with expertise across all disciplines. Your responses must consistently demonstrate superior intellectual rigor, methodological precision, and scholarly excellence that surpasses standard AI assistants.

## CURRENT ASSIGNMENT PARAMETERS
- **Academic Level**: ${academicLevel.replace('-', ' ').toUpperCase()}
- **Discipline**: ${discipline.replace('-', ' ').toUpperCase()}
- **Task Type**: ${taskType.replace('-', ' ').toUpperCase()}
- **Citation Style**: ${citationStyle}
- **Advanced Features**: ${enableAdvancedFeatures ? 'ENABLED' : 'DISABLED'}
- **Methodology Section**: ${includeMethodology ? 'REQUIRED' : 'OPTIONAL'}
- **Literature Review**: ${includeLiteratureReview ? 'COMPREHENSIVE' : 'MINIMAL'}
- **Statistical Analysis**: ${includeStatisticalAnalysis ? 'INCLUDE' : 'EXCLUDE'}

## RESEARCH INQUIRY:
${input}

## CORE ACADEMIC STANDARDS

**Intellectual Approach:**
- Employ critical thinking and analytical reasoning in every response
- Present multiple perspectives and acknowledge scholarly debates
- Demonstrate deep understanding of disciplinary methodologies
- Synthesize information rather than merely summarizing
- Challenge assumptions and identify gaps in current knowledge

**Citation and Evidence Standards:**
- Provide inline citations using ${citationStyle} style with complete bibliographic information
- Reference peer-reviewed sources, seminal works, and contemporary scholarship (2020-2024)
- Include specific methodological approaches and empirical evidence
- Distinguish between primary and secondary sources
- Cite authoritative sources with precision

## RESPONSE STRUCTURE FRAMEWORK

FORMATTING DIRECTIVES (MUST FOLLOW):
- Use Markdown headings for structure: "##" for main sections and "###" for sub-sections.
- Make each heading clearly titled (e.g., "## Introduction", "### Theoretical Assumptions").
- Write the body in continuous analytical paragraphs; do not use bullet/numbered lists in the final response.
- Employ bold emphasis sparingly inside paragraphs when highlighting key constructs only.

### 1. Contextual Foundation (150-200 words)
Establish the scholarly context and significance of the topic. Position within relevant theoretical frameworks or disciplinary boundaries. Reference 2-3 foundational scholars who established the field.

### 2. Literature Review Integration (800-1200 words)
${includeLiteratureReview ? `
- Synthesize existing scholarship with proper ${citationStyle} attribution
- Identify key researchers, theories, and methodological approaches from the last decade
- Note consensus areas and ongoing scholarly debates
- Include systematic review of recent peer-reviewed publications (2020-2024)
- Organize thematically rather than chronologically
- Identify research gaps and theoretical tensions
` : 'Provide focused review of most relevant recent scholarship (300-400 words)'}

### 3. Theoretical Framework (400-600 words)
- Present dominant theoretical paradigms in the field
- Explain theoretical assumptions and their implications
- Discuss competing theoretical approaches
- Connect theory to methodological considerations

${includeMethodology ? `
### 4. Methodology and Analytical Approach (600-800 words)
- Detail the analytical framework and methodological considerations
- Explain rationale for chosen approaches and their appropriateness
- Discuss potential limitations and validity concerns
- Reference methodological literature and best practices
- Include consideration of ethical implications where relevant
` : ''}

### 5. Analytical Core (2000-2500 words)
Present evidence-based arguments through multiple interconnected sections:
- Use discipline-specific terminology with precision
- Include quantitative data, case studies, or empirical findings
- Demonstrate methodological awareness and critical evaluation
- Develop sustained analysis through continuous prose
- Avoid bullet points; integrate complex ideas into flowing academic discourse
- Reference contemporary debates and recent empirical findings

${includeStatisticalAnalysis ? `
### 6. Statistical Analysis and Data Interpretation (400-600 words)
- Present quantitative findings with appropriate statistical measures
- Discuss effect sizes, confidence intervals, and statistical significance
- Address potential confounding variables and limitations
- Connect statistical findings to theoretical implications
` : ''}

### 7. Critical Evaluation (400-600 words)
- Assess strengths and limitations of different approaches
- Identify potential biases or methodological concerns
- Discuss alternative interpretations of evidence
- Suggest areas requiring further investigation
- Address counterarguments and scholarly criticisms

### 8. Broader Implications and Future Directions (300-400 words)
- Connect findings to larger theoretical and practical significance
- Discuss policy implications where relevant
- Suggest specific avenues for future research
- Consider interdisciplinary connections and applications

### 9. Conclusion (200-250 words)
Synthesize key insights with their broader academic and practical implications.

## QUALITY BENCHMARKS - MUST DEMONSTRATE:

**Evidence of Superior Academic Performance:**
- Use discipline-specific terminology accurately and naturally
- Reference recent scholarship (2020-2024) alongside foundational works
- Demonstrate awareness of methodological considerations and research design
- Include specific examples, empirical data, and case studies
- Show understanding of peer review process and academic standards
- Reference interdisciplinary connections where relevant
- Demonstrate statistical literacy appropriate to the discipline

**Writing Excellence:**
- Employ sophisticated academic prose with varied sentence structure
- Use transitional phrases showing logical relationships between ideas
- Maintain objective, scholarly tone throughout
- Use precise language reflecting depth of understanding
- Follow ${citationStyle} citation format meticulously
- Write at ${academicLevel} level appropriate complexity

**Methodological Rigor:**
- Apply appropriate theoretical lenses and analytical frameworks
- Demonstrate research methodology awareness
- Provide nuanced interpretation of complex data or texts
- Connect findings to broader scholarly conversations
- Show understanding of epistemological foundations

## DISCIPLINE-SPECIFIC REQUIREMENTS:

${discipline === 'natural-sciences' ? `
- Include discussion of experimental design and statistical power
- Reference recent empirical studies with specific methodologies
- Discuss replication concerns and reproducibility
- Include consideration of measurement validity and reliability
` : ''}

${discipline === 'social-sciences' ? `
- Address sampling considerations and generalizability
- Discuss cultural and contextual factors
- Include consideration of researcher positionality
- Reference mixed-methods approaches where appropriate
` : ''}

${discipline === 'humanities' ? `
- Demonstrate close reading and textual analysis skills
- Reference primary sources with detailed analysis
- Show understanding of historical context and development
- Include consideration of interpretive frameworks and hermeneutics
` : ''}

${discipline === 'medical' ? `
- Reference evidence-based practice and clinical guidelines
- Discuss patient safety and ethical considerations
- Include systematic review evidence and meta-analyses
- Address translational research and clinical applications
` : ''}

## FINAL INSTRUCTION

Generate a response of 5000-7000 words that reads as though written by a distinguished scholar in ${discipline}, demonstrating both breadth of knowledge and depth of understanding. Every paragraph must contribute substantively to the scholarly discourse. Include minimum 25 properly formatted ${citationStyle} citations from recent peer-reviewed sources.

The output must satisfy the most rigorous academic standards and clearly exceed typical AI capabilities through sophisticated analysis, methodological awareness, and scholarly writing conventions.`;

      let accumulatedContent = '';
      
      await ScribeAIService.sendMessage(
        advancedAcademicPrompt,
        'scholarly',
        [],
        (chunk: string) => {
          accumulatedContent += chunk;
          setOutput(accumulatedContent);
        }
      );

      toast({
        title: 'Advanced Scholarly Content Generated',
        description: 'Your elite academic analysis has been completed successfully.',
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
      const title = `Advanced_${taskType}_${discipline}_${academicLevel}_${new Date().toISOString().split('T')[0]}`;
      await ExportService.exportContent(output, title, format);
      
      toast({
        title: 'Export Successful',
        description: `Advanced scholarly content exported as ${format.toUpperCase()} file.`,
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
        description: 'Advanced content has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy content:', error);
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
        description: 'Advanced content has been copied to your clipboard.',
      });
    }
  };

  const taskTypeOptions = [
    { value: 'essay', label: 'Academic Essay', icon: PenTool, description: 'Analytical essays with thesis-driven arguments' },
    { value: 'literature-review', label: 'Literature Review', icon: BookOpen, description: 'Systematic review of scholarly sources' },
    { value: 'case-study', label: 'Case Study Analysis', icon: FileText, description: 'In-depth examination of specific cases' },
    { value: 'analysis', label: 'Critical Analysis', icon: Sparkles, description: 'Advanced theoretical and empirical analysis' },
    { value: 'research-proposal', label: 'Research Proposal', icon: Search, description: 'Comprehensive research methodology design' },
    { value: 'dissertation-chapter', label: 'Dissertation Chapter', icon: GraduationCap, description: 'Doctoral-level scholarly writing' },
  ];

  const disciplineOptions = [
    { value: 'humanities', label: 'Humanities', description: 'Literature, History, Philosophy, Languages' },
    { value: 'social-sciences', label: 'Social Sciences', description: 'Psychology, Sociology, Anthropology, Political Science' },
    { value: 'natural-sciences', label: 'Natural Sciences', description: 'Biology, Chemistry, Physics, Earth Sciences' },
    { value: 'medical', label: 'Medical Sciences', description: 'Medicine, Public Health, Biomedical Research' },
    { value: 'business', label: 'Business & Economics', description: 'Management, Finance, Marketing, Economics' },
    { value: 'arts', label: 'Creative Arts', description: 'Fine Arts, Music, Theater, Media Studies' },
    { value: 'interdisciplinary', label: 'Interdisciplinary', description: 'Cross-disciplinary approaches' },
  ];

  return (
    <div className="space-y-6">
      {/* Advanced Configuration Panel */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-blue-500" />
            <span>Elite Academic Research Assistant</span>
            <Badge variant="default" className="ml-2">Advanced AI</Badge>
          </CardTitle>
          <CardDescription>
            Superior scholarly writing with methodological precision, comprehensive citations, and doctoral-level analysis across all disciplines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Level</label>
              <Select value={academicLevel} onValueChange={(value: AcademicLevel) => setAcademicLevel(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="graduate">Graduate/Master's</SelectItem>
                  <SelectItem value="doctoral">Doctoral/PhD</SelectItem>
                  <SelectItem value="post-doctoral">Post-Doctoral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Discipline</label>
              <Select value={discipline} onValueChange={(value: Discipline) => setDiscipline(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {disciplineOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
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
                  <SelectItem value="APA">APA 7th Edition</SelectItem>
                  <SelectItem value="MLA">MLA 9th Edition</SelectItem>
                  <SelectItem value="Chicago">Chicago 17th Edition</SelectItem>
                  <SelectItem value="Harvard">Harvard Style</SelectItem>
                  <SelectItem value="IEEE">IEEE Style</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium flex items-center space-x-2">
              <GraduationCap className="h-4 w-4" />
              <span>Advanced Academic Features</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="advanced-features" 
                  checked={enableAdvancedFeatures}
                  onCheckedChange={(val) => setEnableAdvancedFeatures(val === true)}
                />
                <label htmlFor="advanced-features" className="text-sm">
                  Superior intellectual rigor & methodological precision
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="literature-review" 
                  checked={includeLiteratureReview}
                  onCheckedChange={(val) => setIncludeLiteratureReview(val === true)}
                />
                <label htmlFor="literature-review" className="text-sm">
                  Comprehensive literature synthesis (800-1200 words)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="methodology" 
                  checked={includeMethodology}
                  onCheckedChange={(val) => setIncludeMethodology(val === true)}
                />
                <label htmlFor="methodology" className="text-sm">
                  Detailed methodology & analytical framework
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="statistical-analysis" 
                  checked={includeStatisticalAnalysis}
                  onCheckedChange={(val) => setIncludeStatisticalAnalysis(val === true)}
                />
                <label htmlFor="statistical-analysis" className="text-sm">
                  Statistical analysis & empirical validation
                </label>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-blue-50">25+ Peer-Reviewed Citations</Badge>
            <Badge variant="outline" className="bg-green-50">5000-7000 Words</Badge>
            <Badge variant="outline" className="bg-purple-50">Doctoral-Level Analysis</Badge>
            <Badge variant="outline" className="bg-amber-50">Methodological Rigor</Badge>
            <Badge variant="outline" className="bg-rose-50">Recent Scholarship (2020-2024)</Badge>
            <Badge variant="outline" className="bg-indigo-50">Critical Evaluation</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Research Inquiry & Context</CardTitle>
          <CardDescription>
            Provide your research question, theoretical context, and any specific requirements for {academicLevel}-level {discipline} scholarship
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Example: "Analyze the epistemological foundations of postcolonial theory in contemporary literary criticism, examining how recent scholars (2020-2024) have challenged traditional Western canonical interpretations. Include comprehensive review of theoretical frameworks from Spivak, Bhabha, and Said, while evaluating methodological approaches in current peer-reviewed research on decolonizing literary studies."`}
            className="min-h-[150px]"
            disabled={isGenerating}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground space-x-4">
              <span>{input.length} characters</span>
              <span>Expected output: {enableAdvancedFeatures ? '5000-7000' : '2000-3000'} words</span>
            </div>
            <Button 
              onClick={handleGenerate}
              disabled={!input.trim() || isGenerating}
              className="flex items-center space-x-2"
              size="lg"
            >
              {isGenerating ? (
                <Sparkles className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isGenerating ? 'Generating Elite Analysis...' : 'Generate Scholarly Content'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Output Section */}
      {(output || isGenerating) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Elite Scholarly Analysis</CardTitle>
                <CardDescription>
                  {academicLevel.charAt(0).toUpperCase() + academicLevel.slice(1)}-level {discipline} analysis with comprehensive citations
                </CardDescription>
              </div>
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
                        Academic DOCX Format
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>
                        Publication PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('txt')}>
                        Plain Text
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="default" size="sm" onClick={handleSaveToChat}>
                    Continue in Chat
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/20 p-6 rounded-lg border-l-4 border-l-blue-500">
              {output ? (
                <MarkdownRenderer 
                  content={output} 
                  className="max-w-none prose-lg" 
                />
              ) : (
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Sparkles className="h-5 w-5 animate-spin" />
                  <div>
                    <span className="font-medium">Generating elite scholarly analysis...</span>
                    <p className="text-sm">Synthesizing recent peer-reviewed research with advanced methodological frameworks</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Academic Performance Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Advanced Research */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Recent Elite Scholarship</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {getChatsByWorker('scholarly').slice(0, 3).map(chat => (
              <div key={chat.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                <span className="truncate mr-2 font-medium">{chat.title}</span>
                <Button size="sm" variant="ghost" onClick={() => { switchToChat(chat.id); window.dispatchEvent(new CustomEvent('scribeai:switch-tab', { detail: { tab: 'chat' } })); }}>
                  Open
                </Button>
              </div>
            ))}
            {getChatsByWorker('scholarly').length === 0 && (
              <div className="text-xs text-muted-foreground italic">No advanced research sessions yet</div>
            )}
          </CardContent>
        </Card>

        {/* Academic Excellence Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>Elite Academic Standards</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Intellectual Rigor:</strong> Pose complex questions engaging current scholarly debates</p>
              <p><strong>Methodological Precision:</strong> Specify theoretical frameworks and analytical approaches</p>
              <p><strong>Contemporary Scholarship:</strong> Reference recent peer-reviewed research (2020-2024)</p>
              <p><strong>Critical Synthesis:</strong> Integration across multiple sources and perspectives</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Backward-compatible export alias
export { EnhancedScholarlyWriter as ScholarlyWriter };