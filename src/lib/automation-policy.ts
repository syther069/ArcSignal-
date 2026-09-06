export function isMarketAutomationEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}
