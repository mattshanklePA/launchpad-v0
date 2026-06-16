/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

import type { ModelProvider } from "@/lib/ports/model"
import { anthropicModelProvider } from "@/lib/adapters/default/anthropicProvider"

/**
 * Resolve the active model provider.
 *
 * Today this returns the default Anthropic provider. To support an agency's
 * approved endpoint, branch here on config/env and return a different
 * ModelProvider implementation. This is the single swap point; core code calls
 * `getModel()` and never references a concrete provider. See docs/BOUNDARY.md.
 */
export function getModelProvider(): ModelProvider {
  return anthropicModelProvider()
}

/** The model instance for `generateObject({ model: getModel() })`. */
export function getModel() {
  return getModelProvider().model
}

/** The active model id, for logging and inventory reporting. */
export function getModelId(): string {
  return getModelProvider().id
}
