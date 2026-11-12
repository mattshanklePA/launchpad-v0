// Bracketed placeholders left in drafted text (issue #268).
//
// The assistant's scaffold deliberately writes `[BRACKETED PLACEHOLDERS]` for
// facts the submitter hasn't given (app/actions.ts). They are meant to be
// replaced; one that reaches a submitted record reads as unfinished.
//
// Pattern matched: a square-bracketed run that contains NO lowercase letters
// and at least two consecutive capital letters, and no nested brackets.
//   matches:  [NUMBER]   [QUANTIFY HOURS...]   [HOURS/WEEK]   [BUDGET $]
//   ignores:  [1]   [optional]   [Quantify later]   [A]   [0]
// Two capitals is the floor so a single-letter or numeric marker is never
// mistaken for a placeholder. A real acronym in brackets, e.g. "[NIST]",
// does match — the submitter is told to reword it.
const PLACEHOLDER = /\[[^\][a-z]*[A-Z]{2}[^\][a-z]*\]/g

/** Every bracketed-capitals placeholder in `text`, in order. */
export function findPlaceholders(text: string | undefined | null): string[] {
  if (!text) return []
  return text.match(PLACEHOLDER) ?? []
}
