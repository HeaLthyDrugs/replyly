import { GoogleGenAI } from "@google/genai"
import { ProviderError } from "../types"
import type { AIProvider, GenerateRequest } from "../types"
import { generateReplyPrompt } from "../prompts"

export const geminiProvider: AIProvider = {
  id: 'gemini',
  name: 'Google Gemini',

  async generateReplies(req: GenerateRequest): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: req.apiKey })
    const prompt = generateReplyPrompt(req.postText, req.tone, req.customInstruction, req.numReplies, req.grokContext)

    try {
      const response = await ai.models.generateContent({
        model: req.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      })

      const text = response.text
      if (!text) throw new ProviderError("Empty response from Gemini", "PROVIDER_ERROR")

      let parsed: any
      try {
        parsed = JSON.parse(text)
      } catch (e) {
        throw new ProviderError("Malformed JSON response from Gemini", "PROVIDER_ERROR")
      }

      if (!parsed || !Array.isArray(parsed.replies)) {
        throw new ProviderError("Invalid response format: 'replies' array missing", "PROVIDER_ERROR")
      }

      const replies = parsed.replies
        .filter((r: any) => typeof r === "string" && r.trim().length > 0)
        .map((r: string) => r.trim())

      if (replies.length !== req.numReplies) {
        throw new ProviderError(`Expected exactly ${req.numReplies} replies, but got ${replies.length}`, "PROVIDER_ERROR")
      }

      return replies
    } catch (error: any) {
      if (error instanceof ProviderError) throw error
      
      const errMsg = error.message || ""
      const errStatus = error.status || 0
      
      if (errStatus === 401 || errStatus === 403 || errMsg.includes("API key not valid")) {
        throw new ProviderError("Invalid Gemini API key.", "INVALID_API_KEY")
      }
      if (errStatus === 429 || errMsg.includes("429")) {
        // We'll map 429 to RATE_LIMITED
        throw new ProviderError("Gemini Rate limit exceeded.", "RATE_LIMITED")
      }
      if (errStatus === 503 || errMsg.includes("503")) {
        throw new ProviderError("Gemini Service Unavailable.", "SERVICE_UNAVAILABLE")
      }
      if (error.name === "TypeError" && errMsg.includes("fetch")) {
        throw new ProviderError("Network error connecting to Gemini.", "NETWORK_ERROR")
      }
      
      throw new ProviderError(errMsg || "An unexpected error occurred with Gemini.", "UNKNOWN_ERROR")
    }
  },

  async testConnection(apiKey: string, model: string): Promise<boolean> {
    const ai = new GoogleGenAI({ apiKey })
    try {
      await ai.models.generateContent({
        model,
        contents: "Hello",
      })
      return true
    } catch (error: any) {
      const errStatus = error.status || 0
      if (errStatus === 401 || errStatus === 403 || (error.message || "").includes("API key not valid")) {
        throw new ProviderError("Invalid Gemini API key.", "INVALID_API_KEY")
      }
      if (errStatus === 429) {
        throw new ProviderError("Gemini Rate limit exceeded.", "RATE_LIMITED")
      }
      throw new ProviderError("Connection test failed for Gemini.", "UNKNOWN_ERROR")
    }
  }
}
