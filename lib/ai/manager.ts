import { AIConfig, ProviderId, MissingApiKeyError } from "./types"
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
  activeProvider: null
}

export const AIManager = {
  async getConfig(): Promise<AIConfig> {
    const result = await chrome.storage.local.get([CONFIG_KEY, OLD_STORAGE_KEY])
    let config = result[CONFIG_KEY] as AIConfig | undefined

    // Safely initialize if undefined
    if (!config) {
      config = { providers: {}, activeProvider: null }
    }

    // Migration of existing Gemini users
    if (result[OLD_STORAGE_KEY] && !config.providers.gemini) {
      config.providers.gemini = {
        apiKey: result[OLD_STORAGE_KEY],
        model: "gemini-3.6-flash",
        enabled: true
      }
      if (!config.activeProvider) {
        config.activeProvider = "gemini"
      }
      
      // Save migrated config
      await chrome.storage.local.set({ [CONFIG_KEY]: config })
      // Safely remove old key
      await chrome.storage.local.remove([OLD_STORAGE_KEY])
    }
    
    return config
  },

  async saveConfig(config: AIConfig): Promise<void> {
    await chrome.storage.local.set({ [CONFIG_KEY]: config })
  },

  async generateReplies(
    postText: string, 
    tone: string, 
    customInstruction: string = "", 
    numReplies: number = 3
  ): Promise<string[]> {
    const config = await this.getConfig()
    
    if (!config.activeProvider) {
      throw new MissingApiKeyError()
    }

    const providerConfig = config.providers[config.activeProvider]
    if (!providerConfig || !providerConfig.apiKey) {
      throw new MissingApiKeyError()
    }

    const provider = PROVIDERS[config.activeProvider]
    if (!provider) {
      throw new Error(`Provider ${config.activeProvider} not found.`)
    }

    return provider.generateReplies({
      postText,
      tone,
      customInstruction,
      numReplies,
      model: providerConfig.model,
      apiKey: providerConfig.apiKey
    })
  }
}
