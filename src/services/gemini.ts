import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async summarizeTask(description: string): Promise<string> {
    try {
      const prompt = `Please provide a concise 1-2 sentence summary of the following task description:\n\n${description}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text().trim();

      return summary;
    } catch (error) {
      console.error('Error summarizing task with Gemini:', error);
      throw new Error('Failed to generate task summary');
    }
  }

  async generateTasksFromPrompt(prompt: string): Promise<Array<{title: string, description: string}>> {
    try {
      const fullPrompt = `Based on the following high-level prompt, generate a structured list of specific, actionable tasks. Return the response as a JSON array of objects, where each object has "title" and "description" properties. Keep titles concise and descriptions clear and actionable.

Prompt: ${prompt}

Example format:
[
  {"title": "Task 1 Title", "description": "Detailed description of what this task involves"},
  {"title": "Task 2 Title", "description": "Detailed description of what this task involves"}
]`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text().trim();

      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini API');
      }

      const tasks = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!Array.isArray(tasks)) {
        throw new Error('Response is not an array');
      }

      for (const task of tasks) {
        if (!task.title || !task.description) {
          throw new Error('Task missing required fields');
        }
      }

      return tasks;
    } catch (error) {
      console.error('Error generating tasks with Gemini:', error);
      throw new Error('Failed to generate tasks from prompt');
    }
  }
}

export default new GeminiService();