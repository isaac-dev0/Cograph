import Anthropic from "@anthropic-ai/sdk";

export class ClaudeService {
  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY not found in environment");
    }
    this.client = new Anthropic({ apiKey: key });
  }

  /* Provide prompt and code and produce an analysis on the code structure. */
  async analyseCode(prompt: string, code: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5",
        max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS ?? "4096"),
        messages: [
          {
            role: "user",
            content: `${prompt}\n\n\`\`\`\n${code}\n\`\`\``,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        return content.text;
      }

      throw new Error("Unexpected response type");
    } catch (error) {
      throw new Error(
        `Claude API failed: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /* Use a Generic<T> to ensure the response is interpretable in any type. */
  async analyseCodeStructured<T>(
    prompt: string,
    code: string,
    schema: string
  ): Promise<T> {
    const markdownPrompt = `${prompt}\n\nYou must respond with valid JSON matching this schema:\n${schema}\n\nRespond ONLY with the JSON, wrapped in a markdown code block using \`\`\`json.`;

    const response = await this.analyseCode(markdownPrompt, code);

    try {
      let json = response.trim();

      if (json.includes("```json")) {
        const match = json.match(/```json\s*\n([\s\S]*?)\n```/);
        if (match) {
          json = match[1].trim();
        }
      } else if (json.includes("```")) {
        const match = json.match(/```\s*\n([\s\S]*?)\n```/);
        if (match) {
          json = match[1].trim();
        }
      }

      return JSON.parse(json) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
