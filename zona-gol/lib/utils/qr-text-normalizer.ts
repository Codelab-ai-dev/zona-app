/**
 * Utilidad para normalizar texto en códigos QR
 * Soluciona problemas con caracteres especiales (ñ, acentos, etc.)
 */

/**
 * Normaliza texto para QR codes removiendo acentos y caracteres especiales
 * pero manteniendo la legibilidad
 */
export function normalizeForQR(text: string): string {
  if (!text) return ''

  // Mapa de reemplazos para caracteres especiales comunes en español
  const replacements: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A',
    'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E',
    'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I',
    'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O',
    'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U',
    'ñ': 'n', 'Ñ': 'N',
    'ç': 'c', 'Ç': 'C',
    'ý': 'y', 'ÿ': 'y', 'Ý': 'Y',
  }

  let normalized = text

  // Reemplazar cada carácter especial
  for (const [original, replacement] of Object.entries(replacements)) {
    normalized = normalized.replace(new RegExp(original, 'g'), replacement)
  }

  return normalized
}

/**
 * Normaliza un objeto completo para QR, aplicando normalización
 * solo a campos de texto específicos
 */
export function normalizeQRData<T extends Record<string, any>>(
  data: T,
  fieldsToNormalize: (keyof T)[] = ['player_name', 'playerName', 'name']
): T {
  const normalized = { ...data }

  for (const field of fieldsToNormalize) {
    if (typeof normalized[field] === 'string') {
      normalized[field] = normalizeForQR(normalized[field] as string) as any
    }
  }

  return normalized
}

/**
 * Valida si un texto contiene caracteres problemáticos para QR
 */
export function hasProblematicChars(text: string): boolean {
  const problematicChars = /[áàäâéèëêíìïîóòöôúùüûñçý]/i
  return problematicChars.test(text)
}

/**
 * Obtiene un resumen de los caracteres problemáticos encontrados
 */
export function getProblematicChars(text: string): string[] {
  const problematicCharsRegex = /[áàäâéèëêíìïîóòöôúùüûñçý]/gi
  const matches = text.match(problematicCharsRegex)
  return matches ? Array.from(new Set(matches)) : []
}
