import { MissingApiKeyError, ProviderError } from "./types"
import type { AIConfig, ProviderId, AIAccount, GenerationResult } from "./types"
import { geminiProvider } from "./providers/gemini"
import { groqProvider } from "./providers/groq"
import { openrouterProvider } from "./providers/openrouter"

export const PROVIDERS = {
  gemini: geminiProvider,
  groq: groqProvider,
  openrouter: openrouterProvider
}

const OLD_STORAGE_KEY = "geminiApiKey"
const CONFIG_KEY = "aiConfig"

export const DEFAULT_CONFIG: AIConfig = {
  providers: {},
  activeProvider: null,
  fallbackEnabled: true,
  fallbackProviders: []
}

export const AIManager = {
  async getConfig(): Promise<AIConfig> {
    const result = await chrome.storage.local.get([CONFIG_KEY, OLD_STORAGE_KEY])
    let config = result[CONFIG_KEY] as AIConfig | undefined
    let needsSave = false

    if (!config) {
      config = { providers: {}, activeProvider: null, fallbackEnabled: true, fallbackProviders: [] }
      needsSave = true
    } else {
      // Ensure new properties exist on older configs
      if (typeof config.fallbackEnabled !== "boolean") {
        config.fallbackEnabled = true
        needsSave = true
      }
      if (!Array.isArray(config.fallbackProviders)) {
        config.fallbackProviders = []
        needsSave = true
      }
    }

    // Migrate from the V1 setup (geminiApiKey string) -> V2 (providers.gemini.apiKey string) -> V3 (providers.gemini.accounts array)
    if (result[OLD_STORAGE_KEY] && !config.providers.gemini) {
      config.providers.gemini = {
        accounts: [{
          id: crypto.randomUUID(),
          name: "Gemini 1",
          apiKey: result[OLD_STORAGE_KEY],
          model: "gemini-3.6-flash", // Used previously as default
          enabled: true,
          status: "unknown",
          lastUsedAt: null,
          lastErrorAt: null,
          cooldownUntil: null
        }]
      }
      if (!config.activeProvider) config.activeProvider = "gemini"
      needsSave = true
      await chrome.storage.local.remove([OLD_STORAGE_KEY])
    }

    // Migrate V2 configs (single apiKey/model) to V3 (accounts array)
    const providerIds: ProviderId[] = ["gemini", "groq", "openrouter"]
    for (const pid of providerIds) {
      const pConfig = config.providers[pid] as any
      if (pConfig && pConfig.apiKey && !pConfig.accounts) {
        config.providers[pid] = {
          accounts: [{
            id: crypto.randomUUID(),
            name: `${PROVIDERS[pid].name} 1`,
            apiKey: pConfig.apiKey,
            model: pConfig.model,
            enabled: pConfig.enabled !== false,
            status: "unknown",
            lastUsedAt: null,
            lastErrorAt: null,
            cooldownUntil: null
          }]
        }
        needsSave = true
      }
    }

    if (needsSave) {
      await chrome.storage.local.set({ [CONFIG_KEY]: config })
    }
    
    return config
  },

  async saveConfig(config: AIConfig): Promise<void> {
    await chrome.storage.local.set({ [CONFIG_KEY]: config })
  },

  getAvailableAccounts(config: AIConfig, providerId: ProviderId): AIAccount[] {
    const pConfig = config.providers[providerId]
    if (!pConfig || !pConfig.accounts) return []

    const now = Date.now()
    
    const available = pConfig.accounts.filter(acc => {
      if (!acc.enabled) return false
      if (acc.status === "invalid") return false
      if (acc.cooldownUntil && acc.cooldownUntil > now) return false
      return true
    })

    // Sort: least recently used first
    available.sort((a, b) => {
      const aTime = a.lastUsedAt || 0
      const bTime = b.lastUsedAt || 0
      return aTime - bTime
    })

    return available
  },

  async hasConfiguredApiKeys(): Promise<boolean> {
    const config = await this.getConfig()
    if (!config.activeProvider) return false
    const accounts = this.getAvailableAccounts(config, config.activeProvider)
    return accounts.length > 0
  },

  async updateAccountState(providerId: ProviderId, accountId: string, updates: Partial<AIAccount>): Promise<void> {
    const config = await this.getConfig()
    const pConfig = config.providers[providerId]
    if (pConfig && pConfig.accounts) {
      const index = pConfig.accounts.findIndex(a => a.id === accountId)
      if (index !== -1) {
        pConfig.accounts[index] = { ...pConfig.accounts[index], ...updates }
        await this.saveConfig(config)
      }
    }
  },

  async generateReplies(
    postText: string, 
    tone: string, 
    customInstruction: string = "", 
    numReplies: number = 3,
    grokContext: string = ""
  ): Promise<GenerationResult> {
    const config = await this.getConfig()
    
    if (!config.activeProvider) {
      throw new MissingApiKeyError()
    }

    // We'll return the result of attempting a provider
    const attemptProvider = async (providerId: ProviderId, isFallback: boolean): Promise<GenerationResult> => {
      const accounts = this.getAvailableAccounts(config, providerId)
      if (accounts.length === 0) {
        throw new ProviderError(`No available accounts for ${PROVIDERS[providerId].name}.`, "PROVIDER_ERROR")
      }

      const provider = PROVIDERS[providerId]

      for (const account of accounts) {
        try {
          await this.updateAccountState(providerId, account.id, { lastUsedAt: Date.now() })

          const replies = await provider.generateReplies({
            postText,
            tone,
            customInstruction,
            numReplies,
            model: account.model,
            apiKey: account.apiKey,
            grokContext
          })

          // Success! Reset status and cooldown
          await this.updateAccountState(providerId, account.id, {
            status: "healthy",
            cooldownUntil: null
          })

          return {
            replies,
            provider: providerId,
            accountId: account.id,
            usedFallback: isFallback
          }

        } catch (error: any) {
          const isProviderError = error instanceof ProviderError
          const errorType = isProviderError ? error.type : "UNKNOWN_ERROR"

          const now = Date.now()
          let updates: Partial<AIAccount> = { lastErrorAt: now }

          if (errorType === "INVALID_API_KEY") {
            updates.status = "invalid"
          } else if (
            errorType === "RATE_LIMITED" || 
            errorType === "QUOTA_EXCEEDED" || 
            errorType === "NETWORK_ERROR" || 
            errorType === "SERVICE_UNAVAILABLE"
          ) {
            updates.status = "rate_limited"
            updates.cooldownUntil = now + 60000 // Default 60 seconds cooldown
          } else if (errorType === "MODEL_UNAVAILABLE") {
            // Also treat like a cooldown to try others
            updates.cooldownUntil = now + 60000
          } else {
            // BAD_REQUEST, CONTENT_POLICY, etc - probably shouldn't blindly retry the same exact prompt
            // But we'll mark as healthy since the key itself isn't broken
            updates.status = "healthy"
          }

          await this.updateAccountState(providerId, account.id, updates)

          // If it's a fatal prompt error (like CONTENT_POLICY), bubble it up immediately, 
          // retrying another key won't fix the prompt
          if (errorType === "CONTENT_POLICY" || errorType === "BAD_REQUEST") {
            throw error
          }
          
          // Otherwise, continue to next account in the loop
        }
      }

      // If we exit the loop, all accounts failed
      throw new ProviderError(`All accounts for ${PROVIDERS[providerId].name} failed or are unavailable.`, "PROVIDER_ERROR")
    }

    // Try Active Provider first
    try {
      return await attemptProvider(config.activeProvider, false)
    } catch (activeError: any) {
      // If active provider failed, and we have fallback enabled, try fallbacks
      if (config.fallbackEnabled && config.fallbackProviders.length > 0) {
        for (const fallbackId of config.fallbackProviders) {
          // Skip if it was the active provider
          if (fallbackId === config.activeProvider) continue
          
          try {
            return await attemptProvider(fallbackId, true)
          } catch (fallbackError) {
            // Fallback provider failed too, continue to next
            continue
          }
        }
      }

      // If we get here, fallbacks failed or were disabled
      // Throw the original active provider error
      throw activeError
    }
  }
}
