export type ProviderId = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'deepseek' 
  | 'meta' 
  | 'xai' 
  | 'groq' 
  | 'openrouter' 
  | 'mistral' 
  | 'nvidia' 
  | 'together' 
  | 'perplexity'

export type ErrorType = 
  | "INVALID_API_KEY" | "RATE_LIMITED" | "QUOTA_EXCEEDED" | "NETWORK_ERROR"
  | "SERVICE_UNAVAILABLE" | "MODEL_UNAVAILABLE" | "BAD_REQUEST"
  | "CONTENT_POLICY" | "PROVIDER_ERROR" | "UNKNOWN_ERROR"

export interface AIAccount {
  id: string
  name: string
  apiKey: string
  model?: string
  enabled: boolean
  status: "unknown" | "healthy" | "rate_limited" | "invalid"
  lastUsedAt: number | null
  lastErrorAt: number | null
  cooldownUntil: number | null
}

export interface ProviderConfig {
  accounts: AIAccount[]
}

export interface AIConfig {
  providers: Partial<Record<ProviderId, ProviderConfig>>
  activeProvider: ProviderId | null
  fallbackEnabled: boolean
  fallbackProviders: ProviderId[]
}

export interface GenerateRequest {
  postText: string
  tone: string
  customInstruction: string
  numReplies: number
  model: string
  apiKey: string
  grokContext?: string
  platform?: "x" | "linkedin"
}

export interface GenerationResult {
  replies: string[]
  provider: ProviderId
  providerName?: string
  accountId: string
  accountName?: string
  maskedKey?: string
  model?: string
  tokensUsed?: number
  latencyMs?: number
  usedFallback: boolean
}

export interface AIProvider {
  id: ProviderId
  name: string
  generateReplies: (req: GenerateRequest) => Promise<string[]>
  testConnection: (apiKey: string, model: string) => Promise<boolean>
}

export class ProviderError extends Error {
  type: ErrorType

  constructor(message: string, type: ErrorType = "UNKNOWN_ERROR") {
    super(message)
    this.name = "ProviderError"
    this.type = type
  }
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("Missing API key. Please check your Replyly Settings.")
    this.name = "MissingApiKeyError"
  }
}
