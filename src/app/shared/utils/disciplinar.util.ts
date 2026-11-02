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

/** "Lucas Martins chegou a 3 ocorrências ativas. A Cartilha recomenda advertência escrita." */
export function textoRecomendacao(r: RegistroDisciplinarDTO): string {
  const nivel =
    r.nivel === NivelDisciplinar.UNIFORME ? 'ocorrências de uniforme' : NIVEIS_DISCIPLINARES[r.nivel].plural.toLowerCase();
  const acao = r.consequencia ? ACAO_RECOMENDADA[r.consequencia] : '';
  return `${r.nomeAssistido} chegou a ${r.sequencia} ${nivel} ativas. A Cartilha recomenda ${acao}.`;
}

/** Contadores que a busca de atendidos já traz (registros ativos por nível). */
export interface ContadoresDisciplinares {
  totalOcorrenciasAtivas?: number | null;
  totalAdvertenciasAtivas?: number | null;
  totalSuspensoes?: number | null;
}

/** A cada quantos registros ativos do nível a Cartilha recomenda o próximo passo (LIMITE_PROGRESSAO no back). */
const NIVEL_LIMITE = 3;

/** Consequência que a 3ª de cada nível recomenda (espelha NivelDisciplinar.consequencia no back). */
const CONSEQUENCIA_DO_NIVEL: Record<NivelDisciplinar, ConsequenciaDisciplinar> = {
  [NivelDisciplinar.OCORRENCIA]: 'RECOMENDA_ADVERTENCIA',
  [NivelDisciplinar.ADVERTENCIA]: 'RECOMENDA_SUSPENSAO',
  [NivelDisciplinar.SUSPENSAO]: 'PERDE_PROXIMO_PASSEIO',
  [NivelDisciplinar.UNIFORME]: 'RETORNO_COM_RESPONSAVEL',
};

export interface PreviaRegistro {
  /** Qual será (3 → "3ª"), ou null quando a busca não traz o contador do nível (uniforme). */
  sequencia: number | null;
  /** O que a Cartilha recomenda se este registro completar 3, ou null. */
  recomendacao: string | null;
}

/** Prévia do registro antes de salvar — o número oficial continua vindo do back. */
export function previaRegistro(nivel: NivelDisciplinar, atendido: ContadoresDisciplinares): PreviaRegistro {
  const ativos =
    nivel === NivelDisciplinar.OCORRENCIA
      ? atendido.totalOcorrenciasAtivas
      : nivel === NivelDisciplinar.ADVERTENCIA
        ? atendido.totalAdvertenciasAtivas
        : nivel === NivelDisciplinar.SUSPENSAO
          ? atendido.totalSuspensoes
          : null;
  if (ativos == null) return { sequencia: null, recomendacao: null };
  const sequencia = ativos + 1;
  const completaTres = sequencia % NIVEL_LIMITE === 0;
  return { sequencia, recomendacao: completaTres ? ACAO_RECOMENDADA[CONSEQUENCIA_DO_NIVEL[nivel]] : null };
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

/** FT-25: tem documento para imprimir — os que vão para assinatura e o comunicado de ocorrência. */
export function temDocumento(r: Pick<RegistroDisciplinarDTO, 'documentoStatus' | 'nivel'>): boolean {
  return r.documentoStatus !== null || r.nivel === NivelDisciplinar.OCORRENCIA;
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
