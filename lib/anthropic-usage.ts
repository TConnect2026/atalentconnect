// Per-million-token rates in USD, from Anthropic's published pricing for
// the Claude 4 series. Update when models or pricing change.
//
// Cost formula:
//   cost_usd = (input_tokens × input_rate + output_tokens × output_rate) / 1_000_000
//
// Note: cache_creation / cache_read tokens use different rates and aren't
// priced here. None of the current routes use prompt caching.

const RATES_PER_M_TOKENS: Record<string, { input: number; output: number }> = {
  // Sonnet 4.x family
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  // Opus 4.x family
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-opus-4-6': { input: 15, output: 75 },
  // Haiku 4.x
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
}

interface UsageLike {
  input_tokens?: number
  output_tokens?: number
}

export function logAnthropicUsage(route: string, model: string, usage: UsageLike | undefined) {
  const inputTokens = usage?.input_tokens ?? 0
  const outputTokens = usage?.output_tokens ?? 0
  const rates = RATES_PER_M_TOKENS[model]
  const costUsd = rates
    ? (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
    : null
  console.log(
    `[anthropic-usage] route=${route} model=${model} input_tokens=${inputTokens} output_tokens=${outputTokens} cost_usd=${costUsd !== null ? costUsd.toFixed(6) : 'unknown_model'}`
  )
}
