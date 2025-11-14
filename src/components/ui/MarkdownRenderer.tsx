import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkEmoji from 'remark-emoji';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight, prism, tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/components/theme-provider';
import 'katex/dist/katex.min.css';

// Enhanced KaTeX styles for better math rendering across themes
const mathStyles = `
  .katex { 
    font-size: 1.1em !important; 
    line-height: 1.4 !important;
  }
  .katex-display {
    margin: 1.5em 0 !important;
    padding: 1rem !important;
    background: rgba(var(--muted-rgb, 248 250 252), 0.3) !important;
    border-radius: 0.5rem !important;
    border: 1px solid rgba(var(--border-rgb, 229 231 235), 0.5) !important;
    overflow-x: auto !important;
  }
  .dark .katex { 
    color: rgb(248 250 252) !important; 
  }
  .dark .katex-display {
    background: rgba(39, 39, 42, 0.3) !important;
    border-color: rgba(63, 63, 70, 0.5) !important;
  }
  .katex .mord.text {
    font-family: inherit !important;
  }
  .katex .mspace {
    margin-right: 0.2em !important;
  }
  .katex .base {
    position: relative;
  }
  /* Enhanced fraction rendering */
  .katex .frac-line {
    border-bottom-width: 0.08em !important;
  }
  /* Better matrix rendering */
  .katex .arraycolsep {
    width: 0.5em !important;
  }
  /* Improved integral symbols */
  .katex .op-symbol {
    position: relative;
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('enhanced-katex-ui-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'enhanced-katex-ui-styles';
  styleEl.textContent = mathStyles;
  document.head.appendChild(styleEl);
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: 'default' | 'chat' | 'document' | 'minimal' | 'academic';
  enableAnimations?: boolean;
  showLineNumbers?: boolean;
  codeTheme?: 'oneDark' | 'oneLight' | 'prism' | 'tomorrow';
  mathDisplayMode?: 'inline' | 'block' | 'auto';
  enableMathCopy?: boolean;
  enableAdvancedFormatting?: boolean;
}

// Enhanced copy functionality with math-aware copying
const CopyButton: React.FC<{ text: string; className?: string; isMath?: boolean }> = ({ 
  text, 
  className = "", 
  isMath = false 
}) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      // For math expressions, preserve LaTeX syntax
      const textToCopy = isMath ? text : text;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`absolute top-2 right-2 p-2 rounded-md bg-background/80 hover:bg-background border border-border/50 hover:border-border transition-all duration-200 group z-10 ${className}`}
      title={isMath ? "Copy LaTeX" : "Copy to clipboard"}
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

// Math expression wrapper for enhanced display
const MathExpression: React.FC<{ 
  children: React.ReactNode; 
  isBlock?: boolean; 
  latex?: string;
  enableCopy?: boolean;
}> = ({ children, isBlock = false, latex, enableCopy = false }) => {
  const [showCopy, setShowCopy] = useState(false);
  
  return (
    <div 
      className={`relative inline-block ${isBlock ? 'w-full' : ''} group`}
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
    >
      {children}
      {enableCopy && latex && showCopy && (
        <CopyButton 
          text={latex} 
          isMath={true}
          className={isBlock ? "opacity-0 group-hover:opacity-100" : ""}
        />
      )}
    </div>
  );
};

// Enhanced collapsible section with better accessibility
const CollapsibleSection: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  variant?: 'default' | 'theorem' | 'proof' | 'example' | 'definition';
}> = ({
  title,
  children,
  defaultOpen = false,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variants = {
    default: 'border-border bg-muted/20',
    theorem: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950',
    proof: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950',
    example: 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950',
    definition: 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950'
  };

  return (
    <div className={`my-4 border rounded-lg overflow-hidden ${variants[variant]}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 text-left flex items-center justify-between transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        aria-expanded={isOpen}
        aria-controls={`collapsible-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span className="font-medium text-foreground flex items-center gap-2">
          {variant !== 'default' && (
            <span className="text-xs uppercase tracking-wider opacity-70">
              {variant}
            </span>
          )}
          {title}
        </span>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isOpen && (
        <div 
          id={`collapsible-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="p-4 bg-background/50 border-t border-border/50"
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Enhanced alert/callout component with more types
const Alert: React.FC<{ 
  type: 'info' | 'warning' | 'error' | 'success' | 'note' | 'theorem' | 'proof' | 'example' | 'definition' | 'lemma' | 'corollary'; 
  children: React.ReactNode;
  title?: string;
}> = ({ type, children, title }) => {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
    note: 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
    theorem: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
    proof: 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200',
    example: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200',
    definition: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200',
    lemma: 'border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-800 dark:bg-pink-950 dark:text-pink-200',
    corollary: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200'
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
    note: '📝',
    theorem: '🔢',
    proof: '✓',
    example: '💡',
    definition: '📚',
    lemma: '🧮',
    corollary: '⚡'
  };

  const defaultTitles = {
    info: 'Information',
    warning: 'Warning',
    error: 'Error',
    success: 'Success',
    note: 'Note',
    theorem: 'Theorem',
    proof: 'Proof',
    example: 'Example',
    definition: 'Definition',
    lemma: 'Lemma',
    corollary: 'Corollary'
  };

  return (
    <div className={`my-4 p-4 rounded-lg border-l-4 ${styles[type]} shadow-sm`}>
      <div className="flex items-start">
        <span className="mr-3 text-lg flex-shrink-0">{icons[type]}</span>
        <div className="flex-1">
          {(title || ['theorem', 'proof', 'example', 'definition', 'lemma', 'corollary'].includes(type)) && (
            <div className="font-semibold mb-2 text-sm uppercase tracking-wider">
              {title || defaultTitles[type]}
            </div>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};

// Chemical formula renderer
const ChemicalFormula: React.FC<{ formula: string }> = ({ formula }) => {
  const renderFormula = (text: string) => {
    return text.replace(/(\d+)/g, '<sub>$1</sub>')
               .replace(/\^([+-]?\d*)/g, '<sup>$1</sup>');
  };

  return (
    <span 
      className="font-mono text-foreground"
      dangerouslySetInnerHTML={{ __html: renderFormula(formula) }}
    />
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
  variant = 'default',
  enableAnimations = true,
  showLineNumbers = false,
  codeTheme = 'oneDark',
  mathDisplayMode = 'auto',
  enableMathCopy = true,
  enableAdvancedFormatting = true
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const codeStyles = {
    oneDark,
    oneLight,
    prism,
    tomorrow
  };

  const getCodeStyle = () => {
    if (codeTheme === 'oneDark' || codeTheme === 'oneLight') {
      return isDark ? oneDark : oneLight;
    }
    return codeStyles[codeTheme];
  };

  // Enhanced content processing with better math support
  const processedContent = content
    // Handle advanced math environments
    .replace(/\\begin\{(align|equation|gather|multline|split|alignat)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, 
      (match, env, content) => `$$\\begin{${env}}\n${content}\n\\end{${env}}$$`)
    
    // Handle chemical formulas
    .replace(/\{chem:([^}]+)\}/g, '<span data-chemical="$1"></span>')
    
    // Enhanced alerts/callouts with more academic types
    .replace(/^> \*\*(Info|Warning|Error|Success|Note|Theorem|Proof|Example|Definition|Lemma|Corollary)\*\*:?\s*(.*?)(?:\n> (.*))*$/gm, 
      (match, type, title, content = '') => {
        const fullContent = title + (content ? '\n' + content : '');
        return `<div data-alert="${type.toLowerCase()}" data-title="${title}">${fullContent}</div>`;
      })
    
    // Handle advanced details/summary with variants
    .replace(/<details(?:\s+data-variant="(theorem|proof|example|definition)")?\s*>\s*<summary>(.*?)<\/summary>([\s\S]*?)<\/details>/g, 
      '<div data-collapsible="true" data-title="$2" data-variant="$1">$3</div>')
    
    // Enhanced task lists with priorities
    .replace(/^(\s*)- \[([ x!?])\] /gm, '$1- [$2] ')
    
    // Handle advanced footnotes with hover previews
    .replace(/\[\^([a-zA-Z0-9_-]+)\](?::\s*(.+))?/g, (match, id, definition) => {
      if (definition) {
        return `<span data-footnote-def="${id}" style="display:none;">${definition}</span>`;
      }
      return `<sup><a href="#fn-${id}" id="ref-${id}" data-footnote="${id}">${id}</a></sup>`;
    })
    
    // Handle definition lists with enhanced formatting
    .replace(/^([^:\n]+)\n:\s+(.+)$/gm, '<dl><dt>$1</dt><dd>$2</dd></dl>')
    
    // Handle keyboard shortcuts with better styling
    .replace(/\[\[([^\]]+)\]\]/g, '<kbd data-shortcut="true">$1</kbd>')
    
         // Handle advanced highlights and annotations (avoid conflicts with LaTeX)
     .replace(/(?<!\\)==(.*?)==/g, '<mark data-highlight="yellow">$1</mark>')
     .replace(/(?<!\\)==(red|green|blue|yellow|pink|purple)\|(.*?)==/g, '<mark data-highlight="$1">$2</mark>')
    
    // Handle subscript and superscript with better detection
    .replace(/(?<!\$)~([^~\s]+)~/g, '<sub>$1</sub>')
    .replace(/(?<!\$)\^([^^+\-\s]+)\^/g, '<sup>$1</sup>')
    
    // Handle abbreviations with definitions
    .replace(/\*\[([^\]]+)\]:\s*(.+)/gm, '<abbr title="$2" data-abbr="true">$1</abbr>')
    
    // Handle advanced math shortcuts
    .replace(/\\R(?![a-zA-Z])/g, '\\mathbb{R}')
    .replace(/\\N(?![a-zA-Z])/g, '\\mathbb{N}')
    .replace(/\\Z(?![a-zA-Z])/g, '\\mathbb{Z}')
    .replace(/\\Q(?![a-zA-Z])/g, '\\mathbb{Q}')
    .replace(/\\C(?![a-zA-Z])/g, '\\mathbb{C}')
    
    // Handle units and measurements
    .replace(/(\d+(?:\.\d+)?)\s*(m|km|cm|mm|s|min|h|kg|g|mg|°C|°F|K)\b/g, '$1<span class="unit">$2</span>')
    
    // Handle cross-references
    .replace(/@ref\[([^\]]+)\]/g, '<a href="#$1" class="cross-ref">$1</a>')
    
    // Handle citations
    .replace(/@cite\[([^\]]+)\]/g, '<sup class="citation"><a href="#cite-$1">$1</a></sup>');

  // Enhanced KaTeX configuration
  const katexOptions = {
    strict: false,
    throwOnError: false,
    displayMode: mathDisplayMode === 'block',
    macros: {
      "\\R": "\\mathbb{R}",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}",
      "\\Q": "\\mathbb{Q}",
      "\\C": "\\mathbb{C}",
      "\\H": "\\mathbb{H}",
      "\\E": "\\mathbb{E}",
      "\\P": "\\mathbb{P}",
      "\\Var": "\\text{Var}",
      "\\Cov": "\\text{Cov}",
      "\\sum": "\\displaystyle\\sum",
      "\\prod": "\\displaystyle\\prod",
      "\\int": "\\displaystyle\\int",
      "\\oint": "\\displaystyle\\oint",
      "\\iint": "\\displaystyle\\iint",
      "\\iiint": "\\displaystyle\\iiint",
      "\\lim": "\\displaystyle\\lim",
      "\\limsup": "\\displaystyle\\limsup",
      "\\liminf": "\\displaystyle\\liminf",
      "\\max": "\\displaystyle\\max",
      "\\min": "\\displaystyle\\min",
      "\\sup": "\\displaystyle\\sup",
      "\\inf": "\\displaystyle\\inf",
      "\\argmax": "\\displaystyle\\operatorname{arg\\,max}",
      "\\argmin": "\\displaystyle\\operatorname{arg\\,min}",
      "\\deg": "\\operatorname{deg}",
      "\\dim": "\\operatorname{dim}",
      "\\rank": "\\operatorname{rank}",
      "\\tr": "\\operatorname{tr}",
      "\\det": "\\operatorname{det}",
      "\\span": "\\operatorname{span}",
      "\\null": "\\operatorname{null}",
      "\\range": "\\operatorname{range}",
      "\\col": "\\operatorname{col}",
      "\\row": "\\operatorname{row}",
      "\\adj": "\\operatorname{adj}",
      "\\sgn": "\\operatorname{sgn}",
      "\\lcm": "\\operatorname{lcm}",
      "\\gcd": "\\operatorname{gcd}",
      "\\ord": "\\operatorname{ord}",
      "\\ker": "\\operatorname{ker}",
      "\\im": "\\operatorname{im}",
      "\\re": "\\operatorname{re}",
      "\\d": "\\,\\mathrm{d}",
      "\\dx": "\\,\\mathrm{d}x",
      "\\dy": "\\,\\mathrm{d}y",
      "\\dz": "\\,\\mathrm{d}z",
      "\\dt": "\\,\\mathrm{d}t",
      "\\du": "\\,\\mathrm{d}u",
      "\\dv": "\\,\\mathrm{d}v",
      "\\dw": "\\,\\mathrm{d}w",
      "\\dr": "\\,\\mathrm{d}r",
      "\\dtheta": "\\,\\mathrm{d}\\theta",
      "\\dphi": "\\,\\mathrm{d}\\phi",
      "\\grad": "\\nabla",
      "\\divergence": "\\nabla\\cdot",
      "\\curl": "\\nabla\\times",
      "\\laplacian": "\\nabla^2"
    },
    trust: (context: any) => ['\\url', '\\href', '\\includegraphics'].includes(context.command),
    strictMode: (errorCode: string) => errorCode === "unicodeTextInMathMode" ? "ignore" : "warn"
  };

  return (
    <div
      className={[
        'prose prose-sm max-w-none',
        isDark ? 'dark:prose-invert' : '',
        'prose-headings:scroll-mt-16 prose-headings:font-bold',
        'prose-pre:bg-transparent prose-pre:p-0 prose-code:before:content-[none] prose-code:after:content-[none]',
        'prose-li:my-0 prose-ul:my-2 prose-ol:my-2',
        variant === 'academic' ? 'prose-lg' : '',
        enableAnimations ? 'animate-in' : '',
        variant,
        className
      ].join(' ').trim()}
      style={{
        '--unit-color': 'rgb(var(--muted-foreground-rgb, 107 114 128))',
        '--citation-color': 'rgb(var(--primary-rgb, 59 130 246))'
      } as React.CSSProperties}
    >
      <style>
        {`
          .unit {
            font-size: 0.9em;
            color: var(--unit-color);
            font-weight: 500;
            margin-left: 0.1em;
          }
          .citation {
            color: var(--citation-color);
            text-decoration: none;
          }
          .cross-ref {
            color: var(--citation-color);
            text-decoration: none;
            font-weight: 500;
          }
          .cross-ref:hover {
            text-decoration: underline;
          }
          mark[data-highlight="red"] { background: rgb(254 202 202); color: rgb(153 27 27); }
          mark[data-highlight="green"] { background: rgb(187 247 208); color: rgb(22 101 52); }
          mark[data-highlight="blue"] { background: rgb(191 219 254); color: rgb(30 64 175); }
          mark[data-highlight="pink"] { background: rgb(252 207 244); color: rgb(157 23 77); }
          mark[data-highlight="purple"] { background: rgb(221 214 254); color: rgb(109 40 217); }
          .dark mark[data-highlight="red"] { background: rgb(127 29 29); color: rgb(254 202 202); }
          .dark mark[data-highlight="green"] { background: rgb(22 101 52); color: rgb(187 247 208); }
          .dark mark[data-highlight="blue"] { background: rgb(30 58 138); color: rgb(191 219 254); }
          .dark mark[data-highlight="pink"] { background: rgb(131 24 67); color: rgb(252 207 244); }
          .dark mark[data-highlight="purple"] { background: rgb(88 28 135); color: rgb(221 214 254); }
          kbd[data-shortcut="true"] {
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
            background: linear-gradient(to bottom, #f9f9f9, #e9e9e9);
            border: 1px solid #d4d4d4;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .dark kbd[data-shortcut="true"] {
            background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
            border: 1px solid #666;
          }
        `}
      </style>
      
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkEmoji, remarkBreaks]}
        rehypePlugins={[[rehypeKatex, katexOptions], rehypeRaw]}
        components={{
          // All previous components remain the same, with enhanced math handling...
          


          // Handle chemical formulas
          // @ts-expect-error: allow custom data-* attributes
          span: ({ children, 'data-chemical': chemical, ...props }) => {
            if (chemical) {
              return <ChemicalFormula formula={chemical} />;
            }
            return <span {...props}>{children}</span>;
          },

          // Enhanced custom elements with academic variants
          div: ({ 
            children, 
            ...props 
          }: any) => {
            const alertType = (props as any)['data-alert'];
            const isCollapsible = (props as any)['data-collapsible'];
            const title = (props as any)['data-title'];
            const variant = (props as any)['data-variant'];
            
            if (alertType) {
              return <Alert type={alertType as any} title={title}>{children}</Alert>;
            }
            if (isCollapsible) {
              return (
                <CollapsibleSection 
                  title={title || 'Details'} 
                  variant={variant as any || 'default'}
                >
                  {children}
                </CollapsibleSection>
              );
            }
            return <div {...props}>{children}</div>;
          },

          // Enhanced code blocks remain the same...
          // @ts-expect-error: react-markdown component prop types
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && language) {
              return (
                <div className="my-6 group relative">
                  <div className="flex items-center justify-between bg-muted/80 px-4 py-2 rounded-t-lg border border-b-0 border-border">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono font-medium text-muted-foreground">
                        {language.toUpperCase()}
                      </span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      </div>
                    </div>
                    <CopyButton text={codeString} />
                  </div>
                  <div className="relative overflow-hidden rounded-b-lg border border-border">
                    {(
                      <SyntaxHighlighter
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        style={getCodeStyle() as any}
                        language={language}
                        PreTag="div"
                        showLineNumbers={showLineNumbers}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        customStyle={{
                          margin: 0,
                          borderRadius: 0,
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          padding: '1rem',
                          background: 'transparent',
                        } as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        codeTagProps={{
                          style: {
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                          }
                        } as any}
                        {...(props as any)}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    )}
                  </div>
                </div>
              );
            }
            
            return (
              <code 
                className="relative rounded-md bg-muted/80 px-2 py-1 font-mono text-sm text-foreground border border-border/50 hover:border-border transition-colors"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Clean headings without hash symbols - Enhanced for mobile boldness
          h1: ({ children, ...props }) => {
            const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') : '';
            return (
              <h1 
                id={id}
                className="text-3xl font-extrabold mb-6 mt-8 text-foreground border-b border-border pb-2 scroll-mt-16 !font-extrabold"
                style={{ fontWeight: '800' }}
                {...props}
              >
                {children}
              </h1>
            );
          },

          h2: ({ children, ...props }) => {
            const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') : '';
            return (
              <h2 
                id={id}
                className="text-2xl font-bold mb-4 mt-6 text-foreground border-b border-border pb-1 scroll-mt-16 !font-bold"
                style={{ fontWeight: '700' }}
                {...props}
              >
                {children}
              </h2>
            );
          },

          h3: ({ children, ...props }) => {
            const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') : '';
            return (
              <h3 
                id={id}
                className="text-xl font-bold mb-3 mt-5 text-foreground scroll-mt-16 !font-bold"
                style={{ fontWeight: '700' }}
                {...props}
              >
                {children}
              </h3>
            );
          },

          h4: ({ children, ...props }) => (
            <h4 
              className="text-lg font-bold mb-2 mt-4 text-foreground !font-bold" 
              style={{ fontWeight: '700' }}
              {...props}
            >
              {children}
            </h4>
          ),

          h5: ({ children, ...props }) => (
            <h5 
              className="text-base font-bold mb-2 mt-3 text-foreground !font-bold" 
              style={{ fontWeight: '700' }}
              {...props}
            >
              {children}
            </h5>
          ),

          h6: ({ children, ...props }) => (
            <h6 
              className="text-sm font-bold mb-2 mt-3 text-foreground !font-bold" 
              style={{ fontWeight: '700' }}
              {...props}
            >
              {children}
            </h6>
          ),

          // Enhanced paragraphs with figure handling
          p: ({ children, ...props }) => {
            const child = Array.isArray(children) && children.length === 1 ? children[0] : null;
            
            // Enhanced figure placeholders with more types
            if (typeof child === 'string') {
              const figureMatch = child.match(/^\[FIGURE (\d+): ([^\]]+)\]$/);
              const tableMatch = child.match(/^\[TABLE (\d+): ([^\]]+)\]$/);
              const chartMatch = child.match(/^\[CHART (\d+): ([^\]]+)\]$/);
              const diagramMatch = child.match(/^\[DIAGRAM (\d+): ([^\]]+)\]$/);
              
              if (figureMatch) {
                const [, figNum, description] = figureMatch;
                return (
                  <div className="my-6 p-6 border-2 border-dashed border-primary/30 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all duration-300 group">
                    <div className="text-center">
                      <div className="text-primary font-bold text-xl mb-3 group-hover:scale-105 transition-transform">
                        📊 FIGURE {figNum}
                      </div>
                      <div className="text-foreground font-medium text-base mb-2">{description}</div>
                      <div className="text-muted-foreground text-sm italic">
                        Figure placeholder - will be inserted during document export
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (tableMatch) {
                const [, tableNum, description] = tableMatch;
                return (
                  <div className="my-6 p-6 border-2 border-dashed border-green-300 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:from-green-100 hover:to-green-150 dark:hover:from-green-800 dark:hover:to-green-700 transition-all duration-300 group">
                    <div className="text-center">
                      <div className="text-green-600 dark:text-green-400 font-bold text-xl mb-3 group-hover:scale-105 transition-transform">
                        📋 TABLE {tableNum}
                      </div>
                      <div className="text-foreground font-medium text-base mb-2">{description}</div>
                      <div className="text-muted-foreground text-sm italic">
                        Table placeholder - will be inserted during document export
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (chartMatch) {
                const [, chartNum, description] = chartMatch;
                return (
                  <div className="my-6 p-6 border-2 border-dashed border-purple-300 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 hover:from-purple-100 hover:to-purple-150 dark:hover:from-purple-800 dark:hover:to-purple-700 transition-all duration-300 group">
                    <div className="text-center">
                      <div className="text-purple-600 dark:text-purple-400 font-bold text-xl mb-3 group-hover:scale-105 transition-transform">
                        📈 CHART {chartNum}
                      </div>
                      <div className="text-foreground font-medium text-base mb-2">{description}</div>
                      <div className="text-muted-foreground text-sm italic">
                        Chart placeholder - will be inserted during document export
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (diagramMatch) {
                const [, diagramNum, description] = diagramMatch;
                return (
                  <div className="my-6 p-6 border-2 border-dashed border-orange-300 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 hover:from-orange-100 hover:to-orange-150 dark:hover:from-orange-800 dark:hover:to-orange-700 transition-all duration-300 group">
                    <div className="text-center">
                      <div className="text-orange-600 dark:text-orange-400 font-bold text-xl mb-3 group-hover:scale-105 transition-transform">
                        🔷 DIAGRAM {diagramNum}
                      </div>
                      <div className="text-foreground font-medium text-base mb-2">{description}</div>
                      <div className="text-muted-foreground text-sm italic">
                        Diagram placeholder - will be inserted during document export
                      </div>
                    </div>
                  </div>
                );
              }
            }

            return (
              <p className="mb-4 leading-7 text-foreground [&:not(:first-child)]:mt-4" {...props}>
                {children}
              </p>
            );
          },

          // Enhanced lists with better styling and task list support
          ul: ({ children, ...props }) => (
            <ul className="list-disc ml-6 my-4 space-y-1" {...props}>
              {children}
            </ul>
          ),

          ol: ({ children, ...props }) => (
            <ol className="list-decimal ml-6 my-4 space-y-1" {...props}>
              {children}
            </ol>
          ),

          li: ({ children, ...props }) => {
            // Enhanced task list rendering
            const childrenArray = React.Children.toArray(children);
            const firstChild = childrenArray[0];
            
            if (typeof firstChild === 'string') {
              const taskMatch = firstChild.match(/^\[([ x!?])\] (.*)$/);
              if (taskMatch) {
                const [, status, text] = taskMatch;
                const isChecked = status === 'x';
                const isPriority = status === '!';
                const isQuestion = status === '?';
                
                return (
                  <li className="list-none -ml-6 flex items-start gap-2" {...props}>
                    <div className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center text-xs font-bold ${
                      isChecked 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isPriority 
                        ? 'bg-red-100 border-red-500 text-red-600' 
                        : isQuestion
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-600'
                        : 'border-border bg-background'
                    }`}>
                      {isChecked ? '✓' : isPriority ? '!' : isQuestion ? '?' : ''}
                    </div>
                    <span className={`leading-6 ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {text}
                      {childrenArray.slice(1)}
                    </span>
                  </li>
                );
              }
            }
            
            return (
              <li className="leading-6 text-foreground" {...props}>
                {children}
              </li>
            );
          },

          // Enhanced blockquotes with attribution support
          blockquote: ({ children, ...props }) => {
            // Check if last paragraph contains attribution
            const childrenArray = React.Children.toArray(children);
            const lastChild = childrenArray[childrenArray.length - 1];
            
            return (
              <blockquote 
                className="border-l-4 border-primary pl-6 italic my-6 text-muted-foreground bg-gradient-to-r from-muted/30 to-transparent py-4 rounded-r-lg relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-primary/50 before:to-primary" 
                {...props}
              >
                <div className="relative z-10">{children}</div>
              </blockquote>
            );
          },

          // Enhanced tables with sorting and better styling
          table: ({ children, ...props }) => (
            <div className="my-6 overflow-x-auto">
              <div className="inline-block min-w-full shadow-sm">
                <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden border border-border" {...props}>
                  {children}
                </table>
              </div>
            </div>
          ),

          thead: ({ children, ...props }) => (
            <thead className="bg-muted/50" {...props}>
              {children}
            </thead>
          ),

          tbody: ({ children, ...props }) => (
            <tbody className="bg-background divide-y divide-border" {...props}>
              {children}
            </tbody>
          ),

          tr: ({ children, ...props }) => (
            <tr className="hover:bg-muted/30 transition-colors duration-150" {...props}>
              {children}
            </tr>
          ),

          th: ({ children, ...props }) => (
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground uppercase tracking-wider border-r border-border last:border-r-0" {...props}>
              {children}
            </th>
          ),

          td: ({ children, ...props }) => (
            <td className="px-6 py-4 text-sm text-foreground border-r border-border last:border-r-0" {...props}>
              {children}
            </td>
          ),

          // Enhanced horizontal rule with decorative elements
          hr: ({ ...props }) => (
            <div className="my-8 flex items-center" {...props}>
              <div className="flex-1 border-t border-border"></div>
              <div className="px-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1 border-t border-border"></div>
            </div>
          ),

          // Enhanced links with better external link handling
          a: ({ children, href, ...props }) => {
            const isExternal = href?.startsWith('http');
            const isFootnote = href?.startsWith('#fn-');
            const isCrossRef = props.className?.includes('cross-ref');
            
            return (
              <a 
                href={href}
                className={`
                  ${isCrossRef 
                    ? 'text-primary hover:text-primary/80 font-medium no-underline bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-all' 
                    : isFootnote
                    ? 'text-primary hover:text-primary/80 no-underline font-medium'
                    : 'text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/50 hover:decoration-primary transition-all duration-200'
                  } inline-flex items-center gap-1
                `}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                {...props}
              >
                {children}
                {isExternal && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </a>
            );
          },

          // Enhanced text formatting
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-foreground" {...props}>
              {children}
            </strong>
          ),

          em: ({ children, ...props }) => (
            <em className="italic text-foreground" {...props}>
              {children}
            </em>
          ),

          // Enhanced images with captions, zoom, and figure numbering
          img: ({ src, alt, title, ...props }) => (
            <figure className="my-6 group">
              <div className="relative overflow-hidden rounded-lg border border-border shadow-lg hover:shadow-xl transition-all duration-300">
                <img 
                  src={src} 
                  alt={alt}
                  title={title}
                  className="max-w-full h-auto group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                  {...props}
                />
              </div>
              {(alt || title) && (
                <figcaption className="text-sm text-muted-foreground text-center mt-3 italic font-medium">
                  {title ? (
                    <>
                      <span className="font-semibold">Figure:</span> {title}
                      {alt && alt !== title && <span className="block mt-1 text-xs">{alt}</span>}
                    </>
                  ) : (
                    alt
                  )}
                </figcaption>
              )}
            </figure>
          ),

          // Handle special formatting elements
          mark: ({ children, ...props }: any) => {
            const highlight = (props as any)['data-highlight'];
            return (
              <mark 
                className={`px-1 rounded ${!highlight ? 'bg-yellow-200 dark:bg-yellow-800' : ''} text-foreground`} 
                data-highlight={highlight}
                {...props}
              >
                {children}
              </mark>
            );
          },

          kbd: ({ children, ...props }: any) => {
            const isShortcut = (props as any)['data-shortcut'];
            return (
              <kbd 
                className={`px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm ${
                  isShortcut ? 'font-mono' : ''
                }`} 
                {...props}
              >
                {children}
              </kbd>
            );
          },

          sub: ({ children, ...props }) => (
            <sub className="align-sub text-[0.8em] leading-none" {...props}>{children}</sub>
          ),

          sup: ({ children, ...props }) => (
            <sup className="align-super text-[0.8em] leading-none" {...props}>{children}</sup>
          ),

          abbr: ({ children, title, ...props }: any) => {
            const isAbbr = (props as any)['data-abbr'];
            return (
              <abbr 
                title={title}
                className={`cursor-help border-b border-dotted border-muted-foreground ${
                  isAbbr ? 'font-medium' : ''
                }`}
                {...props}
              >
                {children}
              </abbr>
            );
          },

          // Enhanced definition lists
          dl: ({ children, ...props }) => (
            <dl className="my-4 grid grid-cols-1 gap-3 bg-muted/20 p-4 rounded-lg border border-border" {...props}>
              {children}
            </dl>
          ),

          dt: ({ children, ...props }) => (
            <dt className="font-semibold text-foreground text-sm uppercase tracking-wide" {...props}>
              {children}
            </dt>
          ),

          dd: ({ children, ...props }) => (
            <dd className="ml-4 text-foreground mb-3 pl-4 border-l-2 border-primary/30" {...props}>
              {children}
            </dd>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};