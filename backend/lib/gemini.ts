import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || 'placeholder-key';
export const ai = new GoogleGenAI({ apiKey });
