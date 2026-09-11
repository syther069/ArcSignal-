export type ModelVersionSource = 'provider-version' | 'provider-model-id';

export interface ModelIdentity {
  modelName: string;
  modelVersion: string | null;
  modelVersionSource?: ModelVersionSource;
  systemFingerprint?: string | null;
  providerResponseId?: string | null;
}

const nonempty = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

// Read transport metadata, never a version invented inside the generated analysis.
// Groq's model ID identifies its served model; its system_fingerprint describes
// backend configuration, not a guaranteed weight revision. Keep those distinct.
export function providerModelIdentity(model: string, response: {
  modelVersion?: unknown; model_version?: unknown; system_fingerprint?: unknown;
  id?: unknown; responseId?: unknown;
}): ModelIdentity {
  const version = nonempty(response.modelVersion) ?? nonempty(response.model_version);
  return {
    modelName: model, modelVersion: version ?? model,
    modelVersionSource: version ? 'provider-version' : 'provider-model-id',
    systemFingerprint: nonempty(response.system_fingerprint),
    providerResponseId: nonempty(response.responseId) ?? nonempty(response.id),
  };
}

export function modelVersionLabel(model: ModelIdentity): string {
  if (model.modelVersion && model.modelVersionSource !== 'provider-model-id') return `Model version: ${model.modelVersion}`;
  return `Provider model ID: ${model.modelVersion ?? model.modelName}`;
}

export function modelVersionExplanation(model: ModelIdentity): string | null {
  if (!model.modelVersion) return 'Historical record: no separate model revision was captured. The recorded provider model ID is shown; this is a real prediction.';
  return model.modelVersionSource === 'provider-model-id'
    ? 'The provider returned a model ID without a separate weight revision. A serving fingerprint, when available, identifies backend configuration.' : null;
}
