import { NIVEIS_DISCIPLINARES, NivelDisciplinar } from '../enum/NivelDisciplinar';
import { RegistroDisciplinarDTO, ResumoDisciplinarDTO } from '../models/disciplinar/Disciplinar';

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
