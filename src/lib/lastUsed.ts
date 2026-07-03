// « Dernier choix utilisé » et fréquence locale d'usage des options.
// Stockage localStorage — accélère la saisie, jamais bloquant.

const LAST_PREFIX = "releve-last:";
const FREQ_PREFIX = "releve-freq:";

function safeGet(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // stockage plein ou indisponible : le confort est perdu, pas les données
  }
}

export function getLast(fieldId: string): string | undefined {
  return safeGet(LAST_PREFIX + fieldId) ?? undefined;
}

export function setLast(fieldId: string, value: string): void {
  safeSet(LAST_PREFIX + fieldId, value);
}

/** incrémente le compteur d'usage d'une option d'une liste */
export function bumpOption(fieldId: string, option: string): void {
  const raw = safeGet(FREQ_PREFIX + fieldId);
  let map: Record<string, number> = {};
  if (raw) {
    try {
      map = JSON.parse(raw) as Record<string, number>;
    } catch {
      map = {};
    }
  }
  map[option] = (map[option] ?? 0) + 1;
  safeSet(FREQ_PREFIX + fieldId, JSON.stringify(map));
}

/**
 * Options à proposer en chips rapides : usage local décroissant, complété par
 * les options marquées « fréquentes » dans le schéma, puis le début de liste.
 */
export function topOptions(
  fieldId: string,
  options: string[],
  frequentMarked: string[] | undefined,
  n = 8
): string[] {
  const raw = safeGet(FREQ_PREFIX + fieldId);
  let counts: Record<string, number> = {};
  if (raw) {
    try {
      counts = JSON.parse(raw) as Record<string, number>;
    } catch {
      counts = {};
    }
  }
  const byUsage = options
    .filter((o) => (counts[o] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  const result: string[] = [];
  for (const src of [byUsage, frequentMarked ?? [], options]) {
    for (const o of src) {
      if (result.length >= n) return result;
      if (!result.includes(o) && options.includes(o)) result.push(o);
    }
  }
  return result;
}
