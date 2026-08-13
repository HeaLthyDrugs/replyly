export type ProviderId = 'gemini' | 'groq' | 'openrouter'

export interface ProviderConfig {
  apiKey: string
  model: string
  enabled: boolean
}

export interface AIConfig {
  providers: {
    gemini?: ProviderConfig
    groq?: ProviderConfig
    openrouter?: ProviderConfig
  }
  activeProvider: ProviderId | null
}

export interface GenerateRequest {
  postText: string
  tone: string
  customInstruction: string
  numReplies: number
  model: string
  apiKey: string
}

export interface AIProvider {
  id: ProviderId
  name: string
  generateReplies: (req: GenerateRequest) => Promise<string[]>
  testConnection: (apiKey: string, model: string) => Promise<boolean>
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProviderError"
  }
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("Missing API key. Please check your Replyly Settings.")
    this.name = "MissingApiKeyError"
  }
}
