import { HumanizationRequest, HumanizationResponse } from '@/types/scribe';

export class HumanizationService {
  private static readonly API_BASE_URL = 'https://stealthgpt.ai/api/stealthify';
  private static readonly API_KEY = import.meta.env.VITE_STEALTH_GPT_API_KEY || '0fd3dbf789cfc16b03eb356be10e2bac6fa0c9608078e50516b10113e656c881';

  static async humanizeText(request: HumanizationRequest): Promise<HumanizationResponse> {
    try {
      console.log('Sending humanization request to StealthGPT...');
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(this.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-token': this.API_KEY,
        },
        body: JSON.stringify({
          prompt: request.prompt,
          rephrase: request.rephrase,
          tone: request.tone,
          mode: request.mode,
          business: request.business,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`StealthGPT API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.result) {
        return {
          result: data.result,
          success: true,
        };
      } else {
        throw new Error(data.message || 'Humanization failed');
      }
    } catch (error) {
      console.error('Humanization service error:', error);
      
      return {
        result: request.prompt, // Return original text as fallback
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static async analyzeText(text: string): Promise<{ aiDetected: boolean; confidence: number; suggestions: string[] }> {
    // This is a simplified analysis - in a real implementation, you might use additional APIs
    // or implement your own detection algorithms
    
    const aiIndicators = [
      /\b(furthermore|moreover|additionally|consequently|therefore)\b/gi,
      /\b(it is important to note|it should be noted|it is worth mentioning)\b/gi,
      /\b(in conclusion|to summarize|in summary)\b/gi,
      /\b(various|numerous|several|multiple)\b/gi,
    ];

    let indicatorCount = 0;
    const suggestions: string[] = [];

    aiIndicators.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        indicatorCount += matches.length;
        
        switch (index) {
          case 0:
            suggestions.push('Consider varying transition words for more natural flow');
            break;
          case 1:
            suggestions.push('Try using more conversational phrases instead of formal connectors');
            break;
          case 2:
            suggestions.push('Use more varied conclusion starters');
            break;
          case 3:
            suggestions.push('Replace vague quantifiers with specific numbers or examples');
            break;
        }
      }
    });

    // Simple confidence calculation based on indicators found
    const confidence = Math.min(indicatorCount / 10, 1) * 100;
    const aiDetected = confidence > 30;

    return {
      aiDetected,
      confidence,
      suggestions: [...new Set(suggestions)], // Remove duplicates
    };
  }
}