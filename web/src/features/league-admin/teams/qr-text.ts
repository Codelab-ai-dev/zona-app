/** Accented letters and eñes that scanners may misread (same set as the original app). */
const PROBLEMATIC = /[áàäâéèëêíìïîóòöôúùüûñçý]/i

const REPLACEMENTS: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c', ý: 'y', ÿ: 'y',
}

export const hasProblematicChars = (text: string) => PROBLEMATIC.test(text)

/** Removes accents/eñes keeping case ("María Ñandú" -> "Maria Nandu"). */
export function normalizeForQR(text: string): string {
  return Array.from(text, (ch) => {
    const lower = REPLACEMENTS[ch.toLowerCase()]
    if (!lower) return ch
    return ch === ch.toLowerCase() ? lower : lower.toUpperCase()
  }).join('')
}
