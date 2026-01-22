import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the client. 
// Note: In a production app, the key should be handled via a secure backend proxy or user input if strictly client-side.
// We assume process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-1.5-flash';

export const analyzeDocument = async (
  prompt: string,
  base64Data: string,
  mimeType: string
): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        // Thinking budget optional for flash, but good for complex analysis if we were using Pro
        // thinkingConfig: { thinkingBudget: 1024 }, 
        systemInstruction: "You are an expert AI PDF assistant. You help users summarize, extract data, and rewrite content from their documents. Be concise, professional, and accurate.",
      },
    });

    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze document.");
  }
};

export const chatWithDocument = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  base64Data: string,
  mimeType: string
): Promise<string> => {
  try {
    // We start a chat but we need to include the document context.
    // Since 'chats' in the new SDK maintain history, we need to pass the image/doc in the first message 
    // or as part of the current turn if it's a stateless call. 
    // To keep it simple and stateless for this demo (as history management in React can be complex with large Base64 strings),
    // we will use generateContent with the full context each time or rely on the text context.
    
    // However, for best performance with Gemini, let's use the stateless generateContent approach 
    // where we pass the document + the chat history + the new prompt.
    
    // Construct the prompt with history context
    const chatContext = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.parts[0].text}`).join('\n');
    
    const finalPrompt = `
    Previous conversation:
    ${chatContext}
    
    Current User Query: ${newMessage}
    
    Please answer the user's query based on the attached document context and the previous conversation.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
    });

    return response.text || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I encountered an error communicating with the AI service.";
  }
};

export const summarizeText = async (text: string): Promise<string> => {
   try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Summarize the following text concisely:\n\n${text}`,
    });
    return response.text || "Could not summarize.";
  } catch (error) {
    return "Error generating summary.";
  }
};

export const rewriteText = async (text: string, tone: 'professional' | 'casual' | 'academic'): Promise<string> => {
    try {
     const response = await ai.models.generateContent({
       model: MODEL_NAME,
       contents: `Rewrite the following text to have a ${tone} tone:\n\n${text}`,
     });
     return response.text || "Could not rewrite.";
   } catch (error) {
     return "Error rewriting text.";
   }
 };

export const validatePDFCompliance = async (
  base64Data: string,
  mimeType: string
): Promise<string> => {
  try {
    const prompt = `Analyze this PDF document for compliance with PDF/A ISO standards.
    Check for:
    1. Embedded fonts
    2. Color space usage (should be device-independent)
    3. Metadata validity
    4. Absence of prohibited elements (like Javascript, audio/video, encryption)

    Provide a detailed compliance report listing pass/fail for key criteria and an overall compliance status.
    Note: As an AI, perform a structural analysis based on the provided content.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "No report generated.";
  } catch (error: any) {
    console.error("Validation Error:", error);
    return "Failed to validate document. " + error.message;
  }
};