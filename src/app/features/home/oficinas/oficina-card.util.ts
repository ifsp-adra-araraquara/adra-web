import { DiaSemana, HorarioOficina } from '../../../shared/models/oficina/OficinaResumoDTO';
const DIA_CURTO: Record<DiaSemana, string> = {
  MONDAY: 'Seg',
  TUESDAY: 'Ter',
  WEDNESDAY: 'Qua',
  THURSDAY: 'Qui',
  FRIDAY: 'Sex',
  SATURDAY: 'Sáb',
  SUNDAY: 'Dom',
};

/**
 * Cor da faixa no topo do card: 12 matizes distintos (um só verde, o da
 * marca), em ordem que alterna quente/frio para ids vizinhos contrastarem.
 * A cor sai do id, então é fixa por oficina; só repete quando dois ids
 * diferem em múltiplo de 12 (ex.: 1 e 13).
 */
const CORES_OFICINA = [
  '#087A63', // verde (marca)
  '#378ADD', // azul
  '#D85A30', // coral
  '#7F5AC7', // roxo
  '#BA7517', // âmbar
  '#2A9DB5', // ciano
  '#C2407A', // magenta
  '#5B7F1E', // oliva
  '#3F51B5', // índigo
  '#952236', // vinho
  '#8D6E63', // marrom
  '#546E7A', // ardósia
];

export function corDaOficina(oficinaId: number): string {
  return CORES_OFICINA[(oficinaId - 1 + CORES_OFICINA.length) % CORES_OFICINA.length];
}

/** "14h", "9h30". */
export function horaCurta(inicio: string | null): string {
  if (!inicio) return '';
  const [h, m] = inicio.split(':').map(Number);
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** "Seg, Qua e Sex · 14h" — dias já vêm ordenados da API. */
export function textoHorario(h: HorarioOficina): string {
  const dias = h.dias.map((d) => DIA_CURTO[d]);
  const listaDias = dias.length > 1 ? `${dias.slice(0, -1).join(', ')} e ${dias.at(-1)}` : (dias[0] ?? '');
  const hora = horaCurta(h.inicio);
  return [listaDias, hora].filter(Boolean).join(' · ');
}
