import { GoogleGenAI, Type } from "@google/genai";

export async function predictUserMove(history: string[]): Promise<string> {
  // Fallback to random if not enough history
  if (history.length < 3) {
    const choices = ['stone', 'paper', 'scissors'];
    return choices[Math.floor(Math.random() * choices.length)];
  }

  try {
    // Initialize inside the function to avoid top-level crashes if API key is missing
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      console.warn("Gemini API key is missing or placeholder. Falling back to random.");
      const choices = ['stone', 'paper', 'scissors'];
      return choices[Math.floor(Math.random() * choices.length)];
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following history of a user's choices in Stone Paper Scissors: [${history.join(', ')}], predict their next move. Return only the word 'stone', 'paper', or 'scissors'.`,
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
    return result.prediction || 'stone';
  } catch (error) {
    console.error("Gemini Prediction Error:", error);
    const choices = ['stone', 'paper', 'scissors'];
    return choices[Math.floor(Math.random() * choices.length)];
  }
}
