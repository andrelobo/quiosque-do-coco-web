/**
 * Busca textual no cliente: ignora maiúsculas e acentos.
 * `cafe` encontra "Café", `pao` encontra "Pão de Queijo".
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesSearch(haystack: string | null | undefined, needle: string): boolean {
  const query = normalizeSearchText(needle)
  if (!query) return true
  return normalizeSearchText(haystack ?? '').includes(query)
}
