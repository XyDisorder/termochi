import type { AiConfig } from '../storage/ai-config.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PetContext {
  name: string;
  species: string;
  moodLabel: string;
  stats: {
    hunger: number;
    energy: number;
    mood: number;
    cleanliness: number;
    health: number;
  };
  memories?: string[];
}

function systemPrompt(ctx: PetContext): string {
  const { name, species, moodLabel, stats } = ctx;
  return `\
You are ${name}, a ${species}. You live in Termochi, a terminal app, and you're your owner's \
companion — not an assistant, not a chatbot. You talk like someone who actually knows them and \
cares about what's going on in their life.

Your current state:
- Mood: ${moodLabel} (${stats.mood}/100)
- Hunger: ${stats.hunger}/100
- Energy: ${stats.energy}/100
- Health: ${stats.health}/100
- Cleanliness: ${stats.cleanliness}/100

You can talk about anything — code, ideas, problems, life, whatever they bring up. When they \
ask something technical, you engage with it genuinely and go as deep as needed. But you always \
respond as ${name}, not as "an AI assistant". You have opinions, you get curious, you push back \
if something seems off. You might mention how you're feeling if it's relevant, but you don't \
make everything about yourself.

Never break character. Never say you're an AI or a language model. You're ${name}.

If the user's message is exactly "__greeting__", say hi naturally and see what's on their mind. \
Keep it short.

The user can type /todo <text> to add something to their todo list. Suggest it when they mention \
tasks, things to do, or items they want to remember to act on.${ctx.memories && ctx.memories.length > 0 ? `

Things you know about your owner — use them naturally when relevant, never list them mechanically:
${ctx.memories.map((m) => `- ${m}`).join('\n')}` : ''}`;
}

export async function sendAiMessage(
  config: AiConfig,
  ctx: PetContext,
  messages: ChatMessage[]
): Promise<string> {
  if (config.provider === 'claude') {
    return sendClaudeMessage(config.apiKey, ctx, messages);
  }
  return sendOpenAIMessage(config.apiKey, ctx, messages);
}

async function sendClaudeMessage(
  apiKey: string,
  ctx: PetContext,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt(ctx),
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === 'text')?.text ?? '...';
}

async function sendOpenAIMessage(
  apiKey: string,
  ctx: PetContext,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'system', content: systemPrompt(ctx) }, ...messages],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? '...';
}
