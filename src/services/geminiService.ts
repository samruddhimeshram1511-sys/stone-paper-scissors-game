import { GoogleGenAI, Type } from "@google/genai";

// Define the Choice type to match App.tsx
type Choice = 'stone' | 'paper' | 'scissors';

/**
 * Predicts the user's next move based on their game history.
 * Uses Google's Gemini AI to analyze patterns and make a prediction.
 */
export async function predictUserMove(history: Choice[]): Promise<Choice> {
  // Fallback to random if not enough history to analyze
  if (history.length < 3) {
    const choices: Choice[] = ['stone', 'paper', 'scissors'];
    return choices[Math.floor(Math.random() * choices.length)];
  }

  try {
    // Initialize inside the function to avoid top-level crashes if API key is missing
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Gemini API key is missing. Falling back to random prediction.");
      const choices: Choice[] = ['stone', 'paper', 'scissors'];
      return choices[Math.floor(Math.random() * choices.length)];
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert at Stone-Paper-Scissors. Analyze this user's move history: [${history.join(', ')}]. Predict their very next move. Return your prediction in JSON format with a single key "prediction" containing either 'stone', 'paper', or 'scissors'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prediction: {
              type: Type.STRING,
              enum: ['stone', 'paper', 'scissors'],
              description: "The predicted next move of the user."
            }
          },
          required: ["prediction"]
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("Empty response from Gemini");
    }

    const result = JSON.parse(response.text);
    return (result.prediction as Choice) || 'stone';
  } catch (error) {
    console.error("Gemini Prediction Error:", error);
    // Fallback to random move on error
    const choices: Choice[] = ['stone', 'paper', 'scissors'];
    return choices[Math.floor(Math.random() * choices.length)];
  }
}
