export declare const OPENAI_COMPATIBLE_ENDPOINTS: Record<string, string>;

export interface OpenAICompatibleLocalEndpoint {
  variable: string;
  fallback: string;
}

export declare const OPENAI_COMPATIBLE_LOCAL_ENDPOINTS: Record<
  string,
  OpenAICompatibleLocalEndpoint
>;

export declare const OPENAI_COMPATIBLE_ALIASES: string[];

export interface ResolveEndpointOptions {
  env?: Record<string, string | undefined>;
  override?: string;
}

export declare function resolveOpenAICompatibleEndpoint(
  providerId: string,
  options?: ResolveEndpointOptions,
): string | undefined;

/** The vendor named inside a model id, or `null` when the id names none. */
export declare function resolveOpenAICompatibleAlias(
  modelId?: string,
): string | null;
