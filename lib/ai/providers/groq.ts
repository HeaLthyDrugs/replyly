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
        const errorText = await response.text()
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError("Invalid Groq API key. Please check your Replyly Settings.")
        }
        if (response.status === 429) {
          throw new ProviderError("Groq Rate limit exceeded. Please wait a moment and try again.")
        }
        throw new Error(errorText || `Groq API Error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content

      if (!text) throw new ProviderError("Empty response from Groq")

      let parsed: any
      try {
        parsed = JSON.parse(text)
      } catch (e) {
        throw new ProviderError("Malformed JSON response from Groq")
      }

      if (!parsed || !Array.isArray(parsed.replies)) {
        throw new ProviderError("Invalid response format: 'replies' array missing")
      }

      const replies = parsed.replies
        .filter((r: any) => typeof r === "string" && r.trim().length > 0)
        .map((r: string) => r.trim())

      if (replies.length !== req.numReplies) {
        throw new ProviderError(`Expected exactly ${req.numReplies} replies, but got ${replies.length}`)
      }

      return replies
    } catch (error: any) {
      if (error instanceof ProviderError) throw error
      
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new ProviderError("Network error connecting to Groq. Please check your connection.")
      }
      
      throw new ProviderError(error.message || "An unexpected error occurred with Groq.")
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
          throw new ProviderError("Invalid Groq API key.")
        }
        throw new ProviderError("Connection test failed for Groq.")
      }
      
      return true
    } catch (error: any) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError("Connection test failed for Groq.")
    }
  }
}
