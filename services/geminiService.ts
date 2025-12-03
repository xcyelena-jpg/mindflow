import { GoogleGenAI, Type } from "@google/genai";
import { Task, JournalEntry, DailyAnalysis } from "../types";

// Fix: Per Gemini API guidelines, initialize the client assuming API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const analyzeDailyContent = async (
  tasks: Task[],
  journalContent: string
): Promise<DailyAnalysis> => {
  const completedTasks = tasks.filter(t => t.completed).map(t => t.text).join(", ");
  const pendingTasks = tasks.filter(t => !t.completed).map(t => t.text).join(", ");

  const prompt = `
    Analyze my day based on my to-do list and diary entry.
    
    Completed Tasks: ${completedTasks || "None"}
    Pending Tasks: ${pendingTasks || "None"}
    Diary Entry: ${journalContent || "No entry provided"}
    
    Provide a JSON response with:
    1. A short summary of the day (max 50 words).
    2. A productivity/mood balance score (0-100).
    3. One actionable piece of advice for tomorrow.
    4. A one-word description of the mood trend.
    Language: Chinese (Simplified).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            score: { type: Type.INTEGER },
            advice: { type: Type.STRING },
            moodTrend: { type: Type.STRING },
          },
          required: ["summary", "score", "advice", "moodTrend"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as DailyAnalysis;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const breakDownTask = async (taskText: string): Promise<string[]> => {
  const prompt = `
    Break down the following complex task into 3-5 smaller, actionable sub-tasks.
    Task: "${taskText}"
    Return ONLY a JSON array of strings. Language: Chinese (Simplified).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini Breakdown Error:", error);
    return [];
  }
};
