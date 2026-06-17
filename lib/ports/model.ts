/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

/**
 * ModelProvider port.
 *
 * Supplies the structured-output model used by the AI SDK's `generateObject`.
 * The default implementation is the Anthropic provider; an agency can swap in
 * an approved endpoint (AWS Bedrock, Azure OpenAI Government, on-prem) by
 * providing another implementation of this interface. See docs/BOUNDARY.md.
 */
export interface ModelProvider {
  /** The model instance passed to `generateObject({ model })`. */
  model: ReturnType<typeof import("@ai-sdk/anthropic").anthropic>
  /** Identifier for logging and AI use-case inventory reporting. */
  id: string
}
