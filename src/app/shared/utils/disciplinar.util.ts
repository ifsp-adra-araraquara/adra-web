import { NIVEIS_DISCIPLINARES, NivelDisciplinar } from '../enum/NivelDisciplinar';
import { RegistroDisciplinarDTO } from '../models/disciplinar/Disciplinar';

/** "3ª ocorrência", "1ª advertência", "2ª ocorrência de uniforme". */
export function rotuloSequencia(r: Pick<RegistroDisciplinarDTO, 'sequencia' | 'nivel'>): string {
  if (r.nivel === NivelDisciplinar.UNIFORME) return `${r.sequencia}ª ocorrência de uniforme`;
  return `${r.sequencia}ª ${NIVEIS_DISCIPLINARES[r.nivel].rotulo.toLowerCase()}`;
}

/** yyyy-MM-dd → dd/MM/yyyy, sem passar por Date (evita erro de fuso). */
export function dataBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** Texto curto do que o registro ainda espera, ou null. Ordem: o mais urgente primeiro. */
export function pendenciaDoRegistro(r: RegistroDisciplinarDTO): string | null {
  if (r.arquivado) return null;
  if (r.consequenciaPendente && r.consequencia === 'RETORNO_COM_RESPONSAVEL') return 'Retorno com responsável';
  if (r.consequenciaPendente && r.consequencia === 'PERDE_PROXIMO_PASSEIO') return 'Perde o próximo passeio';
  if (r.documentoStatus === 'PENDENTE_ASSINATURA') return 'Documento a assinar';
  return null;
}
