export const AI_NOT_CONFIGURED_MESSAGE = "AI features are not configured yet";

export const isAIConfigured = () =>
  Boolean(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant"));
