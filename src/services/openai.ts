import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ContentRequest {
  topic: string;
  platform: 'twitter' | 'instagram' | 'linkedin' | 'facebook';
  tone: 'professional' | 'casual' | 'funny' | 'inspirational';
  length: 'short' | 'medium' | 'long';
  hashtags?: boolean;
  emojis?: boolean;
}

export interface GeneratedContent {
  content: string;
  hashtags: string[];
  variations: string[];
  engagement_score: number;
  platform_optimized: boolean;
}

export class ContentGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    const prompt = this.buildPrompt(request);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media content creator. Generate engaging, platform-optimized content that drives engagement and follows best practices for each platform.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No content generated');
      }

      return this.parseResponse(response, request);
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Failed to generate content');
    }
  }

  private buildPrompt(request: ContentRequest): string {
    const platformGuidelines = {
      twitter: 'Twitter: 280 characters max, use hashtags, be concise and engaging',
      instagram: 'Instagram: Visual focus, use relevant hashtags, engaging captions',
      linkedin: 'LinkedIn: Professional tone, industry insights, thought leadership',
      facebook: 'Facebook: Longer form content, community engagement, storytelling'
    };

    const toneGuidelines = {
      professional: 'Professional and authoritative tone',
      casual: 'Casual and friendly tone',
      funny: 'Humorous and entertaining tone',
      inspirational: 'Motivational and uplifting tone'
    };

    return `
Create social media content for ${request.platform} about "${request.topic}".

Platform Guidelines: ${platformGuidelines[request.platform]}
Tone: ${toneGuidelines[request.tone]}
Length: ${request.length}
Include hashtags: ${request.hashtags ? 'Yes' : 'No'}
Include emojis: ${request.emojis ? 'Yes' : 'No'}

Generate:
1. Main content (platform-optimized)
2. 5-10 relevant hashtags
3. 2 alternative variations
4. Engagement score (1-10)
5. Platform optimization notes

Format as JSON:
{
  "content": "main content here",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "variations": ["variation1", "variation2"],
  "engagement_score": 8,
  "platform_optimized": true
}
    `.trim();
  }

  private parseResponse(response: string, request: ContentRequest): GeneratedContent {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          content: parsed.content || response,
          hashtags: parsed.hashtags || [],
          variations: parsed.variations || [],
          engagement_score: parsed.engagement_score || 5,
          platform_optimized: parsed.platform_optimized || false
        };
      }
    } catch (error) {
      console.warn('Failed to parse JSON response, using fallback');
    }

    // Fallback parsing
    return {
      content: response,
      hashtags: this.extractHashtags(response),
      variations: [],
      engagement_score: 5,
      platform_optimized: false
    };
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#\w+/g;
    return text.match(hashtagRegex) || [];
  }

  async generateVariations(originalContent: string, count: number = 3): Promise<string[]> {
    const prompt = `
Generate ${count} variations of this social media content while maintaining the same message and tone:

"${originalContent}"

Each variation should:
- Keep the core message
- Use different wording
- Maintain the same tone
- Be platform-appropriate

Return as a JSON array of strings.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) return [];

      try {
        return JSON.parse(response);
      } catch {
        // Fallback: split by lines and clean up
        return response.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, count);
      }
    } catch (error) {
      console.error('Error generating variations:', error);
      return [];
    }
  }

  async analyzeContent(content: string): Promise<{
    engagement_score: number;
    readability_score: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    suggestions: string[];
  }> {
    const prompt = `
Analyze this social media content and provide insights:

"${content}"

Provide:
1. Engagement score (1-10)
2. Readability score (1-10)
3. Sentiment (positive/neutral/negative)
4. Improvement suggestions

Format as JSON:
{
  "engagement_score": 8,
  "readability_score": 7,
  "sentiment": "positive",
  "suggestions": ["suggestion1", "suggestion2"]
}
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        return {
          engagement_score: 5,
          readability_score: 5,
          sentiment: 'neutral',
          suggestions: []
        };
      }

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.warn('Failed to parse analysis JSON');
      }

      return {
        engagement_score: 5,
        readability_score: 5,
        sentiment: 'neutral',
        suggestions: []
      };
    } catch (error) {
      console.error('Error analyzing content:', error);
      return {
        engagement_score: 5,
        readability_score: 5,
        sentiment: 'neutral',
        suggestions: []
      };
    }
  }
}

export const contentGenerator = new ContentGenerator();
