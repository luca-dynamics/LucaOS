/**
 * 🗣️ Trading Debate Service — Phase 44
 *
 * Per-participant model routing. Each debate agent uses their own
 * selected AI model (Gemini, GPT-4, Claude, DeepSeek, local Ollama).
 *
 * Providers supported:
 *  - Google Gemini   → @google/genai
 *  - OpenAI / OpenAI-compatible (GPT*, DeepSeek, Mistral via base_url)
 *  - Anthropic Claude → @anthropic-ai/sdk
 *  - Local Ollama    → http://localhost:11434 (OpenAI-compatible)
 */

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import exchangeManager from './exchangeManager.js';
import indicatorService from './indicatorService.js';
import secureVault from './secureVault.js';

// ============================================================================
// Provider Detection & Settings
// ============================================================================

const LOCAL_MODELS = [
  "gemma-2b", "phi-3-mini", "llama-3.2-1b", "smollm2-1.7b", 
  "qwen-2.5-7b", "deepseek-r1-distill-7b"
];

/**
 * Helper to fetch API keys from Secure Vault with Env fallback.
 */
async function getApiKey(provider) {
  const vaultKey = `setting:brain:${provider}ApiKey`;
  try {
    const secured = await secureVault.retrieve(vaultKey);
    // vault.retrieve returns the raw value if stored as a string, or an object if JSON
    if (secured) {
      const val = typeof secured === 'object' ? secured.password || secured.apiKey || secured.value : secured;
      if (val && val !== '[SECURED]') return val;
    }
  } catch (e) {
    console.debug(`[DebateService] Vault lookup failed for ${provider}:`, e.message);
  }

  // Fallback to Env
  const envMap = {
    gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    anthropic: ['ANTHROPIC_API_KEY'],
    xai: ['XAI_API_KEY', 'GROK_API_KEY'],
    deepseek: ['DEEPSEEK_API_KEY']
  };

  const envKeys = envMap[provider] || [];
  for (const key of envKeys) {
    if (process.env[key]) return process.env[key];
  }
  
  return null;
}

/**
 * Detect which provider handles this modelId.
 * Returns: 'gemini' | 'openai' | 'anthropic' | 'xai' | 'deepseek' | 'cortex' | 'ollama' | 'openai-compat'
 */
function detectProvider(modelId = '') {
  const m = modelId.toLowerCase();
  
  // 1. Local Luca / Cortex Models
  if (LOCAL_MODELS.some(lm => m.includes(lm)) || m.startsWith('local/')) return 'cortex';
  
  // 2. Cloud Providers
  if (m.includes('gemini') || m.includes('google'))   return 'gemini';
  if (m.includes('claude') || m.includes('anthropic')) return 'anthropic';
  if (m.includes('grok') || m.includes('xai'))         return 'xai';
  if (m.includes('deepseek'))                          return 'deepseek';
  if (m.startsWith('ollama:') || m.includes('ollama')) return 'ollama';
  
  // Mistral, Groq via OpenAI SDK
  if (m.includes('mistral') || m.includes('groq')) return 'openai-compat';
  
  // Default OpenAI
  if (m.startsWith('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3')) return 'openai';
  
  return 'gemini';
}

// ============================================================================
// Unified Model Caller
// ============================================================================

/**
 * Call any supported model with a prompt string.
 * Returns the text response.
 */
async function callModel(modelId, prompt) {
  const provider = detectProvider(modelId);
  const cleanModelId = modelId.replace(/^ollama:|local\//, '');

  switch (provider) {
    case 'gemini': {
      const apiKey = await getApiKey('gemini');
      if (!apiKey) throw new Error('Gemini API key not found in settings or environment');
      
      const genAI = new GoogleGenAI({ apiKey });
      const result = await genAI.models.generateContent({
        model: cleanModelId || 'gemini-3-flash-preview',
        contents: prompt,
      });
      return result.text;
    }

    case 'anthropic': {
      const apiKey = await getApiKey('anthropic');
      if (!apiKey) throw new Error('Anthropic API key not found in settings');
      
      const anthropic = new Anthropic({ apiKey });
      const msg = await anthropic.messages.create({
        model: cleanModelId,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });
      return msg.content[0]?.text ?? '';
    }

    case 'xai': {
      const apiKey = await getApiKey('xai');
      if (!apiKey) throw new Error('X.AI (Grok) API key not found in settings');
      
      const client = new OpenAI({ 
        baseURL: 'https://api.x.ai/v1',
        apiKey 
      });
      const res = await client.chat.completions.create({
        model: cleanModelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      });
      return res.choices[0]?.message?.content ?? '';
    }

    case 'deepseek': {
      const apiKey = await getApiKey('deepseek');
      if (!apiKey) throw new Error('DeepSeek API key not found in settings');
      
      const client = new OpenAI({ 
        baseURL: 'https://api.deepseek.com/v1',
        apiKey 
      });
      const res = await client.chat.completions.create({
        model: cleanModelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      });
      return res.choices[0]?.message?.content ?? '';
    }

    case 'cortex': {
      // Local Luca Inference (Cortex) - OpenAI-compatible endpoint on Port 8000
      const client = new OpenAI({
        baseURL: process.env.CORTEX_URL || 'http://localhost:8000/v1',
        apiKey: 'luca-local', 
      });
      const res = await client.chat.completions.create({
        model: cleanModelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      });
      return res.choices[0]?.message?.content ?? '';
    }

    case 'ollama': {
      const client = new OpenAI({
        baseURL: process.env.OLLAMA_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama',
      });
      const res = await client.chat.completions.create({
        model: cleanModelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      });
      return res.choices[0]?.message?.content ?? '';
    }

    case 'openai-compat': {
      const baseURLMap = {
        deepseek: 'https://api.deepseek.com/v1',
        mistral:  'https://api.mistral.ai/v1',
        groq:     'https://api.groq.com/openai/v1',
      };
      
      const providerKey = Object.keys(baseURLMap).find(k => cleanModelId.includes(k)) ?? 'deepseek';
      const apiKey = await getApiKey(providerKey) || await getApiKey('openai');
      
      if (!apiKey) throw new Error(`API key for ${providerKey} not found in settings`);
      
      const client = new OpenAI({ baseURL: baseURLMap[providerKey], apiKey });
      const res = await client.chat.completions.create({
        model: cleanModelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      });
      return res.choices[0]?.message?.content ?? '';
    }

    case 'openai':
    default: {
      const apiKey = await getApiKey('openai');
      if (!apiKey) throw new Error('OpenAI API key not found in settings');
      
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({
        model: cleanModelId || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      });
      return res.choices[0]?.message?.content ?? '';
    }
  }
}

// ============================================================================
// Personalities
// ============================================================================

const PROMPT_VARIANTS = {
  balanced:     'Be objective and balanced. Weigh risks and rewards equally.',
  aggressive:   'Be aggressive. Focus on maximum profit potential. Tolerate higher risk.',
  conservative: 'Be conservative. Prioritize capital preservation. Avoid uncertain setups.',
};

const PERSONALITIES = {
  bull: {
    id: 'bull', name: 'Bull', role: 'Bull Trader',
    prompt: 'You are a permabull trader. Focus on bullish signals, upward momentum, and buy opportunities. Use high energy and optimism. Be concise.',
  },
  bear: {
    id: 'bear', name: 'Bear', role: 'Bear Trader',
    prompt: 'You are a permabear trader. Focus on bearish signals, crashes, and short opportunities. Highlight risks and overextension. Be skeptical and concise.',
  },
  analyst: {
    id: 'analyst', name: 'Analyst', role: 'Technical Analyst',
    prompt: 'You are a technical analyst. Focus on support/resistance, chart patterns, and indicators. Be objective, precise, and data-driven. Be concise.',
  },
  risk_manager: {
    id: 'risk_manager', name: 'Risk Manager', role: 'Risk Manager',
    prompt: 'You are a risk manager. Focus on protecting capital. Identify worst-case scenarios. Recommend strict stop-losses. Be concise.',
  },
  contrarian: {
    id: 'contrarian', name: 'Contrarian', role: 'Contrarian Trader',
    prompt: 'You are a contrarian trader. Look for crowded trades. If everyone is bullish, find reasons to sell. If fearful, look to buy. Be concise.',
  },
};

// ============================================================================
// Debate Manager
// ============================================================================

class DebateManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.activeDebates = new Set();
  }

  /**
   * Start a new debate session.
   *
   * config.participants: Array of { personality, aiModelId }
   *   (or legacy string array like ['bull', 'bear'])
   */
  async startDebate(config) {
    const {
      strategyId,
      symbol,
      exchange = 'binance',
      maxRounds = 3,
      promptVariant = 'balanced',
      name,
    } = config;

    // Normalise participants — support both legacy string[] and new {personality, aiModelId}[]
    const rawParticipants = config.participants ?? ['bull', 'bear', 'analyst', 'risk_manager'];
    const participants = rawParticipants.map((p) => {
      if (typeof p === 'string') {
        const key = p.toLowerCase().replace(/ /g, '_');
        return { personality: key, aiModelId: null }; // will default to gemini
      }
      return {
        personality: (p.personality ?? p.id ?? 'analyst').toLowerCase().replace(/ /g, '_'),
        aiModelId: p.aiModelId ?? null,
      };
    });

    const id = `debate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session = {
      id,
      name: name || `Debate: ${symbol}`,
      strategyId,
      symbol,
      exchange,
      maxRounds,
      promptVariant,
      currentRound: 0,
      status: 'initializing',
      participants: participants.map((p) => {
        const persona = PERSONALITIES[p.personality] ?? PERSONALITIES.analyst;
        return { ...persona, aiModelId: p.aiModelId || 'gemini-1.5-flash' };
      }),
      messages: [],
      votes: [],
      marketContext: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(id, session);
    this.activeDebates.add(id);

    // Run asynchronously — SSE will stream results
    this.runDebate(id).catch((err) => {
      console.error(`[DebateService] Debate ${id} failed:`, err);
      const s = this.sessions.get(id);
      if (s) { s.status = 'failed'; s.error = err.message; this.emit('update', id, s); }
    });

    return session;
  }

  // --------------------------------------------------------------------------
  // Main Debate Loop
  // --------------------------------------------------------------------------

  async runDebate(id) {
    const session = this.sessions.get(id);
    if (!session) return;

    try {
      // 1. Fetch market context
      this._updateStatus(id, 'fetching_data');
      const analysis = await this._fetchContext(session.exchange, session.symbol);
      session.marketContext = indicatorService.formatForAI
        ? indicatorService.formatForAI(analysis, session.symbol)
        : JSON.stringify(analysis, null, 2).slice(0, 2000);

      this._updateStatus(id, 'in_progress');

      // 2. Debate rounds
      for (let round = 1; round <= session.maxRounds; round++) {
        session.currentRound = round;
        this.emit('update', id, session);
        console.log(`[DebateService] ${id} — Round ${round}/${session.maxRounds}`);

        for (const participant of session.participants) {
          await this._generateTurn(id, participant, round);
          await new Promise((r) => setTimeout(r, 800)); // pacing
        }
      }

      // 3. Voting
      this._updateStatus(id, 'voting');
      await this._collectVotes(id);

      // 4. Consensus
      this._calculateConsensus(id);
      this._updateStatus(id, 'completed');

    } catch (err) {
      console.error(`[DebateService] Error in debate ${id}:`, err);
      const s = this.sessions.get(id);
      if (s) { s.status = 'failed'; s.error = err.message; this.emit('update', id, s); }
    } finally {
      this.activeDebates.delete(id);
    }
  }

  // --------------------------------------------------------------------------
  // Generate one turn — uses participant's own aiModelId
  // --------------------------------------------------------------------------

  async _generateTurn(debateId, participant, round) {
    const session = this.sessions.get(debateId);
    if (!session) return;

    const prompt = this._buildTurnPrompt(session, participant, round);

    let content;
    try {
      content = await callModel(participant.aiModelId, prompt);
    } catch (err) {
      // No mock fallback — surface the real error as a system message
      content = `[${participant.name}] could not respond (${err.message}). Check API key for model: ${participant.aiModelId}`;
      console.error(`[DebateService] Turn error for ${participant.name} (${participant.aiModelId}):`, err.message);
    }

    const message = {
      id: `msg_${Date.now()}_${participant.id}`,
      participantId: participant.id,
      participantName: participant.name,
      role: participant.role,
      aiModel: participant.aiModelId,
      content,
      round,
      timestamp: Date.now(),
    };

    session.messages.push(message);
    session.updatedAt = Date.now();
    this.emit('message', debateId, message);
    this.emit('update', debateId, session);
  }

  // --------------------------------------------------------------------------
  // Collect votes — each participant votes with their own model
  // --------------------------------------------------------------------------

  async _collectVotes(debateId) {
    const session = this.sessions.get(debateId);
    if (!session) return;

    for (const participant of session.participants) {
      const prompt = this._buildVotePrompt(session, participant);

      let decision;
      try {
        const text = await callModel(participant.aiModelId, prompt);

        // Parse JSON from response (strip markdown fences if present)
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        decision = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleaned);
      } catch (err) {
        console.error(`[DebateService] Vote parse error for ${participant.name}:`, err.message);
        // Return a neutral vote with error annotation rather than fake data
        decision = {
          action: 'wait',
          confidence: 0,
          leverage: 1,
          reasoning: `Vote unavailable: ${err.message} (model: ${participant.aiModelId})`,
        };
      }

      const vote = {
        participantId: participant.id,
        participantName: participant.name,
        aiModel: participant.aiModelId,
        action: decision.action ?? 'wait',
        confidence: Number(decision.confidence ?? 0),
        leverage: Number(decision.leverage ?? 1),
        stopLoss: decision.stopLoss,
        takeProfit: decision.takeProfit,
        reasoning: decision.reasoning ?? '',
        timestamp: Date.now(),
      };

      session.votes.push(vote);
      this.emit('vote', debateId, vote);
    }

    this.emit('update', debateId, session);
  }

  // --------------------------------------------------------------------------
  // Consensus calculation
  // --------------------------------------------------------------------------

  _calculateConsensus(debateId) {
    const session = this.sessions.get(debateId);
    if (!session || !session.votes.length) return;

    let longScore = 0, shortScore = 0, totalConfidence = 0;

    session.votes.forEach((v) => {
      const conf = v.confidence || 0;
      totalConfidence += conf;
      if (v.action === 'open_long' || v.action === 'buy')   longScore  += conf;
      if (v.action === 'open_short' || v.action === 'sell') shortScore += conf;
    });

    let verdict = 'wait';
    let finalConfidence = 0;

    if (totalConfidence > 0) {
      if (longScore > shortScore && longScore > totalConfidence * 0.5) {
        verdict = 'open_long';
        finalConfidence = Math.round((longScore / totalConfidence) * 100);
      } else if (shortScore > longScore && shortScore > totalConfidence * 0.5) {
        verdict = 'open_short';
        finalConfidence = Math.round((shortScore / totalConfidence) * 100);
      }
    }

    session.consensus = { verdict, confidence: finalConfidence, longScore, shortScore, totalVotes: session.votes.length };
    console.log(`[DebateService] Consensus: ${verdict} @ ${finalConfidence}% for ${session.symbol}`);
    this.emit('consensus', debateId, session.consensus);

    if (session.autoExecute && verdict !== 'wait' && finalConfidence >= 70) {
      this._executeTrade(session, verdict, finalConfidence);
    }
  }

  // --------------------------------------------------------------------------
  // Prompt Builders
  // --------------------------------------------------------------------------

  _buildTurnPrompt(session, participant, round) {
    const variantInstruction = PROMPT_VARIANTS[session.promptVariant] || PROMPT_VARIANTS.balanced;
    const history = session.messages
      .map((m) => `${m.participantName} (${m.role}) [${m.aiModel}]: ${m.content}`)
      .join('\n\n');

    return `${participant.prompt}
Style: ${variantInstruction}

**Market Context for ${session.symbol}:**
${session.marketContext || 'Market data unavailable.'}

**Debate History (Round ${round} of ${session.maxRounds}):**
${history || 'You are speaking first.'}

Provide your market perspective in under 120 words. Stay in character as ${participant.name}.`;
  }

  _buildVotePrompt(session, participant) {
    const history = session.messages
      .map((m) => `${m.participantName}: ${m.content}`)
      .join('\n\n');

    return `${participant.prompt}

The debate is over. Cast your final vote.

**Debate History:**
${history}

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "action": "open_long" | "open_short" | "wait",
  "confidence": <integer 0-100>,
  "leverage": <integer 1-10>,
  "stopLoss": <number or null>,
  "takeProfit": <number or null>,
  "reasoning": "<under 50 words>"
}`;
  }

  // --------------------------------------------------------------------------
  // Market context fetcher
  // --------------------------------------------------------------------------

  async _fetchContext(exchangeId, symbol) {
    try {
      return await indicatorService.analyzeMultiTimeframe(symbol, ['5m', '1h', '4h']);
    } catch {
      try {
        const klines = await exchangeManager.getOHLCV(exchangeId, symbol, '1h');
        return indicatorService.analyzeSymbol(klines, symbol);
      } catch (err) {
        console.warn(`[DebateService] Market data unavailable for ${symbol}:`, err.message);
        return { symbol, note: 'Market data could not be fetched. Use general market knowledge.' };
      }
    }
  }

  // --------------------------------------------------------------------------
  // Auto-execution
  // --------------------------------------------------------------------------

  async _executeTrade(session, verdict, confidence) {
    try {
      console.log(`[DebateService] AUTO-EXECUTING ${verdict} on ${session.symbol}`);
      const quantity = 0.001;
      const leverage = 5;
      if (verdict === 'open_long')  await exchangeManager.openLong(session.exchange, session.symbol, quantity, leverage);
      if (verdict === 'open_short') await exchangeManager.openShort(session.exchange, session.symbol, quantity, leverage);

      session.messages.push({
        id: `sys_${Date.now()}`,
        participantName: 'System',
        role: 'Executor',
        content: `✅ Auto-executed ${verdict} on ${session.symbol} (${confidence}% consensus).`,
        timestamp: Date.now(),
      });
      this.emit('update', session.id, session);
    } catch (e) {
      console.error(`[DebateService] Auto-execution failed:`, e.message);
    }
  }

  async executeConsensus(debateId) {
    const session = this.sessions.get(debateId);
    if (!session) throw new Error('Debate not found');
    if (!session.consensus) throw new Error('No consensus reached yet');
    return this._executeTrade(session, session.consensus.verdict, session.consensus.confidence);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  _updateStatus(id, status) {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
      this.emit('update', id, session);
    }
  }

  getDebate(id)       { return this.sessions.get(id); }
  getAllDebates()      { return Array.from(this.sessions.values()).sort((a, b) => b.createdAt - a.createdAt); }
}

// Singleton export
const debateManager = new DebateManager();
export default debateManager;
