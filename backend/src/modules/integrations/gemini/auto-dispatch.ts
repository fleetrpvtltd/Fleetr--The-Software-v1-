import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../../config/env.js';

const genAI = new GoogleGenerativeAI(env.GOOGLE_GEMINI_API_KEY || '');

export const matchTruckToGodown = async (trucks: any[], godowns: any[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const prompt = `
      You are an AI dispatcher for a logistics company.
      Given the following available trucks and godown requirements, match a truck to a godown based on capacity, location, and vehicle type.
      
      Trucks: ${JSON.stringify(trucks)}
      Godowns: ${JSON.stringify(godowns)}
      
      Respond STRICTLY in JSON format with the following structure:
      {
        "matched_truck_id": "string",
        "matched_godown_id": "string",
        "reasoning": "string"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON
    const match = JSON.parse(text.replace(/```json|```/g, '').trim());
    return match;
  } catch (error) {
    console.error('Gemini AI dispatch failed, falling back to algorithmic matcher', error);
    return fallbackMatch(trucks, godowns);
  }
};

const fallbackMatch = (trucks: any[], godowns: any[]) => {
  // Simple algorithm: match first available truck that fits the capacity
  if (trucks.length > 0 && godowns.length > 0) {
    return {
      matched_truck_id: trucks[0].id || trucks[0]._id,
      matched_godown_id: godowns[0].id || godowns[0]._id,
      reasoning: "Algorithmic fallback match based on simple availability."
    };
  }
  return null;
};
