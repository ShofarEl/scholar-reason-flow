import React, { useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/components/theme-provider';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';

// Optimized styling
const mathStyles = `
  .katex {
    font-size: 1em !important;
  }
  .dark .katex {
    color: rgb(248 250 252) !important;
  }
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('katex-theme-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'katex-theme-styles';
  styleElement.textContent = mathStyles;
  document.head.appendChild(styleElement);
}

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}


export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ 
  content, 
  isUser = false 
}) => {
  const { theme } = useTheme();
  const [copiedBlocks, setCopiedBlocks] = React.useState<Set<string>>(new Set());
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });
  }, [theme]);

  // Render Mermaid diagrams
  useEffect(() => {
    if (mermaidRef.current) {
      const mermaidElements = mermaidRef.current.querySelectorAll('.mermaid-diagram');
      mermaidElements.forEach((element, index) => {
        if (!element.getAttribute('data-processed')) {
          const graphDefinition = element.textContent || '';
          const elementId = `mermaid-${Date.now()}-${index}`;
          
          try {
            mermaid.render(elementId, graphDefinition).then(({ svg }) => {
              element.innerHTML = svg;
              element.setAttribute('data-processed', 'true');
            }).catch((error) => {
              console.error('Mermaid render error:', error);
              element.innerHTML = `<pre class="text-red-500 text-xs p-2 bg-red-50 border border-red-200 rounded">Mermaid diagram error: ${error.message}</pre>`;
            });
          } catch (error) {
            console.error('Mermaid render error:', error);
            element.innerHTML = `<pre class="text-red-500 text-xs p-2 bg-red-50 border border-red-200 rounded">Mermaid diagram error</pre>`;
          }
        }
      });
    }
  }, [content]);

  const copyToClipboard = useCallback(async (text: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlocks(prev => new Set(prev).add(blockId));
      setTimeout(() => setCopiedBlocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(blockId);
        return newSet;
      }), 2000);
      toast({
        title: "Copied",
        description: "Code copied successfully"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy",
        variant: "destructive"
      });
    }
  }, []);

  // Custom Mermaid code block component
  const MermaidDiagram: React.FC<{ value: string }> = ({ value }) => (
    <div className="my-6 p-4 bg-muted/30 rounded-lg border border-border/20">
      <div 
        className="mermaid-diagram text-center"
        style={{ backgroundColor: 'transparent' }}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div 
      ref={mermaidRef}
      className={`prose prose-sm max-w-none ${
        isUser 
          ? 'prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white prose-code:text-white prose-pre:bg-white/10 prose-pre:text-white' 
          : theme === 'dark' 
            ? 'dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-a:text-primary prose-blockquote:text-foreground' 
            : 'prose-gray prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-blockquote:text-foreground'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
        rehypePlugins={[
          [rehypeKatex, {
            strict: false,
            throwOnError: false,
            macros: {
              "\\R": "\\mathbb{R}",
              "\\N": "\\mathbb{N}",
              "\\Z": "\\mathbb{Z}",
              "\\Q": "\\mathbb{Q}",
              "\\C": "\\mathbb{C}",
              "\\sum": "\\displaystyle\\sum",
              "\\prod": "\\displaystyle\\prod",
              "\\int": "\\displaystyle\\int"
            }
          }]
        ]}
        components={{
          // Custom code block renderer with syntax highlighting
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');
            const blockId = `code-${Math.random().toString(36).substr(2, 9)}`;
            const inline = props.inline;
            
            if (!inline && language) {
              // Handle Mermaid diagrams
              if (language === 'mermaid') {
                return <MermaidDiagram value={codeContent} />;
              }

              // Handle other diagrams and charts
              if (['graph', 'flowchart', 'sequence', 'gantt', 'pie', 'gitgraph'].includes(language)) {
                return <MermaidDiagram value={codeContent} />;
              }

              // Full code block with syntax highlighting
              return (
                <div className="relative group my-6">
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-2 border-b rounded-t-lg">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {language}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(codeContent, blockId)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/60"
                    >
                      {copiedBlocks.has(blockId) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="border-x border-b rounded-b-lg overflow-hidden">
                    <SyntaxHighlighter
                      style={theme === 'dark' ? oneDark : oneLight}
                      language={language}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        border: 'none',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        padding: '16px'
                      } as any}
                      codeTagProps={{
                        style: {
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }
                      }}
                    >
                      {codeContent}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }

            return (
              <code 
                className={`px-2 py-1 rounded-md text-sm font-mono border ${
                  isUser 
                    ? 'bg-white/10 text-white border-white/20' 
                    : 'bg-muted/50 text-foreground border-border'
                }`} 
                {...props}
              >
                {children}
              </code>
            );
          },

          // Custom table renderer
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-border">
              <table className="min-w-full border-collapse">
                {children}
              </table>
            </div>
          ),

          // Custom table header renderer
          thead: ({ children }) => (
            <thead className="bg-muted/60">
              {children}
            </thead>
          ),

          // Custom table cell renderer
          th: ({ children }) => (
            <th className="border-b border-border px-4 py-3 text-left font-semibold text-sm">
              {children}
            </th>
          ),

          // Custom table data cell renderer
          td: ({ children }) => (
            <td className="border-b border-border/40 px-4 py-3 text-sm">
              {children}
            </td>
          ),

          // Custom blockquote renderer
          blockquote: ({ children }) => (
            <blockquote className={`border-l-4 pl-6 py-4 my-6 rounded-r-lg italic ${
              isUser 
                ? 'border-white/30 bg-white/10 text-white/90' 
                : 'border-primary/30 bg-muted/20 text-foreground'
            }`}>
              {children}
            </blockquote>
          ),

          // Custom heading renderers with proper styling
          h1: ({ children }) => (
            <h1 className={`text-3xl font-bold my-6 pb-2 border-b ${
              isUser 
                ? 'text-white border-white/20' 
                : 'text-foreground border-border'
            }`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-2xl font-bold my-5 ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-xl font-bold my-4 ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={`text-lg font-semibold my-3 ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className={`text-base font-semibold my-3 ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className={`text-sm font-semibold my-2 ${
              isUser ? 'text-white/80' : 'text-muted-foreground'
            }`}>
              {children}
            </h6>
          ),

          // Custom paragraph renderer
          p: ({ children }) => (
            <p className={`my-4 leading-relaxed ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </p>
          ),

          // Custom list renderers
          ul: ({ children }) => (
            <ul className={`list-disc ml-6 my-4 space-y-2 ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal ml-6 my-4 space-y-2 ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className={`leading-relaxed ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </li>
          ),

          // Custom link renderer
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`underline hover:no-underline transition-colors ${
                isUser 
                  ? 'text-white hover:text-white/80' 
                  : 'text-primary hover:text-primary/80'
              }`}
            >
              {children}
            </a>
          ),

          // Custom horizontal rule
          hr: () => (
            <hr className="my-6 border-border" />
          ),

          // Custom image renderer
          img: ({ src, alt }) => (
            <img 
              src={src} 
              alt={alt} 
              className="max-w-full h-auto rounded-lg border border-border my-4"
            />
          ),

          // Enhanced math display components
          div: ({ className, children, ...props }: any) => {
            if (className?.includes('math display')) {
              const mathBlockId = `math-display-${Math.random().toString(36).substr(2, 9)}`;
              return (
                <div className="my-8 group">
                  <div className={`relative max-w-full overflow-x-auto rounded-xl border-2 transition-all duration-300 ${
                    isUser 
                      ? 'bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10' 
                      : 'bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10'
                  }`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
                      <div className="flex items-center gap-3">
                         <div className={`p-1.5 rounded-lg ${
                           isUser 
                             ? 'bg-white/10 text-white' 
                             : 'bg-primary/10 text-primary'
                         }`}>
                           <Copy className="h-4 w-4" />
                         </div>
                        <div>
                          <span className="text-sm font-semibold text-foreground">Mathematical Expression</span>
                          <div className="text-xs text-muted-foreground">LaTeX rendered equation</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Extract LaTeX source from the katex annotation
                          const katexElement = props.children?.props?.children;
                          const mathText = katexElement?.props?.children || 'Mathematical expression';
                          copyToClipboard(mathText, mathBlockId);
                        }}
                        className={`h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-all ${
                          isUser 
                            ? 'hover:bg-white/20 text-white' 
                            : 'hover:bg-primary/10 text-foreground'
                        }`}
                      >
                        {copiedBlocks.has(mathBlockId) ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="p-6 text-center">
                      <div 
                        className={`${className} text-lg leading-relaxed`} 
                        style={{ 
                          fontSize: '1.1em',
                          lineHeight: '1.6'
                        }}
                        {...props}
                      >
                        {children}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return <div className={className} {...props}>{children}</div>;
          },

          // Enhanced inline math styling
          span: ({ className, children, ...props }: any) => {
            if (className?.includes('math inline')) {
              return (
                <span 
                  className={`${className} inline-flex items-center px-2 py-1 rounded-md mx-0.5 border transition-all duration-200 hover:scale-105 ${
                    isUser 
                      ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' 
                      : 'bg-gradient-to-r from-primary/10 to-accent/10 text-foreground border-primary/20 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10'
                  }`} 
                  style={{ 
                    fontSize: '0.95em',
                    fontFamily: 'KaTeX_Main, "Times New Roman", serif',
                    verticalAlign: 'baseline'
                  }}
                  title="Mathematical expression (click to copy)"
                  onClick={(e) => {
                    e.preventDefault();
                    const mathText = props.children?.props?.children || children;
                    const inlineMathId = `inline-math-${Math.random().toString(36).substr(2, 9)}`;
                    copyToClipboard(String(mathText), inlineMathId);
                  }}
                  {...props}
                >
                  {children}
                </span>
              );
            }
            return <span className={className} {...props}>{children}</span>;
          },

          // Enhanced task list support
          input: ({ type, checked, ...props }: any) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2 rounded border-border"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },

          // Enhanced emphasis and strong styling
          em: ({ children }) => (
            <em className={`font-medium px-1 rounded ${
              isUser 
                ? 'text-white/90 bg-white/10' 
                : 'text-foreground bg-accent/10'
            }`}>
              {children}
            </em>
          ),

          strong: ({ children }) => (
            <strong className={`font-bold ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </strong>
          ),

          // Enhanced definition list support
          dl: ({ children }) => (
            <dl className="my-4 space-y-2">
              {children}
            </dl>
          ),

          dt: ({ children }) => (
            <dt className={`font-semibold mb-1 ${
              isUser ? 'text-white' : 'text-foreground'
            }`}>
              {children}
            </dt>
          ),

          dd: ({ children }) => (
            <dd className={`ml-4 mb-2 pl-4 border-l-2 ${
              isUser 
                ? 'text-white/80 border-white/30' 
                : 'text-muted-foreground border-accent/30'
            }`}>
              {children}
            </dd>
          ),

          // Enhanced footnote support
          sup: ({ children }) => (
            <sup className="text-xs text-primary hover:text-primary/80 cursor-pointer">
              {children}
            </sup>
          ),

          sub: ({ children }) => (
            <sub className="text-xs text-muted-foreground">
              {children}
            </sub>
          ),

          // Enhanced abbreviation support
          abbr: ({ title, children }) => (
            <abbr 
              title={title}
              className="border-b border-dotted border-muted-foreground cursor-help"
            >
              {children}
            </abbr>
          ),

          // Enhanced support for diverse characters and symbols
          span: ({ children, className }) => {
            const content = String(children);
            // Check if it's a mathematical symbol or special character
            if (/[∀∃∅∈∉⊂⊃⊆⊇∪∩∧∨¬→↔≡≠≤≥±∞∫∂∇∑∏αβγδεζηθικλμνξοπρστυφχψω]/.test(content)) {
              return (
                <span className={`font-semibold text-lg leading-none ${className || ''}`}>
                  {children}
                </span>
              );
            }
            return <span className={className}>{children}</span>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});