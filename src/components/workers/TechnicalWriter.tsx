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
  Calculator,
  BarChart3,
  Zap,
  DollarSign,
  Copy,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TechnicalField = 'mathematics' | 'physics' | 'engineering' | 'accounting' | 'statistics';

export const TechnicalWriter: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [technicalField, setTechnicalField] = useState<TechnicalField>('mathematics');
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
    toast({ title: 'Saved to Chat', description: 'The conversation was saved and opened in Chat.' });
  };

  const handleGenerate = async () => {
    if (!input.trim() || isGenerating) return;

    setIsGenerating(true);
    setOutput('');

    try {
      const enhancedPrompt = `
TECHNICAL DOMAIN: ${technicalField}
PROBLEM CONTEXT: Comprehensive solution with mathematical rigor

PROBLEM STATEMENT:
${input}

Provide a complete technical solution written entirely as flowing prose without any bullet points, numbered lists, or fragmented formatting. Your response must read as a continuous technical narrative that guides the reader through the problem-solving process using only paragraph form.

Begin by articulating the problem within its theoretical context, identifying the governing principles and establishing all given parameters through natural prose flow. Rather than listing given values or requirements, incorporate them smoothly into your explanation of the problem's significance within ${technicalField}.

Develop your solution through connected paragraphs where each mathematical step flows logically from the previous one. Instead of presenting numbered steps or bullet-pointed procedures, embed your calculations and reasoning within explanatory sentences that show how each part of the solution emerges from fundamental principles. Use LaTeX formatting for equations ($display$ or $inline$) but surround them with explanatory text that maintains the narrative flow.

When multiple solution approaches exist, discuss them within the same paragraph, explaining your chosen method through comparative analysis rather than separate listed options. If assumptions are necessary, weave them naturally into your explanation rather than listing them separately. Throughout your mathematical work, maintain dimensional consistency and provide physical interpretation of results through integrated discussion rather than separate commentary.

Your mathematical exposition should read like expert technical communication - each calculation emerges naturally from the previous reasoning, and every result leads logically to the next consideration. Use markdown formatting minimally - **bold** only for final answers or truly critical equations, and avoid any list-making structures including bullet points (*), numbers (1.), or dashes (-).

Conclude with a comprehensive answer that synthesizes your findings into a coherent final result, discussing the reasonableness of your solution and its broader implications through natural prose flow. Your entire response should read as a unified technical analysis that maintains continuous narrative flow from problem statement to final conclusion.`;

      let accumulatedContent = '';
      
      await ScribeAIService.sendMessage(
        enhancedPrompt,
        'technical',
        [],
        (chunk: string) => {
          accumulatedContent += chunk;
          setOutput(accumulatedContent);
        }
      );

      toast({
        title: 'Solution Complete',
        description: 'Your technical solution has been generated successfully.',
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
      const title = `Technical_${technicalField}_${new Date().toISOString().split('T')[0]}`;
      await ExportService.exportContent(output, title, format);
      
      toast({
        title: 'Export Successful',
        description: `Solution exported as ${format.toUpperCase()} file.`,
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

  const technicalFieldOptions = [
    { value: 'mathematics', label: 'Mathematics', icon: Calculator, description: 'Algebra, Calculus, Linear Algebra, Discrete Math' },
    { value: 'physics', label: 'Physics', icon: Zap, description: 'Mechanics, Thermodynamics, Electromagnetism, Quantum' },
    { value: 'engineering', label: 'Engineering', icon: BarChart3, description: 'Structural, Electrical, Mechanical, Chemical' },
    { value: 'accounting', label: 'Accounting', icon: DollarSign, description: 'Financial Analysis, Cost Accounting, Budgeting' },
    { value: 'statistics', label: 'Statistics', icon: BarChart3, description: 'Data Analysis, Probability, Hypothesis Testing' },
  ];

  const currentField = technicalFieldOptions.find(field => field.value === technicalField);

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-green-500" />
            <span>Technical & Calculation Model</span>
          </CardTitle>
          <CardDescription>
            Mathematics, physics, engineering, accounting - formulas and problem-solving with comprehensive solutions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              {currentField && <currentField.icon className="h-4 w-4" />}
              <span className="font-medium text-sm">Selected: {currentField?.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{currentField?.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Mathematical Rigor</Badge>
            <Badge variant="outline">Theoretical Foundation</Badge>
            <Badge variant="outline">Dimensional Analysis</Badge>
            <Badge variant="outline">Complete Solutions</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Problem Statement</CardTitle>
          <CardDescription>
            Describe your technical problem, include all given values and what you need to find
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Example: "A projectile is launched at an angle of 45° with an initial velocity of 20 m/s. Calculate the maximum height reached, time of flight, and horizontal range. Include air resistance effects if significant."`}
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
              <span>{isGenerating ? 'Solving...' : 'Solve'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Output Section */}
      {(output || isGenerating) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Technical Solution</CardTitle>
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
                  <span>Generating comprehensive solution...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Technical History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Technical Chats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {getChatsByWorker('technical').slice(0, 5).map(chat => (
            <div key={chat.id} className="flex items-center justify-between text-sm">
              <span className="truncate mr-2">{chat.title}</span>
              <Button size="sm" variant="outline" onClick={() => { switchToChat(chat.id); window.dispatchEvent(new CustomEvent('scribeai:switch-tab', { detail: { tab: 'chat' } })); }}>Open</Button>
            </div>
          ))}
          {getChatsByWorker('technical').length === 0 && (
            <div className="text-xs text-muted-foreground">No saved technical chats yet.</div>
          )}
        </CardContent>
      </Card>

      {/* Field-Specific Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Advanced Problem Types for {currentField?.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground space-y-1">
            {technicalField === 'mathematics' && (
              <>
                <p><strong>Differential Equations:</strong> Solve complex ODEs and PDEs with boundary conditions and physical interpretations</p>
                <p><strong>Advanced Calculus:</strong> Multi-variable optimization, vector calculus applications in physics and engineering</p>
                <p><strong>Linear Algebra:</strong> Eigenvalue problems, matrix decompositions with real-world applications</p>
                <p><strong>Abstract Mathematics:</strong> Proof techniques, group theory, topology with clear exposition</p>
              </>
            )}
            {technicalField === 'physics' && (
              <>
                <p><strong>Classical Mechanics:</strong> Lagrangian and Hamiltonian formulations, complex multi-body systems</p>
                <p><strong>Electrodynamics:</strong> Maxwell equations, electromagnetic wave propagation, antenna theory</p>
                <p><strong>Quantum Mechanics:</strong> Schrödinger equation solutions, quantum statistical mechanics</p>
                <p><strong>Thermodynamics:</strong> Statistical mechanics, phase transitions, irreversible processes</p>
              </>
            )}
            {technicalField === 'engineering' && (
              <>
                <p><strong>Structural Analysis:</strong> Advanced beam theory, finite element analysis, dynamic response</p>
                <p><strong>Control Systems:</strong> Stability analysis, optimal control, robust design methodologies</p>
                <p><strong>Fluid Mechanics:</strong> Viscous flow, turbulence modeling, computational fluid dynamics</p>
                <p><strong>Heat Transfer:</strong> Conduction, convection, radiation with numerical solutions</p>
              </>
            )}
            {technicalField === 'accounting' && (
              <>
                <p><strong>Advanced Financial Analysis:</strong> Multi-period valuation models, risk assessment frameworks</p>
                <p><strong>Management Accounting:</strong> Activity-based costing, strategic cost management</p>
                <p><strong>Investment Analysis:</strong> Portfolio optimization, derivative valuation, capital budgeting</p>
                <p><strong>International Accounting:</strong> Currency hedging, transfer pricing, consolidation</p>
              </>
            )}
            {technicalField === 'statistics' && (
              <>
                <p><strong>Advanced Modeling:</strong> Bayesian inference, machine learning algorithms, time series analysis</p>
                <p><strong>Experimental Design:</strong> ANOVA, factorial designs, response surface methodology</p>
                <p><strong>Multivariate Statistics:</strong> Principal component analysis, factor analysis, clustering</p>
                <p><strong>Statistical Computing:</strong> Monte Carlo methods, bootstrap techniques, simulation studies</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};