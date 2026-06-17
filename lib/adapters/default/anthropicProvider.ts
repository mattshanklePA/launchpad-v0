/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Default adapter; not for redistribution.
 */

import { anthropic } from "@ai-sdk/anthropic"
import type { ModelProvider } from "@/lib/ports/model"

/**
 * Default model id. Overridable by env without code changes; falls back to the
 * model LaunchPad has been using.
 */
const DEFAULT_MODEL_ID = process.env.LAUNCHPAD_MODEL_ID ?? "claude-sonnet-4-5-20250929"

/** Default ModelProvider: Anthropic via the Vercel AI SDK. */
export function anthropicModelProvider(): ModelProvider {
  return { model: anthropic(DEFAULT_MODEL_ID), id: DEFAULT_MODEL_ID }
}
