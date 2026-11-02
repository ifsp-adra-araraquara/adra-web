const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Nome curto para cartões pequenos: primeiro nome + inicial do último
 * ("Lucas Martins" → "Lucas M."). Nome composto curto fica inteiro
 * ("Ana Clara Ribeiro" → "Ana Clara R.").
 */
export function nomeCurto(nomeCompleto: string): string {
  const partes = nomeCompleto
    .trim()
    .split(/\s+/)
    .filter((p) => p && !PARTICULAS.has(p.toLowerCase()));
  if (partes.length <= 1) return partes[0] ?? '';
  const ultimaInicial = `${partes[partes.length - 1][0].toUpperCase()}.`;
  const composto = `${partes[0]} ${partes[1]}`;
  const usaComposto = partes.length >= 3 && composto.length <= 11;
  return `${usaComposto ? composto : partes[0]} ${ultimaInicial}`;
}
