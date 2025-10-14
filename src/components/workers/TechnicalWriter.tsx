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
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Download, 
  Sparkles, 
  Calculator,
  BarChart3,
  Zap,
  DollarSign,
  Copy,
  Check,
  Settings,
  Award,
  TrendingUp,
  Microscope,
  Cpu
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TechnicalField = 'mathematics' | 'physics' | 'engineering' | 'accounting' | 'statistics' | 'computer-science' | 'chemistry' | 'economics';
type TechnicalLevel = 'undergraduate' | 'graduate' | 'professional' | 'research';
type SolutionDepth = 'standard' | 'comprehensive' | 'research-grade';
type ValidationLevel = 'basic' | 'advanced' | 'peer-review-ready';

export const EnhancedTechnicalWriter: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [technicalField, setTechnicalField] = useState<TechnicalField>('mathematics');
  const [technicalLevel, setTechnicalLevel] = useState<TechnicalLevel>('graduate');
  const [solutionDepth, setSolutionDepth] = useState<SolutionDepth>('comprehensive');
  const [validationLevel, setValidationLevel] = useState<ValidationLevel>('advanced');
  const [includeProofs, setIncludeProofs] = useState(false);
  const [includeNumericalAnalysis, setIncludeNumericalAnalysis] = useState(true);
  const [includeErrorAnalysis, setIncludeErrorAnalysis] = useState(true);
  const [includeAlternativeMethods, setIncludeAlternativeMethods] = useState(false);
  const [includeComputationalImplementation, setIncludeComputationalImplementation] = useState(false);
  const [precisionLevel, setPrecisionLevel] = useState([85]);
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
      worker: 'technical'
    };
    const chatId = createNewChat('technical', userMessage);
    
    const assistantMessage: ScribeMessage = {
      id: crypto.randomUUID(),
      sender: 'assistant',
      content: output,
      timestamp: new Date(),
      worker: 'technical'
    };
    addMessageToChat(chatId, assistantMessage);
    switchToChat(chatId);
    window.dispatchEvent(new CustomEvent('scribeai:switch-tab', { detail: { tab: 'chat' } }));
    toast({ title: 'Saved to Chat', description: 'The technical solution was saved and opened in Chat.' });
  };

  const handleGenerate = async () => {
    if (!input.trim() || isGenerating) return;

    setIsGenerating(true);
    setOutput('');

    try {
      const advancedTechnicalPrompt = `
# ELITE TECHNICAL ANALYSIS & COMPUTATIONAL SPECIALIST

You are an expert technical analyst and computational specialist with advanced expertise across all quantitative disciplines. Your responses must demonstrate superior technical rigor, mathematical precision, and methodological excellence that exceeds standard computational approaches.

## CURRENT TECHNICAL PARAMETERS
- **Technical Field**: ${technicalField.replace('-', ' ').toUpperCase()}
- **Technical Level**: ${technicalLevel.replace('-', ' ').toUpperCase()}
- **Solution Depth**: ${solutionDepth.replace('-', ' ').toUpperCase()}
- **Validation Level**: ${validationLevel.replace('-', ' ').toUpperCase()}
- **Precision Requirement**: ${precisionLevel[0]}% accuracy standard
- **Mathematical Proofs**: ${includeProofs ? 'REQUIRED' : 'OPTIONAL'}
- **Numerical Analysis**: ${includeNumericalAnalysis ? 'COMPREHENSIVE' : 'STANDARD'}
- **Error Analysis**: ${includeErrorAnalysis ? 'DETAILED' : 'BASIC'}
- **Alternative Methods**: ${includeAlternativeMethods ? 'INCLUDE MULTIPLE APPROACHES' : 'SINGLE OPTIMAL METHOD'}
- **Computational Implementation**: ${includeComputationalImplementation ? 'CODE IMPLEMENTATION REQUIRED' : 'THEORETICAL FOCUS'}

## TECHNICAL PROBLEM STATEMENT:
${input}

## CORE TECHNICAL STANDARDS

**Mathematical Rigor:**
- Employ precise mathematical notation and terminology
- Demonstrate deep understanding of underlying theoretical principles
- Present rigorous analytical derivations with complete justification
- Maintain dimensional consistency and physical interpretation
- Apply advanced mathematical techniques appropriate to ${technicalLevel} level

**Computational Excellence:**
- Utilize state-of-the-art numerical methods and algorithms
- Demonstrate awareness of computational complexity and efficiency
- Include convergence analysis and stability considerations
- Present optimized solution strategies with performance metrics
- Address numerical precision and rounding error propagation

## RESPONSE STRUCTURE FRAMEWORK

### 1. Problem Analysis and Characterization (200-300 words)
- Comprehensive analysis of the technical problem scope and constraints
- Identification of key parameters, variables, and boundary conditions
- Classification of problem type and appropriate solution methodologies
- Discussion of any assumptions or simplifications required

### 2. Theoretical Framework and Mathematical Foundation (400-600 words)
- Present relevant theoretical principles and governing equations
- Establish mathematical framework with precise notation
- Explain underlying physical, economic, or computational principles
- Reference authoritative sources and established theoretical results
- Connect theory to practical implementation considerations

${includeProofs ? `
### 3. Mathematical Proofs and Derivations (600-800 words)
- Provide rigorous mathematical proofs for key theoretical results
- Show detailed derivations of governing equations or algorithms
- Include convergence proofs and stability analysis where applicable
- Demonstrate mathematical rigor appropriate to ${technicalLevel} level
- Reference advanced mathematical concepts and techniques
` : ''}

### 4. Solution Methodology and Approach (500-700 words)
- Detail the technical methodology with step-by-step approach
- Explain rationale for chosen solution strategy
- Discuss optimization considerations and efficiency metrics
- Present algorithm design with complexity analysis
- Include flowchart or pseudocode for complex procedures

### 5. Comprehensive Technical Analysis (1500-2000 words)
Present the core technical solution through multiple interconnected sections:
- Execute detailed calculations with complete working
- Apply advanced techniques specific to ${technicalField}
- Demonstrate numerical analysis with convergence studies
- Include sensitivity analysis and parameter studies
- Present results with appropriate precision (${precisionLevel[0]}% accuracy)
- Integrate theoretical insights with practical implications

${includeNumericalAnalysis ? `
### 6. Advanced Numerical Analysis (400-600 words)
- Implement sophisticated numerical methods and algorithms
- Conduct convergence analysis and stability assessment
- Compare multiple numerical approaches for accuracy and efficiency
- Present computational performance metrics and optimization strategies
- Discuss numerical precision limitations and error propagation
` : ''}

${includeErrorAnalysis ? `
### 7. Comprehensive Error Analysis (300-500 words)
- Quantify sources of error including truncation, rounding, and modeling errors
- Perform uncertainty propagation analysis using appropriate statistical methods
- Present confidence intervals and reliability assessments
- Discuss sensitivity to input parameters and boundary conditions
- Provide recommendations for error minimization and quality assurance
` : ''}

${includeAlternativeMethods ? `
### 8. Alternative Solution Approaches (400-600 words)
- Present multiple solution methodologies with comparative analysis
- Evaluate trade-offs between accuracy, efficiency, and computational cost
- Discuss advantages and limitations of each approach
- Provide recommendations for method selection based on specific criteria
- Include benchmark comparisons and performance metrics
` : ''}

${includeComputationalImplementation ? `
### 9. Computational Implementation (500-700 words)
- Provide optimized algorithms with complete implementation details
- Include code snippets or pseudocode for key computational procedures
- Discuss software architecture and data structure considerations
- Present performance optimization strategies and parallel computing approaches
- Address memory management and computational scalability
` : ''}

### ${includeComputationalImplementation ? '10' : includeAlternativeMethods ? '9' : includeErrorAnalysis ? '8' : '7'}. Validation and Verification (300-400 words)
- Present comprehensive validation using analytical benchmarks
- Compare results with experimental data or literature values
- Perform convergence studies and mesh independence analysis
- Discuss quality assurance procedures and best practices
- Address limitations and potential sources of discrepancy

### ${includeComputationalImplementation ? '11' : includeAlternativeMethods ? '10' : includeErrorAnalysis ? '9' : '8'}. Discussion and Technical Implications (300-400 words)
- Analyze broader technical and practical implications of results
- Connect findings to current state-of-the-art in ${technicalField}
- Discuss potential applications and technological significance
- Address scalability considerations and future developments
- Provide recommendations for practical implementation

### ${includeComputationalImplementation ? '12' : includeAlternativeMethods ? '11' : includeErrorAnalysis ? '10' : '9'}. Conclusion and Future Directions (200-250 words)
Synthesize key technical insights with recommendations for advanced applications and future research.

## TECHNICAL EXCELLENCE BENCHMARKS - MUST DEMONSTRATE:

**Superior Technical Performance:**
- Use field-specific terminology with precision and authority
- Reference current best practices and state-of-the-art methodologies
- Demonstrate advanced mathematical and computational techniques
- Include specific numerical results with appropriate significant figures
- Show understanding of professional standards and industrial practices
- Reference recent technical literature and advanced methodologies

**Analytical Sophistication:**
- Apply multiple analytical approaches and cross-validation techniques
- Demonstrate optimization principles and efficiency considerations
- Show awareness of numerical stability and convergence properties
- Include dimensional analysis and physical interpretation
- Present results with statistical confidence and uncertainty quantification

**Professional Standards:**
- Maintain accuracy to ${precisionLevel[0]}% precision standard
- Follow established conventions for ${technicalField}
- Include appropriate safety factors and design margins
- Address regulatory compliance and industry standards where applicable
- Provide documentation suitable for ${validationLevel} peer review

## FIELD-SPECIFIC REQUIREMENTS:

${technicalField === 'mathematics' ? `
- Include rigorous proofs and mathematical derivations
- Reference advanced mathematical concepts (real analysis, abstract algebra, etc.)
- Demonstrate theorem applications and corollary development
- Show understanding of mathematical logic and proof techniques
- Include computational complexity analysis for algorithms
` : ''}

${technicalField === 'physics' ? `
- Apply fundamental physical principles with dimensional consistency
- Include experimental validation considerations and measurement uncertainty
- Reference current research and theoretical developments
- Demonstrate understanding of physical approximations and their validity
- Include energy, momentum, and conservation law applications
` : ''}

${technicalField === 'engineering' ? `
- Apply relevant engineering codes and safety standards
- Include design considerations and optimization criteria
- Reference industry best practices and professional standards
- Demonstrate understanding of material properties and failure modes
- Include cost analysis and feasibility considerations
` : ''}

${technicalField === 'computer-science' ? `
- Include algorithm analysis with time and space complexity
- Demonstrate understanding of data structures and computational efficiency
- Reference current software engineering practices and design patterns
- Include performance benchmarking and scalability analysis
- Discuss parallel computing and distributed systems considerations
` : ''}

${technicalField === 'statistics' ? `
- Apply appropriate statistical tests with power analysis
- Include confidence intervals and hypothesis testing procedures
- Demonstrate understanding of experimental design principles
- Reference statistical software and computational methods
- Include model validation and diagnostic procedures
` : ''}

## FINAL INSTRUCTION

Generate a response of ${solutionDepth === 'research-grade' ? '4000-6000' : solutionDepth === 'comprehensive' ? '2500-4000' : '1500-2500'} words that demonstrates the technical expertise of a senior specialist in ${technicalField}. Every calculation must be accurate to ${precisionLevel[0]}% precision, and all methodologies must meet ${validationLevel} professional standards.

The output must satisfy the most rigorous technical standards and clearly demonstrate advanced computational and analytical capabilities beyond typical technical solutions.`;

      let accumulatedContent = '';
      
      await ScribeAIService.sendMessage(
        advancedTechnicalPrompt,
        'technical',
        [],
        (chunk: string) => {
          accumulatedContent += chunk;
          setOutput(accumulatedContent);
        }
      );

      toast({
        title: 'Advanced Technical Solution Generated',
        description: 'Your elite technical analysis has been completed successfully.',
      });

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate solution',
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
      const title = `Advanced_Technical_${technicalField}_${technicalLevel}_${new Date().toISOString().split('T')[0]}`;
      await ExportService.exportContent(output, title, format);
      
      toast({
        title: 'Export Successful',
        description: `Advanced solution exported as ${format.toUpperCase()} file.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export solution.',
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
        description: 'Advanced solution has been copied to your clipboard.',
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
        description: 'Advanced solution has been copied to your clipboard.',
      });
    }
  };

  const technicalFieldOptions = [
    { value: 'mathematics', label: 'Mathematics', icon: Calculator, description: 'Pure & Applied Mathematics, Analysis, Algebra' },
    { value: 'physics', label: 'Physics', icon: Zap, description: 'Theoretical & Experimental Physics, Quantum Mechanics' },
    { value: 'engineering', label: 'Engineering', icon: Settings, description: 'All Engineering Disciplines, Design Optimization' },
    { value: 'computer-science', label: 'Computer Science', icon: Cpu, description: 'Algorithms, Data Structures, Computational Theory' },
    { value: 'statistics', label: 'Statistics', icon: BarChart3, description: 'Statistical Analysis, Data Science, Machine Learning' },
    { value: 'accounting', label: 'Accounting', icon: DollarSign, description: 'Financial Analysis, Cost Accounting, Auditing' },
    { value: 'chemistry', label: 'Chemistry', icon: Microscope, description: 'Physical Chemistry, Reaction Kinetics, Thermodynamics' },
    { value: 'economics', label: 'Economics', icon: TrendingUp, description: 'Econometrics, Game Theory, Financial Economics' },
  ];

  const getPrecisionLabel = (value: number) => {
    if (value >= 95) return 'Research Grade';
    if (value >= 90) return 'Professional';
    if (value >= 85) return 'Standard';
    return 'Basic';
  };

  return (
    <div className="space-y-6">
      {/* Elite Technical Configuration */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-green-500" />
            <span>Elite Technical & Computational Specialist</span>
            <Badge variant="default" className="ml-2">Advanced AI</Badge>
          </CardTitle>
          <CardDescription>
            Superior technical analysis with mathematical rigor, computational precision, and research-grade validation across all quantitative disciplines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Technical Field</label>
              <Select value={technicalField} onValueChange={(value: TechnicalField) => setTechnicalField(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {technicalFieldOptions.map((option) => (
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
              <label className="text-sm font-medium">Technical Level</label>
              <Select value={technicalLevel} onValueChange={(value: TechnicalLevel) => setTechnicalLevel(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="graduate">Graduate/Advanced</SelectItem>
                  <SelectItem value="professional">Professional/Industry</SelectItem>
                  <SelectItem value="research">Research/PhD Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Solution Depth</label>
              <Select value={solutionDepth} onValueChange={(value: SolutionDepth) => setSolutionDepth(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Solution</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive Analysis</SelectItem>
                  <SelectItem value="research-grade">Research-Grade Study</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Validation Level</label>
              <Select value={validationLevel} onValueChange={(value: ValidationLevel) => setValidationLevel(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Validation</SelectItem>
                  <SelectItem value="advanced">Advanced Testing</SelectItem>
                  <SelectItem value="peer-review-ready">Peer-Review Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Precision Control */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Precision Requirement</label>
              <Badge variant="outline">{getPrecisionLabel(precisionLevel[0])}</Badge>
            </div>
            <Slider
              value={precisionLevel}
              onValueChange={setPrecisionLevel}
              max={99}
              min={70}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Basic (70%)</span>
              <span className="font-medium">{precisionLevel[0]}% Accuracy</span>
              <span>Research Grade (99%)</span>
            </div>
          </div>

          {/* Advanced Technical Features */}
          <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
            <h4 className="font-medium flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Advanced Technical Features</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="proofs" 
                  checked={includeProofs}
                  onCheckedChange={(val) => setIncludeProofs(val === true)}
                />
                <label htmlFor="proofs" className="text-sm">
                  Mathematical proofs & rigorous derivations
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="numerical" 
                  checked={includeNumericalAnalysis}
                  onCheckedChange={(val) => setIncludeNumericalAnalysis(val === true)}
                />
                <label htmlFor="numerical" className="text-sm">
                  Advanced numerical analysis & convergence studies
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="error-analysis" 
                  checked={includeErrorAnalysis}
                  onCheckedChange={(val) => setIncludeErrorAnalysis(val === true)}
                />
                <label htmlFor="error-analysis" className="text-sm">
                  Comprehensive error analysis & uncertainty quantification
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="alternative-methods" 
                  checked={includeAlternativeMethods}
                  onCheckedChange={(val) => setIncludeAlternativeMethods(val === true)}
                />
                <label htmlFor="alternative-methods" className="text-sm">
                  Multiple solution approaches & comparative analysis
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="computational" 
                  checked={includeComputationalImplementation}
                  onCheckedChange={(val) => setIncludeComputationalImplementation(val === true)}
                />
                <label htmlFor="computational" className="text-sm">
                  Computational implementation & code optimization
                </label>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-green-50">{getPrecisionLabel(precisionLevel[0])} Precision</Badge>
            <Badge variant="outline" className="bg-blue-50">
              {solutionDepth === 'research-grade' ? '4000-6000' : solutionDepth === 'comprehensive' ? '2500-4000' : '1500-2500'} Words
            </Badge>
            <Badge variant="outline" className="bg-purple-50">Mathematical Rigor</Badge>
            <Badge variant="outline" className="bg-amber-50">Computational Excellence</Badge>
            <Badge variant="outline" className="bg-rose-50">{validationLevel.replace('-', ' ')} Validation</Badge>
            <Badge variant="outline" className="bg-indigo-50">Professional Standards</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Problem Input */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Problem Statement</CardTitle>
          <CardDescription>
            Provide comprehensive problem description with all parameters, constraints, and requirements for {technicalLevel}-level {technicalField} analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Example: "Design and optimize a heat exchanger system for a chemical processing plant with the following specifications: fluid flow rates (hot: 2.5 kg/s at 180°C, cold: 3.2 kg/s at 25°C), pressure constraints (max 15 bar), effectiveness target >85%, and economic optimization considering capital and operating costs. Include computational fluid dynamics analysis, sensitivity studies, and uncertainty quantification for all design parameters."`}
            className="min-h-[150px]"
            disabled={isGenerating}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground space-x-4">
              <span>{input.length} characters</span>
              <span>Expected output: {solutionDepth === 'research-grade' ? '4000-6000' : solutionDepth === 'comprehensive' ? '2500-4000' : '1500-2500'} words</span>
              <span>Precision: {precisionLevel[0]}%</span>
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
              <span>{isGenerating ? 'Generating Elite Solution...' : 'Generate Technical Solution'}</span>
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
                <CardTitle>Elite Technical Solution</CardTitle>
                <CardDescription>
                  {technicalLevel.charAt(0).toUpperCase() + technicalLevel.slice(1)}-level {technicalField} analysis with {precisionLevel[0]}% precision
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
                        Technical Report DOCX
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>
                        Engineering PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('txt')}>
                        Plain Text Format
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="default" size="sm" onClick={handleSaveToChat}>
                    Continue Analysis
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/20 p-6 rounded-lg border-l-4 border-l-green-500">
              {output ? (
                <MarkdownRenderer 
                  content={output} 
                  className="max-w-none prose-lg" 
                />
              ) : (
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Sparkles className="h-5 w-5 animate-spin" />
                  <div>
                    <span className="font-medium">Generating elite technical analysis...</span>
                    <p className="text-sm">Processing advanced mathematical computations and optimization algorithms</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Performance Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Technical Solutions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>Recent Elite Solutions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {getChatsByWorker('technical').slice(0, 3).map(chat => (
              <div key={chat.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                <span className="truncate mr-2 font-medium">{chat.title}</span>
                <Button size="sm" variant="ghost" onClick={() => { switchToChat(chat.id); window.dispatchEvent(new CustomEvent('scribeai:switch-tab', { detail: { tab: 'chat' } })); }}>
                  Open
                </Button>
              </div>
            ))}
            {getChatsByWorker('technical').length === 0 && (
              <div className="text-xs text-muted-foreground italic">No advanced technical sessions yet</div>
            )}
          </CardContent>
        </Card>

        {/* Field-Specific Advanced Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              {technicalFieldOptions.find(f => f.value === technicalField)?.icon && 
                React.createElement(technicalFieldOptions.find(f => f.value === technicalField)!.icon, { className: "h-4 w-4" })
              }
              <span>Elite {technicalFieldOptions.find(f => f.value === technicalField)?.label} Capabilities</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground space-y-2">
              {technicalField === 'mathematics' && (
                <>
                  <p><strong>Advanced Analysis:</strong> Real/complex analysis, functional analysis, measure theory</p>
                  <p><strong>Pure Mathematics:</strong> Abstract algebra, topology, differential geometry</p>
                  <p><strong>Applied Mathematics:</strong> Numerical analysis, optimization, mathematical modeling</p>
                </>
              )}
              {technicalField === 'physics' && (
                <>
                  <p><strong>Theoretical Physics:</strong> Quantum field theory, general relativity, statistical mechanics</p>
                  <p><strong>Computational Physics:</strong> Monte Carlo methods, molecular dynamics, finite element analysis</p>
                  <p><strong>Experimental Physics:</strong> Data analysis, uncertainty quantification, instrumentation design</p>
                </>
              )}
              {technicalField === 'engineering' && (
                <>
                  <p><strong>Design Optimization:</strong> Multi-objective optimization, topology optimization, robust design</p>
                  <p><strong>Systems Analysis:</strong> Control theory, reliability analysis, failure mode assessment</p>
                  <p><strong>Advanced Modeling:</strong> Finite element analysis, computational fluid dynamics, multiphysics</p>
                </>
              )}
              {technicalField === 'computer-science' && (
                <>
                  <p><strong>Algorithm Design:</strong> Advanced data structures, graph algorithms, dynamic programming</p>
                  <p><strong>Computational Theory:</strong> Complexity analysis, formal verification, automata theory</p>
                  <p><strong>Systems Programming:</strong> Parallel computing, distributed systems, performance optimization</p>
                </>
              )}
              {technicalField === 'statistics' && (
                <>
                  <p><strong>Advanced Modeling:</strong> Bayesian inference, machine learning, time series analysis</p>
                  <p><strong>Experimental Design:</strong> DOE, response surface methodology, robust parameter design</p>
                  <p><strong>Computational Statistics:</strong> MCMC methods, bootstrap techniques, high-dimensional data</p>
                </>
              )}
              {technicalField === 'accounting' && (
                <>
                  <p><strong>Financial Modeling:</strong> Valuation models, risk assessment, portfolio optimization</p>
                  <p><strong>Cost Analysis:</strong> Activity-based costing, variance analysis, budget optimization</p>
                  <p><strong>Forensic Accounting:</strong> Fraud detection, statistical sampling, audit analytics</p>
                </>
              )}
              {technicalField === 'chemistry' && (
                <>
                  <p><strong>Computational Chemistry:</strong> Quantum chemistry, molecular modeling, reaction kinetics</p>
                  <p><strong>Process Design:</strong> Chemical reactor design, separation processes, optimization</p>
                  <p><strong>Analytical Chemistry:</strong> Spectroscopic analysis, chromatography, method validation</p>
                </>
              )}
              {technicalField === 'economics' && (
                <>
                  <p><strong>Econometric Analysis:</strong> Time series econometrics, panel data methods, causal inference</p>
                  <p><strong>Game Theory:</strong> Strategic behavior, mechanism design, auction theory</p>
                  <p><strong>Financial Economics:</strong> Asset pricing models, derivatives valuation, risk management</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Problem Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2">
            <Award className="h-4 w-4" />
            <span>Elite Problem Formulation Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Comprehensive Problem Definition:</strong> Include all boundary conditions, constraints, and performance criteria</p>
            <p><strong>Mathematical Rigor:</strong> Specify precision requirements, convergence criteria, and validation benchmarks</p>
            <p><strong>Advanced Analysis:</strong> Request sensitivity studies, optimization, and uncertainty quantification</p>
            <p><strong>Professional Standards:</strong> Reference industry codes, regulatory requirements, and best practices</p>
            <p><strong>Computational Efficiency:</strong> Consider algorithmic complexity, parallel processing, and scalability requirements</p>
          </div>
          
          {solutionDepth === 'research-grade' && (
            <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-l-blue-500">
              <p className="text-sm font-medium text-blue-900">Research-Grade Analysis Includes:</p>
              <ul className="text-xs text-blue-800 mt-1 space-y-1">
                <li>• Comprehensive literature review and state-of-the-art comparison</li>
                <li>• Multiple validation approaches and cross-verification methods</li>
                <li>• Advanced statistical analysis and uncertainty propagation</li>
                <li>• Computational implementation with performance benchmarking</li>
                <li>• Publication-ready documentation and peer-review standards</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Backward-compatible export alias
export { EnhancedTechnicalWriter as TechnicalWriter };