import React from "react"

export type GuideCategory = "all" | "keys" | "tips" | "platforms" | "faq" | "troubleshooting"

export interface GuideCategoryMeta {
  id: GuideCategory
  label: string
  icon: string
  count?: number
}

export interface GuideItem {
  id: string
  category: "keys" | "tips" | "platforms" | "faq" | "troubleshooting"
  icon: string
  title: string
  subtitle?: string
  badge?: string
  badgeBg?: string
  badgeColor?: string
  actionLink?: {
    url: string
    label: string
  }
  keywords: string[]
  content: React.ReactNode
}

export const GUIDE_CATEGORIES: GuideCategoryMeta[] = [
  { id: "all", label: "All Topics", icon: "📚" },
  { id: "keys", label: "API Key Setup", icon: "🔑" },
  { id: "tips", label: "Pro Tips & Prompts", icon: "💡" },
  { id: "platforms", label: "Platforms & Roadmap", icon: "🌐" },
  { id: "faq", label: "General FAQ", icon: "❓" },
  { id: "troubleshooting", label: "Troubleshooting", icon: "🛠️" }
]

export const GUIDE_ITEMS: GuideItem[] = [
  // ==========================================
  // 1. API KEY SETUP GUIDES
  // ==========================================
  {
    id: "gemini-key",
    category: "keys",
    icon: "💎",
    title: "How to get a Free Google Gemini API Key",
    subtitle: "Recommended • 100% Free daily quota • Fast & intelligent",
    badge: "Recommended",
    badgeBg: "#ecfdf5",
    badgeColor: "#059669",
    actionLink: {
      url: "https://aistudio.google.com/app/apikey",
      label: "Open Google AI Studio ↗"
    },
    keywords: ["gemini", "google", "free", "api key", "ai studio", "flash", "setup"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          Google Gemini is the default recommended provider for Replyly. Gemini 2.5 Flash offers high intelligence, near-instant speed, and generous free tier rate limits without requiring a credit card.
        </p>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
          <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827", marginBottom: "8px" }}>Step-by-Step Setup:</div>
          <ol style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
            <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#E76F51", fontWeight: 600 }}>Google AI Studio (aistudio.google.com)</a>.</li>
            <li>Sign in using any regular Google / Gmail account.</li>
            <li>Click the blue <strong>&quot;Create API Key&quot;</strong> button.</li>
            <li>Select an existing Google Cloud project or click <em>&quot;Create key in new project&quot;</em>.</li>
            <li>Copy the generated key (starts with <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>AIzaSy...</code>).</li>
            <li>In Replyly, go to the <strong>API Keys</strong> tab, click <strong>+ Add Key</strong>, select <strong>Google Gemini</strong>, and paste your key.</li>
          </ol>
        </div>
        <div style={{ fontSize: "12px", color: "#065f46", backgroundColor: "#ecfdf5", padding: "8px 12px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
          💡 <strong>Tip:</strong> The free tier on Google AI Studio allows up to 15 Requests Per Minute (RPM) and 1,500 Requests Per Day (RPD), which is more than enough for hundreds of replies daily.
        </div>
      </div>
    )
  },
  {
    id: "groq-key",
    category: "keys",
    icon: "⚡",
    title: "How to get a Free Groq Cloud API Key",
    subtitle: "Ultra-fast inference (500+ tokens/sec) • Powered by Llama 3.3",
    badge: "Ultra Fast",
    badgeBg: "#fffbeb",
    badgeColor: "#b45309",
    actionLink: {
      url: "https://console.groq.com/keys",
      label: "Open Groq Console ↗"
    },
    keywords: ["groq", "llama", "fast", "speed", "free", "api key", "lpu"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          Groq uses specialized LPU (Language Processing Unit) hardware to run open-weight models like Meta Llama 3.3 70B at mind-blowing speeds (over 500 tokens/sec), delivering replies in under 400 milliseconds.
        </p>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
          <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827", marginBottom: "8px" }}>Step-by-Step Setup:</div>
          <ol style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
            <li>Go to the <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: "#E76F51", fontWeight: 600 }}>Groq Console</a>.</li>
            <li>Sign in with GitHub or Google.</li>
            <li>Click <strong>&quot;Create API Key&quot;</strong> in the top right.</li>
            <li>Enter a name such as &quot;Replyly Key&quot; and click <strong>Submit</strong>.</li>
            <li>Copy the key (starts with <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>gsk_...</code>). Note: it is only shown once!</li>
            <li>Paste it into Replyly under <strong>API Keys -&gt; Groq Cloud</strong>.</li>
          </ol>
        </div>
        <div style={{ fontSize: "12px", color: "#1e40af", backgroundColor: "#eff6ff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
          ⚡ <strong>Performance note:</strong> Groq is fantastic as both a primary provider and as a secondary backup in Smart Failover for instant fallback generation.
        </div>
      </div>
    )
  },
  {
    id: "openrouter-key",
    category: "keys",
    icon: "🌐",
    title: "How to configure OpenRouter (Access 100+ Models)",
    subtitle: "Claude 3.5, DeepSeek, GPT-4o & OSS models with a single API key",
    badge: "100+ Models",
    badgeBg: "#FFF3EE",
    badgeColor: "#E76F51",
    actionLink: {
      url: "https://openrouter.ai/keys",
      label: "OpenRouter Keys ↗"
    },
    keywords: ["openrouter", "router", "claude", "deepseek", "all models", "aggregator"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          OpenRouter acts as a unified AI gateway. With one OpenRouter key, you can access models from Anthropic (Claude 3.5), OpenAI (GPT-4o), DeepSeek (V3/R1), Meta (Llama), and dozens of free open-source models.
        </p>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
          <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827", marginBottom: "8px" }}>Step-by-Step Setup:</div>
          <ol style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
            <li>Navigate to <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: "#E76F51", fontWeight: 600 }}>OpenRouter Keys</a>.</li>
            <li>Create an account or connect your crypto/GitHub/Google wallet.</li>
            <li>Click <strong>&quot;Create Key&quot;</strong>, set a credit limit if desired, and copy your key (<code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>sk-or-v1-...</code>).</li>
            <li>Add the key to Replyly under <strong>API Keys -&gt; OpenRouter</strong>.</li>
          </ol>
        </div>
        <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280" }}>
          Replyly defaults to <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>openrouter/auto</code>, which automatically routes to the highest-performing, cost-effective provider.
        </p>
      </div>
    )
  },
  {
    id: "openai-key",
    category: "keys",
    icon: "🤖",
    title: "How to get an OpenAI API Key (GPT-4o & GPT-4o-mini)",
    subtitle: "Industry-standard precision and conversational naturalness",
    actionLink: {
      url: "https://platform.openai.com/api-keys",
      label: "OpenAI Platform ↗"
    },
    keywords: ["openai", "chatgpt", "gpt-4o", "gpt-4o-mini", "api key"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          OpenAI&apos;s GPT-4o-mini and GPT-4o provide stellar tone matching and context nuance.
        </p>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
          <ol style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
            <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: "#E76F51", fontWeight: 600 }}>OpenAI API Keys</a>.</li>
            <li>Log in with your OpenAI account.</li>
            <li>Click <strong>&quot;Create new secret key&quot;</strong> and copy it (<code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>sk-proj-...</code>).</li>
            <li>Ensure you have a small prepaid credit balance in your OpenAI Billing settings.</li>
            <li>Paste into Replyly under <strong>API Keys -&gt; OpenAI</strong>.</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: "anthropic-key",
    category: "keys",
    icon: "🧠",
    title: "How to get an Anthropic Claude API Key (Claude 3.5 Sonnet & Haiku)",
    subtitle: "Exceptional writing quality, subtle humor, and deep reasoning",
    actionLink: {
      url: "https://console.anthropic.com/settings/keys",
      label: "Anthropic Console ↗"
    },
    keywords: ["anthropic", "claude", "sonnet", "haiku", "claude 3.5"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          Claude 3.5 Haiku and Sonnet are praised for sounding remarkably human, avoiding AI clichés, and adapting smoothly to nuanced tones.
        </p>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
          <ol style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
            <li>Visit the <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "#E76F51", fontWeight: 600 }}>Anthropic Console</a>.</li>
            <li>Create an account or log in.</li>
            <li>Click <strong>&quot;Create Key&quot;</strong>, name it &quot;Replyly&quot;, and copy the key (<code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>sk-ant-...</code>).</li>
            <li>Paste the key into Replyly under <strong>Anthropic (Claude)</strong>.</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: "deepseek-key",
    category: "keys",
    icon: "🚀",
    title: "How to get a DeepSeek API Key (DeepSeek-V3 & R1)",
    subtitle: "Top-tier open intelligence at a fraction of the cost",
    actionLink: {
      url: "https://platform.deepseek.com/api_keys",
      label: "DeepSeek Platform ↗"
    },
    keywords: ["deepseek", "deepseek-v3", "deepseek-r1", "china", "cheap"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          DeepSeek V3 provides frontier-level response quality at extremely low pricing.
        </p>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 16px" }}>
          <ol style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
            <li>Go to <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" style={{ color: "#E76F51", fontWeight: 600 }}>DeepSeek Platform</a>.</li>
            <li>Sign in and top up a balance (DeepSeek offers initial free trial credits upon sign-up).</li>
            <li>Create a new API Key and copy it.</li>
            <li>Paste into Replyly under <strong>DeepSeek</strong>.</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: "other-providers",
    category: "keys",
    icon: "🔌",
    title: "Setting up Mistral, Together AI, Perplexity, NVIDIA & xAI",
    subtitle: "Supported multi-provider integrations",
    keywords: ["mistral", "together", "perplexity", "nvidia", "xai", "grok", "nim"],
    content: (
      <div>
        <p style={{ margin: "0 0 12px 0", color: "#374151", lineHeight: "1.6" }}>
          Replyly natively supports direct API connections to all major model providers:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
          {[
            { name: "Mistral AI", url: "https://console.mistral.ai/api-keys/", desc: "Mistral Small & Large" },
            { name: "Together AI", url: "https://api.together.ai/settings/api-keys", desc: "Llama 3.3 Turbo & OSS" },
            { name: "Perplexity", url: "https://www.perplexity.ai/settings/api", desc: "Sonar search-grounded models" },
            { name: "NVIDIA NIM", url: "https://build.nvidia.com/", desc: "High-throughput cloud NIMs" },
            { name: "xAI (Grok)", url: "https://console.x.ai/", desc: "Grok-2 & Grok-2 mini" }
          ].map((item) => (
            <div key={item.name} style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827" }}>{item.name}</div>
              <div style={{ fontSize: "11.5px", color: "#6b7280", margin: "2px 0 6px 0" }}>{item.desc}</div>
              <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: "11.5px", color: "#E76F51", fontWeight: 600, textDecoration: "none" }}>
                Get Key ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    )
  },

  // ==========================================
  // 2. PRO TIPS & REPLY CRAFTING
  // ==========================================
  {
    id: "custom-instructions-guide",
    category: "tips",
    icon: "🎯",
    title: "How to Write Winning Custom Instructions",
    subtitle: "Make every reply sound 100% like you and avoid AI fluff",
    keywords: ["custom prompt", "instructions", "personality", "prompt engineering", "human-like"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          Custom instructions in the <strong>Preferences</strong> tab are prepended to every generation prompt. They give you complete control over formatting, personality, persona, and length.
        </p>
        <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827", marginBottom: "8px" }}>Copy-and-Paste Templates:</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>👨‍💻 The Tech Builder & Founder:</div>
            <code style={{ fontSize: "12px", color: "#475569", display: "block", lineHeight: "1.5", fontFamily: "monospace" }}>
              &quot;Keep replies punchy and under 220 characters. Speak from the perspective of an indie builder and engineer. No hashtags, no cheesy emojis, never say &apos;Spot on!&apos; or &apos;Totally agree&apos;.&quot;
            </code>
          </div>

          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>📈 The Growth & Insight Creator:</div>
            <code style={{ fontSize: "12px", color: "#475569", display: "block", lineHeight: "1.5", fontFamily: "monospace" }}>
              &quot;Focus on adding a novel perspective or contrarian insight not mentioned in the post. Ask open-ended questions that provoke meaningful discussion. Avoid generic praise.&quot;
            </code>
          </div>

          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>☕ The Casual & Friendly Voice:</div>
            <code style={{ fontSize: "12px", color: "#475569", display: "block", lineHeight: "1.5", fontFamily: "monospace" }}>
              &quot;Write naturally like a friend texting. Use lowercase where appropriate, be warm and authentic, keep it under 2 sentences.&quot;
            </code>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "tone-mastery-guide",
    category: "tips",
    icon: "🎭",
    title: "Mastering the 8 Reply Tones",
    subtitle: "When to use each tone for peak engagement and audience connection",
    keywords: ["tones", "smart", "casual", "curious", "bold", "funny", "contrarian", "supportive"],
    content: (
      <div>
        <p style={{ margin: "0 0 12px 0", color: "#374151", lineHeight: "1.6" }}>
          Choosing the right tone for each post context dramatically boosts reply visibility and creator interactions:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
          {[
            { emoji: "💡", tone: "Smart", best: "Thought leadership, industry news, hot takes", tip: "Provides a crisp, insightful observation." },
            { emoji: "☕", tone: "Casual", best: "Personal updates, weekend posts, banter", tip: "Sounds authentic, warm, and conversational." },
            { emoji: "🧐", tone: "Curious", best: "Debates, AMAs, tutorials, complex threads", tip: "Asks a thought-provoking follow-up question." },
            { emoji: "😂", tone: "Funny", best: "Memes, viral tweets, relatable struggles", tip: "Adds clever wit without being cringey or forced." },
            { emoji: "💻", tone: "Technical", best: "Code snippets, architecture, benchmarks", tip: "Deep-dives into technical tradeoffs & details." },
            { emoji: "🔥", tone: "Bold", best: "Strong opinions, announcements, milestone posts", tip: "Delivers direct, high-confidence takes." },
            { emoji: "🤝", tone: "Supportive", best: "Launches, fundraising, celebrations, setbacks", tip: "Encouraging, genuine, and uplifting." },
            { emoji: "🤔", tone: "Contrarian", best: "Echo chamber posts, conventional wisdom", tip: "Respectfully challenges the status quo." }
          ].map((t) => (
            <div key={t.tone} style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px", color: "#111827" }}>
                <span>{t.emoji}</span>
                <span>{t.tone}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "4px" }}><strong>Best for:</strong> {t.best}</div>
              <div style={{ fontSize: "11.5px", color: "#6b7280", marginTop: "2px" }}>{t.tip}</div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "grok-sidebar-guide",
    category: "tips",
    icon: "⚡",
    title: "Supercharge Replies with Grok Sidebar Context on X",
    subtitle: "Automatic integration with xAI Grok analysis panel",
    keywords: ["grok", "xai", "sidebar", "deep search", "context", "fact check"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          When you click the Grok icon on X to inspect a post or thread, Replyly automatically detects the Grok analysis panel in your DOM and incorporates Grok&apos;s real-time reasoning and fact-checking into your generated replies.
        </p>
        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", color: "#334155", fontSize: "12.5px", lineHeight: "1.6" }}>
          <strong>How to use it:</strong>
          <ol style={{ margin: "6px 0 0 0", paddingLeft: "18px" }}>
            <li>On X, click the native Grok button on any post to open the side panel analysis.</li>
            <li>Click the <strong>RLY</strong> button on that post.</li>
            <li>Replyly will display a <strong>&quot;Grok Context Attached&quot;</strong> badge and craft replies with deep factual grounding and up-to-the-minute context!</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: "engagement-playbook",
    category: "tips",
    icon: "📈",
    title: "The High-Engagement Social Reply Playbook",
    subtitle: "How to turn replies into followers, relationships, and inbound opportunities",
    keywords: ["growth", "followers", "engagement", "algorithm", "speed"],
    content: (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#4b5563", lineHeight: "1.6" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>⏱️</span>
            <div>
              <strong style={{ color: "#111827" }}>The 15-Minute Window:</strong> Replying within the first 5–15 minutes of a post going live places your comment near the top before hundreds of other comments flood in.
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>➕</span>
            <div>
              <strong style={{ color: "#111827" }}>Add Value, Don&apos;t Just Agree:</strong> Never post &quot;Great post!&quot; or restate what the author said. Add a practical metric, a related case study, or a polite counter-example.
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>✂️</span>
            <div>
              <strong style={{ color: "#111827" }}>Brevity Wins:</strong> People scan feeds on mobile. 1 to 3 crisp sentences perform 4x better than walls of text.
            </div>
          </div>
        </div>
      </div>
    )
  },

  // ==========================================
  // 3. PLATFORMS & ROADMAP
  // ==========================================
  {
    id: "platform-x",
    category: "platforms",
    icon: "🐦",
    title: "X (Twitter) Integration Status",
    subtitle: "Active & Live • Injected directly into post feeds and detail views",
    badge: "Active",
    badgeBg: "#ecfdf5",
    badgeColor: "#059669",
    actionLink: {
      url: "https://x.com",
      label: "Open X.com ↗"
    },
    keywords: ["x", "twitter", "feed", "tweet", "active"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          Replyly is fully active on <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>x.com</code> and <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>twitter.com</code>.
        </p>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
          <li>Injected seamlessly into every tweet action bar alongside like, retweet, and bookmark buttons.</li>
          <li>Supports single posts, thread conversations, quoted tweets, and media posts.</li>
          <li>1-click <strong>&quot;Insert into Composer&quot;</strong> places the reply directly in the tweet composer and focuses the text cursor automatically.</li>
        </ul>
      </div>
    )
  },
  {
    id: "platform-linkedin",
    category: "platforms",
    icon: "💼",
    title: "LinkedIn Integration (Coming Soon 🚀)",
    subtitle: "Professional feed discussions, thought leadership & networking comments",
    badge: "Coming Soon",
    badgeBg: "#e0e7ff",
    badgeColor: "#4338ca",
    actionLink: {
      url: "https://linkedin.com",
      label: "Open LinkedIn ↗"
    },
    keywords: ["linkedin", "coming soon", "professional", "b2b", "roadmap"],
    content: (
      <div>
        <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
          <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#1e40af", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🚀</span> LinkedIn Support is in Active Development!
          </div>
          <p style={{ margin: "6px 0 0 0", color: "#1e3a8a", fontSize: "12.5px", lineHeight: "1.6" }}>
            We are building native injection and comment bar integration for LinkedIn feed posts, long-form articles, and company updates.
          </p>
        </div>

        <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827", marginBottom: "6px" }}>Upcoming LinkedIn Features:</div>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
          <li><strong>Professional Tone Presets:</strong> Tailored tones for B2B engagement (Thought Leader, Collaborative Peer, Talent & Recruiter, Case Study Analysis).</li>
          <li><strong>Comment Box Auto-Fill:</strong> Insert directly into LinkedIn comment fields with formatted bullet points and clean structure.</li>
          <li><strong>Contextual Post Awareness:</strong> Reads company taglines, post text, and article links for relevant business commentary.</li>
        </ul>
      </div>
    )
  },
  {
    id: "platform-roadmap",
    category: "platforms",
    icon: "🔮",
    title: "Multi-Platform Roadmap (Bluesky, Threads, Reddit)",
    subtitle: "Expanding AI reply superpowers across the entire modern social web",
    keywords: ["roadmap", "bluesky", "threads", "reddit", "future", "platforms"],
    content: (
      <div>
        <p style={{ margin: "0 0 12px 0", color: "#374151", lineHeight: "1.6" }}>
          Replyly is designed to be the universal social reply assistant. Here is our platform rollout roadmap:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { platform: "X (Twitter)", status: "Live & Active 🟢", desc: "Full feed, thread, and Grok context support." },
            { platform: "LinkedIn", status: "Coming Soon 🚀 (Next Release)", desc: "Professional feed posts, articles, and comment bars." },
            { platform: "Bluesky", status: "In Planning 🟡", desc: "AT Protocol feed injection and reply generation." },
            { platform: "Meta Threads", status: "In Planning 🟡", desc: "Threads web feed support." },
            { platform: "Reddit", status: "Under Consideration ⚪", desc: "Subreddit thread discussions and AMAs." }
          ].map((item) => (
            <div key={item.platform} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
              <div>
                <strong style={{ fontSize: "13px", color: "#111827" }}>{item.platform}</strong>
                <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>{item.desc}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },

  // ==========================================
  // 4. FREQUENTLY ASKED QUESTIONS (FAQ)
  // ==========================================
  {
    id: "faq-security",
    category: "faq",
    icon: "🔒",
    title: "Are my API keys and personal data secure?",
    subtitle: "100% Client-Side BYOK (Bring Your Own Key) Architecture",
    badge: "100% Client-Side",
    badgeBg: "#ecfdf5",
    badgeColor: "#059669",
    keywords: ["security", "privacy", "byok", "client side", "server", "keys safe"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          <strong>Yes, absolutely.</strong> Replyly is engineered with a strict <em>zero-backend, client-side BYOK architecture</em>:
        </p>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
          <li>Your API keys are stored exclusively in your browser&apos;s encrypted <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>chrome.storage.local</code>.</li>
          <li>When you generate a reply, the browser sends an API request directly from your browser to the official provider endpoint (e.g. <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>generativelanguage.googleapis.com</code> or <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>api.groq.com</code>).</li>
          <li>There is no Replyly server, no analytics proxy, and no telemetry tracking your keys or conversations.</li>
        </ul>
      </div>
    )
  },
  {
    id: "faq-pricing",
    category: "faq",
    icon: "💰",
    title: "Is Replyly completely free to use?",
    subtitle: "No monthly subscriptions, no paywalls",
    keywords: ["pricing", "cost", "free", "subscription", "hidden fees"],
    content: (
      <div>
        <p style={{ margin: "0 0 8px 0", color: "#374151", lineHeight: "1.6" }}>
          <strong>Yes!</strong> Replyly has no recurring fees or paid plans.
        </p>
        <p style={{ margin: "0 0 8px 0", color: "#4b5563", fontSize: "13px", lineHeight: "1.6" }}>
          Because Replyly uses your own API keys (BYOK), you can use free tiers provided directly by AI companies:
        </p>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
          <li><strong>Google Gemini:</strong> 100% Free on AI Studio (up to 1,500 daily requests).</li>
          <li><strong>Groq Cloud:</strong> Free tier with generous hourly token allowances.</li>
          <li><strong>OpenAI / Claude / DeepSeek:</strong> Pay-as-you-go per token (fractions of a cent per reply).</li>
        </ul>
      </div>
    )
  },
  {
    id: "faq-multiple-accounts",
    category: "faq",
    icon: "🔑",
    title: "Can I add multiple API keys for the same AI provider?",
    subtitle: "Multi-account management with custom nicknames and instant switching",
    keywords: ["multiple keys", "accounts", "rotation", "switch", "work key", "personal key"],
    content: (
      <div>
        <p style={{ margin: "0 0 8px 0", color: "#374151", lineHeight: "1.6" }}>
          Yes! You can add unlimited accounts/keys for any provider.
        </p>
        <p style={{ margin: 0, color: "#4b5563", fontSize: "13px", lineHeight: "1.6" }}>
          For instance, you can add a <em>&quot;Work Gemini Key&quot;</em> and a <em>&quot;Personal Gemini Key&quot;</em>. In the <strong>API Keys</strong> tab, simply click the power button icon on any key to make it the active default.
        </p>
      </div>
    )
  },
  {
    id: "faq-edit-replies",
    category: "faq",
    icon: "✍️",
    title: "Can I edit and customize replies before posting?",
    subtitle: "Full in-place editing and instant composer insertion",
    keywords: ["edit", "customize", "modify", "composer", "draft"],
    content: (
      <div>
        <p style={{ margin: "0 0 8px 0", color: "#374151", lineHeight: "1.6" }}>
          Yes! Replyly encourages a human-in-the-loop workflow:
        </p>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
          <li>Click the <strong>pencil/edit icon</strong> on any generated reply card to tweak the text right in the modal.</li>
          <li>Click <strong>&quot;Insert to Composer&quot;</strong> to place the text directly into X&apos;s native reply box, where you can add photos, tags, or further edits before posting.</li>
          <li>Click <strong>&quot;Regenerate&quot;</strong> on any individual reply to get a fresh take without regenerating the others.</li>
        </ul>
      </div>
    )
  },
  {
    id: "faq-safety-bans",
    category: "faq",
    icon: "🛡️",
    title: "Will using Replyly get my social accounts flagged or banned?",
    subtitle: "Safe, human-in-the-loop writing assistant — not an automated bot",
    keywords: ["ban", "flagged", "safe", "bot", "twitter rules", "terms of service"],
    content: (
      <div>
        <p style={{ margin: "0 0 8px 0", color: "#374151", lineHeight: "1.6" }}>
          <strong>No.</strong> Replyly is not a bot and does not automatically spam or post autonomously.
        </p>
        <p style={{ margin: 0, color: "#4b5563", fontSize: "13px", lineHeight: "1.6" }}>
          It acts as an intelligent writing assistant (like Grammarly or Notion AI) helping you draft ideas. Every single reply requires your deliberate review, edit, and manual click to publish through the official website interface.
        </p>
      </div>
    )
  },
  {
    id: "faq-rate-limits",
    category: "faq",
    icon: "🔄",
    title: "What happens if an API provider hits a rate limit (HTTP 429)?",
    subtitle: "Automatic Smart Failover seamlessly switches to backup providers",
    keywords: ["rate limit", "429", "failover", "smart fallback", "cooldown"],
    content: (
      <div>
        <p style={{ margin: "0 0 8px 0", color: "#374151", lineHeight: "1.6" }}>
          Replyly features built-in <strong>Smart Failover</strong>:
        </p>
        <ol style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
          <li>If your active provider returns a rate limit (429) or temporary server error (503), Replyly automatically marks that key in a temporary 60-second cooldown.</li>
          <li>It immediately re-attempts generation using your enabled backup providers (e.g. Groq or OpenRouter).</li>
          <li>Your generation succeeds seamlessly without annoying error popups or lost context.</li>
        </ol>
      </div>
    )
  },

  // ==========================================
  // 5. TROUBLESHOOTING & SUPPORT
  // ==========================================
  {
    id: "troubleshoot-missing-key",
    category: "troubleshooting",
    icon: "⚠️",
    title: "I see a 'Missing API Key' message when clicking RLY",
    subtitle: "How to connect a key in under 30 seconds",
    keywords: ["missing key", "not configured", "error", "no key"],
    content: (
      <div>
        <p style={{ margin: "0 0 8px 0", color: "#374151", lineHeight: "1.6" }}>
          This indicates you haven&apos;t added an API key yet, or your added key is currently disabled.
        </p>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#4b5563" }}>
          <strong>Solution:</strong>
          <ol style={{ margin: "6px 0 0 0", paddingLeft: "18px", lineHeight: "1.8" }}>
            <li>Open the Replyly Settings page (or click the extension icon in your Chrome toolbar).</li>
            <li>Go to the <strong>API Keys</strong> tab.</li>
            <li>Click <strong>+ Add Key</strong> and paste a free Google Gemini or Groq Cloud key.</li>
            <li>Make sure the key status indicates <strong>Active</strong>.</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: "troubleshoot-button-missing",
    category: "troubleshooting",
    icon: "🔍",
    title: "The RLY button is not appearing on posts on X (Twitter)",
    subtitle: "Troubleshooting DOM injection and extension active state",
    keywords: ["button missing", "not showing", "not visible", "feed", "refresh"],
    content: (
      <div>
        <p style={{ margin: "0 0 8px 0", color: "#374151", lineHeight: "1.6" }}>
          If the RLY button doesn&apos;t appear in tweet action bars, check the following:
        </p>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#4b5563", fontSize: "13px", lineHeight: "1.8" }}>
          <li><strong>Check Extension Active State:</strong> Open the popup or Preferences tab and make sure the Extension toggle is turned <strong>ON</strong>.</li>
          <li><strong>Refresh the Tab:</strong> Refresh your <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>x.com</code> tab (<code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>Cmd+R</code> on Mac or <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>Ctrl+R</code> on Windows).</li>
          <li><strong>Confirm URL:</strong> Replyly injects on <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>https://x.com/*</code> and <code style={{ backgroundColor: "#f3f4f6", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>https://twitter.com/*</code>.</li>
        </ul>
      </div>
    )
  },
  {
    id: "troubleshoot-media-posts",
    category: "troubleshooting",
    icon: "🖼️",
    title: "How does Replyly handle posts with images, memes, or videos?",
    subtitle: "Visual attachment detection and media-aware prompting",
    keywords: ["images", "photos", "media", "memes", "video", "ocr"],
    content: (
      <div>
        <p style={{ margin: "0 0 8px 0", color: "#374151", lineHeight: "1.6" }}>
          When an X post contains photos, GIFs, or video attachments, Replyly automatically detects the presence of visual media.
        </p>
        <p style={{ margin: 0, color: "#4b5563", fontSize: "13px", lineHeight: "1.6" }}>
          It tags the prompt with visual context indicators (e.g. <em>&quot;The user is sharing visual media/image/video&quot;</em>) so generated responses naturally acknowledge the visual content rather than assuming only text is present.
        </p>
      </div>
    )
  },
  {
    id: "troubleshoot-feedback",
    category: "troubleshooting",
    icon: "💬",
    title: "How to report bugs, suggest features, or contribute",
    subtitle: "Open community feedback and direct developer support",
    keywords: ["bugs", "support", "help", "contact", "contribute", "github"],
    content: (
      <div>
        <p style={{ margin: "0 0 10px 0", color: "#374151", lineHeight: "1.6" }}>
          Replyly is built for creators, founders, and engineers. We love community ideas and feature requests!
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "7px",
              backgroundColor: "#f3f4f6",
              color: "#111827",
              fontSize: "12.5px",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #e5e7eb"
            }}
          >
            <span>🐦</span> Contact on X.com
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "7px",
              backgroundColor: "#f0fdf4",
              color: "#166534",
              fontSize: "12.5px",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #bbf7d0"
            }}
          >
            <span>💼</span> Connect on LinkedIn
          </a>
        </div>
      </div>
    )
  }
]
