export type AgentStyle = { id: string; name: string; description: string; reasoningStyle: string; provider?: 'xai' };

export const AGENT_STYLES: readonly AgentStyle[] = [
  { id: 'macro', name: 'Macro Analyst Agent', description: 'Broader economic and market context.', reasoningStyle: 'Evaluate broad market context. Explicitly acknowledge economic data missing from the snapshot.' },
  { id: 'technical', name: 'Technical Signal Agent', description: 'Price action, momentum, and volatility.', reasoningStyle: 'Evaluate price action, momentum and volatility. Do not invent chart history or indicators absent from the snapshot.' },
  { id: 'contrarian', name: 'Contrarian Risk Agent', description: 'Contradictory evidence and failure cases.', reasoningStyle: 'Stress-test the market thesis and focus on contradictory evidence, uncertainty and failure cases.' },
  // A second, independent model family (xAI) so its forecasts can be compared with ours.
  { id: 'grok', name: 'Grok Agent (xAI)', description: 'Independent forecast from xAI Grok.', reasoningStyle: 'Give your own independent, calibrated forecast. Weigh evidence for and against equally.', provider: 'xai' },
];

/** Agents that can run now. Grok only joins when an xAI key is configured. */
export function activeAgentStyles(): readonly AgentStyle[] {
  return AGENT_STYLES.filter((style) => style.provider !== 'xai' || Boolean(process.env.XAI_API_KEY));
}

/** How many signals make a market's coverage complete. */
export function expectedSignalCount(): number {
  return activeAgentStyles().length;
}
