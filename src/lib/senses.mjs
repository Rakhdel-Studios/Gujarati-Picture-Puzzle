/**
 * The pipeline's `definition` is a full dictionary gloss, not a sentence:
 * a comma-separated run of senses, 11 to 508 characters, up to 27 senses.
 * Dumped raw it is an unreadable wall at 24px type.
 *
 * Split it back into the senses it already is, so the page can render a proper
 * dictionary entry. Commas inside parentheses are NOT separators —
 * "ધાર્મિક સંપ્રદાય (નો મઠ, વગેરે)" is one sense, not two.
 */
export function senses(definition) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of definition) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/[.।]+$/, '').trim()).filter(Boolean);
}
