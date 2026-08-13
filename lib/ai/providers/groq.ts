import { AIProvider, GenerateRequest, ProviderError } from "../types"
import { generateReplyPrompt } from "../prompts"

export const groqProvider: AIProvider = {
  id: 'groq',
  name: 'Groq',

  async generateReplies(req: GenerateRequest): Promise<string[]> {
    const prompt = generateReplyPrompt(req.postText, req.tone, req.customInstruction, req.numReplies)

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${req.apiKey}`
        },
        body: JSON.stringify({
          model: req.model,
          messages: [
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        })
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError("Invalid Groq API key.", "INVALID_API_KEY")
        }
        if (response.status === 429) {
          throw new ProviderError("Groq Rate limit exceeded.", "RATE_LIMITED")
        }
        if (response.status === 503) {
          throw new ProviderError("Groq Service Unavailable.", "SERVICE_UNAVAILABLE")
        }
        const errorText = await response.text()
        throw new ProviderError(errorText || `Groq API Error: ${response.status}`, "PROVIDER_ERROR")
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content

      if (!text) throw new ProviderError("Empty response from Groq", "PROVIDER_ERROR")

      let parsed: any
      try {
        parsed = JSON.parse(text)
      } catch (e) {
        throw new ProviderError("Malformed JSON response from Groq", "PROVIDER_ERROR")
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
      
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new ProviderError("Network error connecting to Groq.", "NETWORK_ERROR")
      }
      
      throw new ProviderError(error.message || "An unexpected error occurred with Groq.", "UNKNOWN_ERROR")
    }
  },

  async testConnection(apiKey: string, model: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5
        })
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError("Invalid Groq API key.", "INVALID_API_KEY")
        }
        if (response.status === 429) {
          throw new ProviderError("Groq Rate limit exceeded.", "RATE_LIMITED")
        }
        throw new ProviderError(`Connection test failed for Groq. Status: ${response.status}`, "PROVIDER_ERROR")
      }
      
      return true
    } catch (error: any) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError("Connection test failed for Groq.", "NETWORK_ERROR")
    }
  }
}
