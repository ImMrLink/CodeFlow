// Deterministic metrics comparing the raw transcript to the cleaned-up text,
// used for the Insights "fixes made" card. All local, no network.

const FILLERS = [
  'um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah', 'hmm',
  'like', 'basically', 'actually', 'literally', 'honestly',
  'you know', 'i mean', 'sort of', 'kind of'
]

const words = (t: string): string[] =>
  t.toLowerCase().replace(/[.,!?;:"']/g, '').split(/\s+/).filter(Boolean)

export function countFillers(text: string): number {
  const lower = ` ${text.toLowerCase().replace(/[.,!?;:"']/g, ' ').replace(/\s+/g, ' ')} `
  let n = 0
  for (const f of FILLERS) {
    const re = new RegExp(`\\s${f.replace(/ /g, '\\s')}\\s`, 'g')
    const m = lower.match(re)
    if (m) n += m.length
  }
  return n
}

/** Word-level Levenshtein distance — a proxy for how many edits cleanup made. */
export function wordEditCount(a: string, b: string): number {
  const x = words(a)
  const y = words(b)
  if (x.length === 0) return y.length
  if (y.length === 0) return x.length
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i)
  for (let i = 1; i <= x.length; i++) {
    const cur = [i]
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[y.length]
}

/** Fixes cleanup made between the input text and the final text. */
export function computeFixes(before: string, after: string): { fixes: number; fillersRemoved: number } {
  const fillersRemoved = Math.max(0, countFillers(before) - countFillers(after))
  const fixes = wordEditCount(before, after)
  return { fixes, fillersRemoved }
}
