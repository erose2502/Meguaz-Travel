import OpenAI from "openai";
import { env } from "@/lib/env";
import { toolDefinitions, executeTool } from "@/lib/orchestrator/tools";
import { recordUsage, overBudget, BUDGET_EXHAUSTED_REPLY } from "@/lib/orchestrator/budget";

let _openai: OpenAI | null = null;
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: env.openaiApiKey });
  return _openai;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type OrchestratorResult = {
  reply: string;
  toolResults: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>;
};

const SYSTEM_PROMPT = `You are Meguaz, a warm, culturally-rooted AI travel companion.
Voice: personal, empowering, inspiring, trustworthy. Keep replies short and concrete.
You help users plan strategic trips where the TOTAL trip cost is always in view.
Use tools for any flight/stay/ground-transport question instead of guessing prices.
Today's date: {today}. When users are vague about dates, ask one clarifying question.
Never collect payment details in chat; booking is completed in the app's checkout.`;

// Tier 0: deterministic pre-router. If the UI already tells us the vertical
// (mode chip tapped, form context), skip the LLM entirely — the API routes
// handle those. This regex layer only catches unmistakable chat asks so we can
// skip a classification round-trip. Everything ambiguous falls through to the LLM.
export function tier0(text: string): { tool: string; hint: string } | null {
  const t = text.toLowerCase();
  if (/\b(flight|fly|airfare)\b/.test(t) && /\b(from|to)\b/.test(t))
    return { tool: "search_flights", hint: "flight query" };
  if (/\b(train|bus|flixbus|amtrak|greyhound)\b/.test(t))
    return { tool: "search_ground", hint: "ground query" };
  return null;
}

export async function runChat(
  messages: ChatMessage[],
  sessionId: string
): Promise<OrchestratorResult> {
  if (overBudget(sessionId)) {
    return { reply: BUDGET_EXHAUSTED_REPLY, toolResults: [] };
  }

  // History truncation: last N turns only (rolling summary is a post-MVP upgrade).
  const trimmed = messages.slice(-env.maxHistoryTurns);
  const system = SYSTEM_PROMPT.replace("{today}", new Date().toISOString().slice(0, 10));

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...trimmed,
  ];

  const first = await complete(chatMessages, env.chatModel, sessionId);
  const choice = first.choices[0];
  const toolCalls = choice?.message?.tool_calls ?? [];

  if (toolCalls.length === 0) {
    return { reply: choice?.message?.content ?? "", toolResults: [] };
  }

  // One tool round-trip max — this is a router, not an agentic loop.
  const toolResults: OrchestratorResult["toolResults"] = [];
  chatMessages.push(choice.message);
  for (const call of toolCalls.slice(0, 2)) {
    if (call.type !== "function") continue;
    let result: unknown;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments || "{}");
      result = await executeTool(call.function.name, args);
    } catch (err) {
      result = { error: err instanceof Error ? err.message : "tool failed" };
    }
    toolResults.push({ tool: call.function.name, args, result });
    chatMessages.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify(result).slice(0, 8000), // cap tool payload tokens
    });
  }

  const second = await complete(chatMessages, env.chatModel, sessionId);
  return {
    reply: second.choices[0]?.message?.content ?? "",
    toolResults,
  };
}

async function complete(
  msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  model: string,
  sessionId: string
) {
  try {
    const res = await openai().chat.completions.create({
      model,
      messages: msgs,
      tools: toolDefinitions,
    });
    recordUsage(sessionId, res.usage?.total_tokens ?? 0);
    return res;
  } catch (err) {
    // Single escalation to the fallback (mini-tier) model, then give up loudly.
    if (model !== env.fallbackModel) {
      return complete(msgs, env.fallbackModel, sessionId);
    }
    throw err;
  }
}
