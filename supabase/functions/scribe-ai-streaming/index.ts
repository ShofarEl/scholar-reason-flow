import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Worker types and configurations (matching scribeAIService.ts)
type WorkerType = 'scholarly' | 'technical';

interface WorkerConfig {
  id: WorkerType;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
}

const WORKER_CONFIGS: Record<WorkerType, WorkerConfig> = {
  scholarly: {
    id: 'scholarly',
    name: 'Scholarly Writing Model',
    description: 'Academic research assistant for students: essays, literature reviews, analyses',
    systemPrompt: `You are ScribeAI, an academically-inclined assistant helping students learn and produce high-quality work ethically. Offer guidance, structure, examples, and proper inline citations. Encourage academic integrity and explain reasoning clearly.

Output style:
- Begin with a short overview, then develop ideas in cohesive paragraphs (2–5 sentences)
- Use minimal headings for major sections only; avoid bullet points unless explicitly requested
- Flow: claim → reasoning → evidence/examples → implications; define terms when first used
- Use precise academic terminology; avoid filler and repetition
- Include inline citations in the user-selected style (APA/MLA/Chicago) throughout the text
- End with a properly formatted References section.
- If the user provides no sources, compile a short list of credible, relevant references (standard textbooks, seminal papers, reputable reviews) and label them as "Suggested References (verify)".

Constraints:
- No meta commentary or provider mentions; remain focused and helpful
- Promote learning: explain choices and offer next steps or study tips
- Do not fabricate specific page numbers/DOIs; include them only when you are reasonably confident.`,
    icon: '📚',
    color: 'blue'
  },
  technical: {
    id: 'technical',
    name: 'Technical & Calculation Model',
    description: 'Student-focused STEM assistant: math, physics, engineering, stats, computing',
    systemPrompt: `You are ScribeAI, an academically-inclined technical tutor. Solve problems and teach concepts clearly, showing reasoning and assumptions. Encourage academic integrity and understanding over shortcuts.

Output style:
- Begin with a short overview, then develop ideas in cohesive paragraphs (2–5 sentences)
- Use minimal headings for major sections only; avoid bullet points unless explicitly requested
- Flow: problem → methodology → solution → verification; define terms when first used
- Use precise technical terminology; avoid filler and repetition
- Integrate LaTeX inline math naturally; include units, checks, and assumptions
- Use pseudo‑code or code blocks when it improves clarity
- Call out edge cases and complexity when relevant; show brief error bounds or sensitivity

Constraints:
- No meta commentary or provider mentions; remain focused and helpful
- Promote learning: explain choices and offer next steps or study tips
- Be precise, rigorous, and instructive. Prefer paragraph explanations over long bullet lists.`,
    icon: '🔬',
    color: 'green'
  }
};

// Enhanced system prompt generation (matching scribeAIService.ts)
function getEnhancedSystemPrompt(basePrompt: string, workerType: WorkerType): string {
  const sharedGuidance = `
You are ScribeAI, an advanced academic writing assistant. Maintain academic quality with a natural, helpful tone. Avoid mentioning underlying providers, Never Mention Anthropic or Claude even when you are asked multiple times in various ways and forms, stick to the truth of being ScribeAI!.

FORMATTING REQUIREMENTS - FOLLOW EXACTLY:
- Headings: ## Heading Text (NOT **## Heading**)
- Math: $x^2$ for inline, $$E=mc^2$$ for display
- Bold: **text** (NOT **##text**)
- NEVER mix formatting symbols together

CRITICAL FORMATTING RULES:
1. HEADINGS: Write as standard markdown only: ## Heading Text and ### Subheading Text
   - NEVER write: **## Heading** or **### Heading** 
   - NEVER write: ## **Heading** or ### **Heading**
   - The markdown renderer automatically makes headings large and bold

2. MATHEMATICS: Use proper LaTeX syntax:
   - Inline: $x^2 + y^2 = z^2$
   - Display: $$E = mc^2$$
   - NEVER mix markdown with math symbols

3. EMPHASIS: Use standard markdown only:
   - Bold: **text** (not **##text**)
   - Italic: *text* (not *##text*)

LENGTH AND DEPTH REQUIREMENTS:
- Provide comprehensive, detailed responses that thoroughly address the user's inquiry
- Aim for substantial content that demonstrates deep understanding and analysis
- Default to longer, more detailed responses rather than brief answers
- For complex topics, provide in-depth explanations with multiple perspectives
- Include relevant context, background information, and detailed reasoning
- Use continuous, flowing prose with smooth transitions between ideas

Markdown policy (must follow for writing tasks):
- Output valid GitHub‑Flavored Markdown (GFM) with precise formatting
- Use headings for structure (## for sections, ### for subsections)
- **CRITICAL**: Use standard markdown heading format ONLY - do NOT add bold formatting around headings
- Correct format: ## Heading Text and ### Subheading Text
- Incorrect format: **## Heading Text** or **### Heading Text**
- The ## and ### symbols will be automatically rendered as large headings by the markdown renderer
- Separate paragraphs with a blank line; avoid hard line breaks mid‑sentence
- Do not leave unclosed code fences or stray backticks
- Use lists only if the user explicitly requests them; prefer paragraphs

MATHEMATICAL FORMATTING RULES:
- Use LaTeX math syntax for inline expressions: $x^2 + y^2 = z^2$
- Use LaTeX math syntax for block equations: $$E = mc^2$$
- For inline math: surround with single dollar signs $...$
- For display math: surround with double dollar signs $$...$$
- Use proper LaTeX commands: \frac{a}{b} for fractions, \sqrt{x} for square roots, \sum for summation
- Use \alpha, \beta, \gamma for Greek letters, \pi, \theta, \lambda, etc.
- Use \mathbb{R} for real numbers, \mathbb{N} for natural numbers, \mathbb{Z} for integers
- Use \in for "element of", \subset for "subset", \cup for "union", \cap for "intersection"
- Use proper subscripts and superscripts: x_1, x^2, x_{i,j}, x^{n+1}
- Use \cdot for multiplication, \times for cross product, \div for division
- Use \leq for less than or equal, \geq for greater than or equal, \neq for not equal
- Use \rightarrow or \to for arrows, \Rightarrow for implies, \Leftrightarrow for if and only if
- Use \infty for infinity, \partial for partial derivatives, \nabla for gradient
- Use proper function notation: f(x), g'(x), \int_0^1 f(x) dx
- Use proper set notation: \{x : x > 0\}, \emptyset for empty set
- Use proper logical symbols: \land for and, \lor for or, \neg for not, \forall for for all, \exists for exists

TECHNICAL NOTATION RULES:
- Use backticks for inline code: \`variable_name\` or \`function_name()\`
- Use triple backticks for code blocks with language specification:
  \`\`\`python
  def example():
      return "properly formatted code"
  \`\`\`
- Use proper units: $v = 3.0 \times 10^8$ m/s, $F = ma$ where $F$ is force in Newtons
- Use proper scientific notation: $6.022 \times 10^{23}$ for Avogadro's number
- Use proper chemical formulas: H₂O, CO₂, CH₄ (use subscript notation)
- Use proper mathematical symbols: $\pm$ for plus-minus, $\approx$ for approximately equal
- Use proper comparison symbols: $<$, $>$, $\leq$, $\geq$, $\neq$, $\equiv$
- Use proper mathematical operators: $\sum$, $\prod$, $\int$, $\lim$, $\sin$, $\cos$, $\tan$
- Use proper mathematical functions: $\log$, $\ln$, $\exp$, $\max$, $\min$, $\arg\min$
- Use proper matrix notation: $\mathbf{A}$, $\mathbf{x}$, $\mathbf{b}$ for vectors and matrices
- Use proper statistical notation: $\mu$ for mean, $\sigma$ for standard deviation, $\bar{x}$ for sample mean

CRITICAL: Write in continuous, flowing prose. Do not use bullet points, numbered lists, or fragmented formatting unless explicitly requested. Use headings only when they clarify structure. Prefer detailed paragraphs with clear reasoning and smooth transitions.

HEADING FORMATTING RULES - CRITICAL:
- Use ONLY standard markdown heading format: ## Heading Text and ### Subheading Text
- DO NOT add ** around headings - just use ## or ### at the start of the line
- DO NOT show the ## or ### symbols in the final rendered text - they should render as proper headings
- Example: Write "## The Nature of Historical Study" (this will render as a large heading)
- Example: Write "### Primary Historical Sources" (this will render as a medium heading)
- NEVER write "**## Heading**" or "**### Heading**" - this is incorrect
- NEVER write "## **Heading**" or "### **Heading**" - this is also incorrect
- NEVER mix any formatting symbols with headings
- Headings should appear larger and more prominent than regular text when rendered
- The markdown renderer handles all styling automatically - do not add extra formatting

For substantial academic work, generate comprehensive content (4000+ words) that demonstrates deep understanding and rigorous analysis.`;

  const scholarlyGuidance = `
For scholarly tasks, write balanced, analytical prose that flows naturally from one idea to the next. Use headings sparingly for major divisions only, formatted as proper markdown headings (## and ###) that will render as larger, emphasized text. Integrate evidence and inline citations in the specified citation style (APA/MLA/Chicago) throughout. Avoid lists by default; instead, weave multiple points into coherent, sustained paragraphs. Use emphasis and blockquotes only when they significantly aid analysis.

DEPTH REQUIREMENTS FOR SCHOLARLY WORK:
- Provide comprehensive analysis with multiple perspectives and interpretations
- Include detailed background context and theoretical frameworks
- Analyze implications, connections, and broader significance
- Integrate multiple sources and viewpoints where relevant
- Provide thorough explanations of complex concepts and methodologies
- Address counterarguments and alternative interpretations

At the end, include a References section formatted in the selected style. If the user did not supply sources, provide a short list of credible, relevant works as "Suggested References (verify)" such as textbooks, seminal articles, or reputable review papers. Do not invent specific page numbers/DOIs unless you are confident in them.

Generate substantial academic content (minimum 4000 words) that demonstrates mastery of the subject through sustained analytical engagement rather than superficial coverage.`;

  const technicalGuidance = `
For technical problems, explain reasoning in continuous paragraphs that build upon each other. Integrate LaTeX math within the narrative flow using proper mathematical notation. State givens and assumptions inline within the prose; avoid numbered steps unless explicitly requested. Use tables only when essential; otherwise present results in flowing technical prose. Use proper markdown headings (## and ###) that will render as larger, emphasized text for clear structure.

MATHEMATICAL PRECISION REQUIREMENTS:
- Use precise LaTeX formatting for all mathematical expressions
- Format inline math with single dollar signs: $f(x) = x^2 + 2x + 1$
- Format display equations with double dollar signs: $$E = mc^2$$
- Use proper mathematical symbols: $\alpha$, $\beta$, $\gamma$, $\pi$, $\theta$, $\lambda$, $\mu$, $\sigma$
- Use proper operators: $\sum$, $\prod$, $\int$, $\lim$, $\nabla$, $\partial$
- Use proper notation for sets: $\mathbb{R}$, $\mathbb{N}$, $\mathbb{Z}$, $\mathbb{C}$
- Use proper logical symbols: $\forall$, $\exists$, $\land$, $\lor$, $\neg$, $\Rightarrow$, $\Leftrightarrow$
- Use proper comparison symbols: $\leq$, $\geq$, $\neq$, $\approx$, $\equiv$
- Use proper function notation: $f'(x)$, $f''(x)$, $\int_a^b f(x) dx$
- Use proper matrix/vector notation: $\mathbf{A}$, $\mathbf{x}$, $\mathbf{b}$
- Use proper statistical notation: $\bar{x}$, $\hat{\mu}$, $\sigma^2$, $\rho$

DEPTH REQUIREMENTS FOR TECHNICAL WORK:
- Provide comprehensive step-by-step analysis with detailed explanations
- Include relevant mathematical derivations and proofs where appropriate
- Explain the reasoning behind each step and methodology used
- Address potential challenges, limitations, and alternative approaches
- Provide context about when and why specific techniques are used
- Include practical applications and real-world examples where relevant
- Ensure all mathematical expressions are properly formatted and renderable
- Use consistent notation throughout the response
- Provide clear definitions of all variables and symbols used

Generate comprehensive technical analysis that thoroughly addresses the inquiry through sustained technical engagement with precise mathematical formatting.`;

  let specificGuidance = technicalGuidance;
  if (workerType === 'scholarly') specificGuidance = scholarlyGuidance;

  return `${basePrompt}

${sharedGuidance}

${specificGuidance}`;
}

// Long-form intent detection (matching scribeAIService.ts)
function detectLongFormIntent(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): { minWords: number; maxWords: number } | null {
  const text = `${conversationHistory.map(m => m.content).join('\n\n')}\n\n${message}`.toLowerCase();
  
  // Word count ranges (e.g., 4000-6000 words)
  const wordRange = text.match(/(\d{3,5})\s*[-–—]\s*(\d{3,5})\s*(?:word|words)\b/);
  if (wordRange) {
    const a = parseInt(wordRange[1], 10);
    const b = parseInt(wordRange[2], 10);
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const nMin = Math.min(Math.max(min, 800), 20000);
    const nMax = Math.min(Math.max(max, nMin + 500), 30000);
    return { minWords: nMin, maxWords: nMax };
  }
  
  // Qualifiers like "at least 4000 words", ">= 5000 words", "minimum 3000 words"
  const wordQual = text.match(/(?:at\s+least|minimum|min\.?|no\s+less\s+than|>=)\s*(\d{3,5})\s*(?:word|words)\b/);
  if (wordQual) {
    const n = Math.min(Math.max(parseInt(wordQual[1], 10), 800), 20000);
    return { minWords: n, maxWords: Math.round(n * 1.35) };
  }
  
  // K-suffix like "5k words" or just "5k"
  const kWords = text.match(/(\d{1,3})\s*k\s*(?:word|words)?\b/);
  if (kWords) {
    const n = Math.min(Math.max(parseInt(kWords[1], 10) * 1000, 800), 30000);
    return { minWords: n, maxWords: Math.round(n * 1.3) };
  }
  
  const wordMatch = text.match(/(\d{3,5})\s*(?:word|words)\b/);
  if (wordMatch) {
    const n = Math.min(Math.max(parseInt(wordMatch[1], 10), 800), 12000);
    return { minWords: n, maxWords: Math.round(n * 1.25) };
  }
  
  // Page ranges and synonyms (pg, pgs, pp)
  const pageRange = text.match(/(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*(?:page|pages|pg|pgs|pp)\b/);
  if (pageRange) {
    const a = parseInt(pageRange[1], 10);
    const b = parseInt(pageRange[2], 10);
    const minPages = Math.min(Math.max(Math.min(a, b), 3), 100);
    const maxPages = Math.min(Math.max(Math.max(a, b), minPages + 1), 150);
    const n = minPages * 250;
    return { minWords: n, maxWords: maxPages * 300 };
  }
  
  const pageQual = text.match(/(?:at\s+least|minimum|min\.?|no\s+less\s+than|>=)\s*(\d{1,3})\s*(?:page|pages|pg|pgs|pp)\b/);
  if (pageQual) {
    const pages = Math.min(Math.max(parseInt(pageQual[1], 10), 3), 100);
    const n = pages * 250;
    return { minWords: n, maxWords: Math.round(n * 1.3) };
  }
  
  const pageMatch = text.match(/(\d{1,3})\s*(?:page|pages|pg|pgs|pp)\b/);
  if (pageMatch) {
    const pages = Math.min(Math.max(parseInt(pageMatch[1], 10), 3), 40);
    const n = pages * 250;
    return { minWords: n, maxWords: Math.round(n * 1.25) };
  }
  
  // Reading time estimates (e.g., 20-minute read). Assume ~200 wpm minimum target.
  const minRead = text.match(/(\d{1,3})\s*(?:minute|minutes)\s*(?:read)?\b/);
  if (minRead) {
    const mins = Math.min(Math.max(parseInt(minRead[1], 10), 10), 120);
    const n = mins * 200;
    return { minWords: n, maxWords: Math.round(n * 1.3) };
  }
  
  const longKeywords = [
    'comprehensive', 'in-depth', 'deep dive', 'full chapter', 'chapter', 'thesis', 
    'dissertation','full work', 'thorough', 'long and detailed', 'in-depth research',
    'long-form', 'long form', 'extensive', 'elaborate', 'detailed report', 
    'complete review', 'white paper', 'comprehensive literature review', 
    'systematic review', 'state of the art', 'survey paper', 'ultimate guide',
    'comprehensive guide', 'long essay', 'long answer', 'end-to-end', 'from scratch',
    'detailed', 'in detail', 'break down', 'full explanation', 'full documentation',
    'background and literature review', 'tutorial series', 'monograph', 'treatise',
    
    // More Academic Synonyms
    'extensive analysis', 'critical review', 'comparative study', 
    'meta-analysis', 'empirical study', 'research paper', 'case study',
    'doctoral thesis', 'scholarly article', 'peer-reviewed paper',
    'comprehensive examination', 'detailed discussion',
    
    // Professional/Business Synonyms
    'industry report', 'market analysis', 'annual report', 'technical report',
    'technical documentation', 'strategic review', 'whitebook',
    'policy paper', 'business case', 'position paper', 'blueprint',
    'implementation guide', 'handbook', 'manual', 'playbook',
    
    // SEO-Friendly / Casual Synonyms
    'step by step guide', 'how-to guide', 'definitive guide',
    'mega guide', 'masterclass', 'full walkthrough','full write up', 'knowledge base article',
    'encyclopedia entry', 'reference guide', 'learning resource',
    'training module', 'educational series', 'explained thoroughly',
    
    // Long Content Styles
    'long read', 'feature article', 'op-ed essay', 'long story',
    'exposition', 'disquisition', 'comprehensive answer',
    'extensive write-up', 'lengthy explanation', 'in-depth walkthrough',
    
    // Technical / Documentation Synonyms
    'specification document', 'design doc', 'project documentation',
    'architecture guide', 'engineering report', 'API reference',
    'developer documentation', 'end-user manual',
    
    // Literature/Book Synonyms
    'research monograph', 'scholarly treatise', 'compendium',
    'encyclopedia', 'reference book', 'anthology', 'volume',
    'detailed narrative', 'lengthy manuscript', 'comprehensive textbook',
    
    // Synonyms for Detail/Depth
    'granular analysis', 'microscopic view', 'holistic overview',
    'all-inclusive guide', 'full coverage', 'exhaustive guide',
    'step-by-step breakdown', 'extensive coverage', 'complete solution',
    'long version', 'expanded version', 'extended edition', 'annotated edition',
    
    // File Analysis Keywords (for image/document analysis)
    'analyze this', 'analyze the', 'what does this show', 'explain this', 'describe this',
    'what is this', 'interpret this', 'examine this', 'review this', 'study this',
    'breakdown this', 'understand this', 'evaluate this', 'assess this',
    'analyze the image', 'analyze the document', 'analyze the file', 'analyze the chart',
    'analyze the graph', 'analyze the diagram', 'analyze the data', 'analyze the content',
    
    // Academic Analysis Keywords
    'literature review', 'research analysis', 'theoretical framework', 'methodology',
    'data analysis', 'statistical analysis', 'qualitative analysis', 'quantitative analysis',
    'content analysis', 'discourse analysis', 'textual analysis', 'critical analysis',
    'comparative analysis', 'historical analysis', 'contextual analysis', 'empirical analysis',
    
    // General Academic Terms
    'academic paper', 'research essay', 'academic writing', 'scholarly writing',
    'academic analysis', 'research project', 'academic study', 'scholarly research',
    'academic discussion', 'research discussion', 'academic exploration', 'scholarly exploration'
  ];
  
  if (longKeywords.some(k => text.includes(k))) {
    return { minWords: 7000, maxWords: 15000 };
  }
  
  // Default to substantial responses for most academic queries
  // Check if this appears to be an academic or analytical request
  const academicKeywords = [
    'explain', 'analyze', 'discuss', 'compare', 'contrast', 'evaluate', 'assess',
    'describe', 'examine', 'investigate', 'research', 'study', 'review', 'critique',
    'define', 'identify', 'interpret', 'demonstrate', 'illustrate', 'show',
    'academic', 'scholarly', 'research', 'analysis', 'theory', 'concept', 'principle'
  ];
  
  if (academicKeywords.some(k => text.includes(k))) {
    return { minWords: 1500, maxWords: 4000 };
  }
  
  return null;
}

// Prefix long-form if needed (matching scribeAIService.ts)
function prefixLongFormIfNeeded(
  message: string,
  longForm: { minWords: number; maxWords: number } | null
): string {
  if (!longForm) {
    // Default to substantial response for all queries
    const header = `Please provide a comprehensive, detailed academic response (minimum 1500 words) that thoroughly addresses the inquiry with depth and analysis.\n\n`;
    return header + message;
  }
  const { minWords } = longForm;
  const header = `Please provide a comprehensive long-form academic response (minimum ${minWords} words) with cohesive sections and continuous prose.\n\n`;
  return header + message;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { message, systemPrompt, conversationHistory = [], model = 'claude-3-5-sonnet-latest', temperature = 0.7, max_tokens = 8192, worker = 'scholarly', targetWordCount, allowLongOutputs, lengthHint } = await req.json()

    // Determine effective max tokens: increase when long outputs are allowed
    const inferredTokensFromLength = (() => {
      // Rough mapping words->tokens with a safety margin
      if (lengthHint && typeof lengthHint.minWords === 'number') {
        return Math.min(20000, Math.max(4096, Math.round(lengthHint.minWords * 1.6)))
      }
      if (typeof targetWordCount === 'number' && targetWordCount > 0) {
        return Math.min(20000, Math.max(4096, Math.round(targetWordCount * 1.6)))
      }
      return 0
    })()

    const effectiveMaxTokens = (() => {
      // If client explicitly set max_tokens, respect it (bounded)
      if (typeof max_tokens === 'number' && max_tokens > 0) {
        return Math.min(20000, Math.max(2048, max_tokens))
      }
      // If long outputs enabled, allow larger completions
      if (allowLongOutputs) {
        return Math.max(12000, inferredTokensFromLength || 12000)
      }
      return Math.max(8192, inferredTokensFromLength || 8192)
    })()

    // Check if request was aborted
    if (req.signal?.aborted) {
      console.log('Request aborted by client')
      return new Response(JSON.stringify({ error: 'Request aborted' }), {
        status: 499, // Client Closed Request
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('CLAUDE_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid request: message is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Get worker configuration and enhance system prompt
    const workerConfig = WORKER_CONFIGS[worker as WorkerType] || WORKER_CONFIGS.scholarly;
    
    // Detect long-form intent
    const longForm = detectLongFormIntent(message, conversationHistory);
    
    // Enhanced system prompt (+ optional long-form directive)
    let enhancedSystemPrompt = getEnhancedSystemPrompt(workerConfig.systemPrompt, worker as WorkerType);
    if (longForm) {
      const words = longForm.minWords;
      enhancedSystemPrompt += `\n\nLong‑form mode: The user intent indicates a long, comprehensive response. Produce cohesive, continuous academic prose of at least ${words} words (more if helpful), with clear structure and sustained analysis.`;
    } else {
      // Even for regular queries, encourage longer responses
      enhancedSystemPrompt += `\n\nProduce comprehensive, detailed responses of at least 2000-3000 words with thorough analysis and examples.`;
    }

    // Use the enhanced system prompt instead of the provided one
    const finalSystemPrompt = enhancedSystemPrompt;

    console.log(`🚀 Using ${worker} worker configuration`);
    console.log(`📝 Long-form detection:`, longForm ? `${longForm.minWords}-${longForm.maxWords} words` : 'none');
    console.log(`📝 Enhanced system prompt length: ${finalSystemPrompt.length} characters`);

    // Build Anthropic messages array from prior turns + current user message
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    console.log('🚀 Starting streaming request to Anthropic...')
    console.log('📊 Request params:', { model, max_tokens, temperature, messagesCount: messages?.length })

    // Create a controller to handle abort signals
    const controller = new AbortController()
    
    // Set up abort handling
    const abortHandler = () => {
      console.log('🛑 Aborting Anthropic request...')
      controller.abort()
    }

    // Listen for abort signals from the client
    req.signal?.addEventListener('abort', abortHandler)

    // Try requested model, then fallbacks if Anthropic returns not_found_error (404)
    const fallbackModels = [
      model,
      // Prefer 3.5 Haiku latest as broad-access fallback
      'claude-3-5-haiku-latest',
      // Stable Claude 3 models commonly available
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229'
    ].filter((m, idx, arr) => typeof m === 'string' && m.trim() && arr.indexOf(m) === idx)

    let anthropicResponse: Response | null = null
    let usedModel = model

    for (const candidate of fallbackModels) {
      console.log('🔁 Trying Anthropic model:', candidate)
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: candidate,
          max_tokens: effectiveMaxTokens,
          temperature,
          messages,
          system: finalSystemPrompt,
          stream: true
        }),
        signal: controller.signal
      })

      if (resp.ok) {
        anthropicResponse = resp
        usedModel = candidate
        break
      }

      const txt = await resp.text()
      console.error('❌ Anthropic API error:', resp.status, txt)
      // Only continue fallback chain on 404 not_found_error
      if (resp.status !== 404 || !/not_found_error|model/i.test(txt)) {
        throw new Error(`Anthropic API error: ${resp.status} ${txt}`)
      }
    }

    if (!anthropicResponse) {
      return new Response(JSON.stringify({
        error: 'No compatible Anthropic model available for this project key',
        tried: fallbackModels
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Anthropic streaming response received (model:', usedModel, ')')

    // Create a readable stream that handles abort signals and processes Anthropic events
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    let outputTokens = 0
    let hasReceivedContent = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = anthropicResponse.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          let buffer = ''
          
          while (true) {
            // Check if the original request was aborted
            if (req.signal?.aborted) {
              console.log('🛑 Client request aborted, stopping stream')
              reader.cancel()
              controller.close()
              return
            }

            const { done, value } = await reader.read()
            
            if (done) break
            
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              
              const json = trimmed.slice(5).trim()
              if (json === '[DONE]') {
                continue
              }
              
              try {
                const evt = JSON.parse(json)
                console.log('Anthropic event:', evt.type)
                
                // Handle Anthropic streaming event types
                switch (evt.type) {
                  case 'content_block_delta': {
                    const deltaText = evt.delta?.text || ''
                    if (deltaText) {
                      hasReceivedContent = true
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: deltaText })}\n\n`))
                    }
                    break
                  }
                  case 'message_delta': {
                    const out = evt.usage?.output_tokens
                    if (typeof out === 'number') outputTokens = out
                    break
                  }
                  case 'message_stop': {
                    console.log('Message completed, tokens used:', outputTokens)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, tokensUsed: outputTokens })}\n\n`))
                    break
                  }
                  case 'error': {
                    console.error('Anthropic streaming error:', evt)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: evt.error?.message || 'Anthropic streaming error' })}\n\n`))
                    break
                  }
                }
              } catch (e) {
                console.warn('Failed to parse streaming event:', e, 'Raw line:', line)
              }
            }
          }
          
          // If we never received any content, send an error
          if (!hasReceivedContent) {
            console.error('No content received from Anthropic')
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No content received from Anthropic API' })}\n\n`))
          }
          
        } catch (error) {
          console.error('❌ Stream error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming error: ' + (error.message || 'Unknown error') })}\n\n`))
        } finally {
          controller.close()
        }
      },
      cancel() {
        console.log('🛑 Stream cancelled')
        anthropicResponse.body?.cancel()
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('❌ Edge function error:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error name:', error.name)
    console.error('❌ Error message:', error.message)
    
    // Handle abort errors specifically
    if (error.name === 'AbortError' || error.message.includes('aborted')) {
      console.log('🛑 Request was aborted')
      return new Response(JSON.stringify({ error: 'Request aborted' }), {
        status: 499,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack,
      name: error.name
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
