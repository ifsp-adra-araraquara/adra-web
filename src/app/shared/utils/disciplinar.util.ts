import { NIVEIS_DISCIPLINARES, NivelDisciplinar } from '../enum/NivelDisciplinar';
import {
  ConsequenciaDisciplinar,
  RegistroDisciplinarDTO,
  ResumoDisciplinarDTO,
} from '../models/disciplinar/Disciplinar';

/** "3ª ocorrência", "1ª advertência", "2ª ocorrência de uniforme". */
export function rotuloSequencia(r: Pick<RegistroDisciplinarDTO, 'sequencia' | 'nivel'>): string {
  if (r.nivel === NivelDisciplinar.UNIFORME) return `${r.sequencia}ª ocorrência de uniforme`;
  return `${r.sequencia}ª ${NIVEIS_DISCIPLINARES[r.nivel].rotulo.toLowerCase()}`;
}

/** O que a Cartilha recomenda ao chegar a 3 do nível (FT-22). */
export const ACAO_RECOMENDADA: Record<ConsequenciaDisciplinar, string> = {
  RECOMENDA_ADVERTENCIA: 'advertência escrita',
  RECOMENDA_SUSPENSAO: 'suspensão de 3 dias',
  PERDE_PROXIMO_PASSEIO: 'perder o próximo passeio',
  RETORNO_COM_RESPONSAVEL: 'retorno acompanhado do responsável',
};

/** Nível que o Coordenador gera pela recomendação, ou null quando não há registro a gerar. */
export function nivelRecomendado(consequencia: ConsequenciaDisciplinar | null): NivelDisciplinar | null {
  if (consequencia === 'RECOMENDA_ADVERTENCIA') return NivelDisciplinar.ADVERTENCIA;
  if (consequencia === 'RECOMENDA_SUSPENSAO') return NivelDisciplinar.SUSPENSAO;
  return null;
}

/** yyyy-MM-dd + n dias, sem passar por fuso. */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(a, m - 1, d + dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
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
  if (r.consequenciaPendente && r.consequencia === 'RECOMENDA_SUSPENSAO') return 'Recomenda suspensão';
  if (r.consequenciaPendente && r.consequencia === 'RECOMENDA_ADVERTENCIA') return 'Recomenda advertência';
  if (r.consequenciaPendente && r.consequencia === 'RETORNO_COM_RESPONSAVEL') return 'Retorno com responsável';
  if (r.consequenciaPendente && r.consequencia === 'PERDE_PROXIMO_PASSEIO') return 'Perde o próximo passeio';
  if (r.documentoStatus === 'PENDENTE_ASSINATURA') return 'Documento a assinar';
  return null;
}

/** Registros ativos de um nível, lidos do resumo da ficha. */
export function ativosDoNivel(resumo: ResumoDisciplinarDTO, nivel: NivelDisciplinar): number {
  switch (nivel) {
    case NivelDisciplinar.OCORRENCIA:
      return resumo.ocorrenciasAtivas;
    case NivelDisciplinar.ADVERTENCIA:
      return resumo.advertenciasAtivas;
    case NivelDisciplinar.SUSPENSAO:
      return resumo.suspensoesAtivas;
    case NivelDisciplinar.UNIFORME:
      return resumo.uniformeAtivas;
  }
}

/** "4 ocorrências e 1 advertência" — os ativos de um nível ou, sem nível, de todos. */
export function descreverQuantidades(resumo: ResumoDisciplinarDTO, nivel: NivelDisciplinar | null): string {
  const niveis = nivel ? [nivel] : (Object.values(NivelDisciplinar) as NivelDisciplinar[]);
  const partes = niveis
    .map((n) => ({ n, quantidade: ativosDoNivel(resumo, n) }))
    .filter((p) => p.quantidade > 0)
    .map(({ n, quantidade }) => {
      if (n === NivelDisciplinar.UNIFORME) return `${quantidade} de uniforme`;
      const info = NIVEIS_DISCIPLINARES[n];
      return `${quantidade} ${(quantidade === 1 ? info.rotulo : info.plural).toLowerCase()}`;
    });
  if (partes.length <= 1) return partes[0] ?? 'nenhum registro ativo';
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}
