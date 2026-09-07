import { GoogleGenAI } from "@google/genai";
import { recordAiCall } from "./aiMetrics.ts";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function generateContentWithRetry(params: any, retries = 2, delay = 1000): Promise<any> {
  const start = Date.now();
  for (let i = 0; i < retries; i++) {
    try {
      const result = await ai.models.generateContent(params);
      recordAiCall(Date.now() - start, false);
      return result;
    } catch (error: any) {
      const errorStr = String(error?.message || error || "");
      console.warn(`[Gemini Retry] Attempt ${i + 1} failed. Error:`, errorStr);
      const isTransient = error?.status === 503 || error?.status === 429 || errorStr.includes("503") || errorStr.includes("429") || errorStr.includes("demand") || errorStr.includes("temporary") || errorStr.includes("UNAVAILABLE");
      if (isTransient && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      } else {
        recordAiCall(Date.now() - start, true);
        throw error;
      }
    }
  }
}
