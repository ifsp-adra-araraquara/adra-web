import { Role } from '../enum/role.enum';
import { MotivoFalta } from '../enum/MotivoFalta';
import { StatusPresenca } from '../enum/StatusPresenca';
import { AutorizadoRetiradaDTO, PresencaHistoricoDTO, PresencaResponseDTO } from '../models/presenca/PresencaResponseDTO';

/**
 * Lógica de chamada compartilhada entre `AulaModal` (shared/components) e
 * `AulaCompleta` (a página "Ver aula completa"). Antes de existir este
 * arquivo, cada componente tinha sua própria cópia — e divergiam: a
 * rastreabilidade de autoria (US-68) só foi parar no modal, e a página
 * "completa" só liberava edição pra Sociopedagógico (Coordenador, que
 * também tem permissão, ficava travado lá por engano). Ver histórico do
 * PR que introduziu este arquivo pra mais contexto.
 */
export interface LinhaChamada {
  assistidoId: number;
  nomeCompleto: string;
  /** Termo do assistido: pode sair sozinho ao fim da atividade (selo na lista de presença). */
  podeIrEmboraSozinho?: boolean;
  dataNascimento?: string | null;
  statusPresenca: StatusPresenca | null;
  // só usados quando statusPresenca = FALTA_JUSTIFICADA (CA-65.2)
  motivoFalta: MotivoFalta | null;
  observacao: string;
  // US-68: rastreabilidade de quem lançou ou alterou a chamada
  criadoPorId: number | null;
  criadoPorNome: string | null;
  atualizadoPorId: number | null;
  atualizadoPorNome: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
  // Últimos dias do aluno na turma, mais recente primeiro (até 10) — vem
  // pronto do mesmo GET /api/chamadas/aula/{id} que já monta o roster, sem
  // request extra. Vazio em LinhaChamada que não vem desse endpoint.
  historicoRecente: PresencaHistoricoDTO[];
  /** Resumo de frequência (só no roster de GET /api/chamadas/aula/{id}). */
  frequenciaPercentual?: number | null;
  aulasRealizadas?: number | null;
  aulasPrevistas?: number | null;
  /** Quem pode buscar o aluno (vazio = ninguém marcado como autorizado). */
  autorizadosRetirada?: AutorizadoRetiradaDTO[];
}

/** A partir de quantas faltas seguidas o roster mostra o alerta de atenção. */
export const LIMIAR_FALTAS_CONSECUTIVAS = 3;

/** Quantos dias a faixa visual mostra (o histórico que vem da API tem mais, pra calcular o alerta mesmo sem mostrar tudo). */
export const DIAS_FAIXA_HISTORICO = 5;

export function linhaChamadaDePresenca(p: PresencaResponseDTO): LinhaChamada {
  return {
    assistidoId: p.assistidoId,
    nomeCompleto: p.nomeCompleto,
    podeIrEmboraSozinho: p.podeIrEmboraSozinho ?? false,
    dataNascimento: p.dataNascimento ?? null,
    statusPresenca: p.statusPresenca,
    motivoFalta: p.motivoFalta,
    observacao: p.observacao ?? '',
    criadoPorId: p.criadoPorId ?? null,
    criadoPorNome: p.criadoPorNome ?? null,
    atualizadoPorId: p.atualizadoPorId ?? null,
    atualizadoPorNome: p.atualizadoPorNome ?? null,
    criadoEm: p.criadoEm ?? null,
    atualizadoEm: p.atualizadoEm ?? null,
    historicoRecente: p.historicoRecente ?? [],
    frequenciaPercentual: p.frequenciaPercentual ?? null,
    aulasRealizadas: p.aulasRealizadas ?? null,
    aulasPrevistas: p.aulasPrevistas ?? null,
    autorizadosRetirada: p.autorizadosRetirada ?? [],
  };
}

/** Faltas (não justificadas) seguidas, olhando `historicoRecente` da mais recente pra trás. */
export function contarFaltasConsecutivas(historico: PresencaHistoricoDTO[]): number {
  let consecutivas = 0;
  for (const dia of historico) {
    if (dia.statusPresenca !== StatusPresenca.FALTA) break;
    consecutivas++;
  }
  return consecutivas;
}

export type OrdemNome = 'az' | 'za';

/** Ordem alfabética (ignora acento e caixa). `za` inverte. */
export function ordenarPorNome(alunos: LinhaChamada[], ordem: OrdemNome = 'az'): LinhaChamada[] {
  const sentido = ordem === 'za' ? -1 : 1;
  return [...alunos].sort(
    (a, b) => sentido * a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR', { sensitivity: 'base' }),
  );
}

/**
 * A partir de quantas faltas JUSTIFICADAS seguidas o roster avisa — ausência
 * longa (doença, viagem...) também pede acompanhamento, mesmo justificada.
 */
export const LIMIAR_JUSTIFICADAS_CONSECUTIVAS = 5;

/** Faltas justificadas seguidas, da aula mais recente pra trás. */
export function contarJustificadasConsecutivas(historico: PresencaHistoricoDTO[]): number {
  let consecutivas = 0;
  for (const dia of historico) {
    if (dia.statusPresenca !== StatusPresenca.FALTA_JUSTIFICADA) break;
    consecutivas++;
  }
  return consecutivas;
}

/** "Débora (mãe), Sueli (avó)" — quem pode buscar, para o cartão da chamada. */
export function rotuloAutorizados(autorizados: AutorizadoRetiradaDTO[] | undefined): string {
  return (autorizados ?? [])
    .map((a) => (a.parentesco ? `${a.nome}(${a.parentesco.toLowerCase()})` : a.nome))
    .join(', ');
}

export function marcarPresenca(
  alunos: LinhaChamada[],
  assistidoId: number,
  status: StatusPresenca,
): LinhaChamada[] {
  return alunos.map((a) => {
    if (a.assistidoId !== assistidoId) return a;
    // Trocar pra um status que não seja falta justificada limpa o
    // motivo/observação — não faz sentido carregar isso escondido.
    if (status !== StatusPresenca.FALTA_JUSTIFICADA) {
      return { ...a, statusPresenca: status, motivoFalta: null, observacao: '' };
    }
    return { ...a, statusPresenca: status };
  });
}

/** FT-06: cada toque no botão do aluno avança P → F → FJ → P (sem status conta como P). */
export function proximoStatusPresenca(atual: StatusPresenca | null): StatusPresenca {
  switch (atual) {
    case StatusPresenca.FALTA:
      return StatusPresenca.FALTA_JUSTIFICADA;
    case StatusPresenca.FALTA_JUSTIFICADA:
      return StatusPresenca.PRESENTE;
    default:
      return StatusPresenca.FALTA;
  }
}

export const SIGLA_PRESENCA: Record<StatusPresenca, string> = {
  [StatusPresenca.PRESENTE]: 'P',
  [StatusPresenca.FALTA]: 'F',
  [StatusPresenca.FALTA_JUSTIFICADA]: 'FJ',
};

export const ROTULO_PRESENCA: Record<StatusPresenca, string> = {
  [StatusPresenca.PRESENTE]: 'Presente',
  [StatusPresenca.FALTA]: 'Falta',
  [StatusPresenca.FALTA_JUSTIFICADA]: 'Falta justificada',
};

/** Busca da chamada: pelo nome, ignorando acento e caixa. */
export function filtrarPorNome(alunos: LinhaChamada[], termo: string): LinhaChamada[] {
  const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const busca = normalizar(termo.trim());
  if (!busca) return alunos;
  return alunos.filter((a) => normalizar(a.nomeCompleto).includes(busca));
}

export function marcarTodosPresentes(alunos: LinhaChamada[]): LinhaChamada[] {
  return alunos.map((a) => ({
    ...a,
    statusPresenca: StatusPresenca.PRESENTE,
    motivoFalta: null,
    observacao: '',
  }));
}

export function atualizarMotivoFalta(
  alunos: LinhaChamada[],
  assistidoId: number,
  motivo: MotivoFalta,
): LinhaChamada[] {
  return alunos.map((a) => (a.assistidoId === assistidoId ? { ...a, motivoFalta: motivo } : a));
}

export function atualizarObservacaoFalta(
  alunos: LinhaChamada[],
  assistidoId: number,
  observacao: string,
): LinhaChamada[] {
  return alunos.map((a) => (a.assistidoId === assistidoId ? { ...a, observacao } : a));
}

/**
 * Mesmas regras do backend (RegraNegocioException em
 * PresencaMapper.sincronizarFaltaJustificada — CA-65.2), checadas aqui só
 * pra dar um erro claro antes de bater na API. Retorna a mensagem de erro,
 * ou `null` se está tudo certo.
 */
export function validarChamada(alunos: LinhaChamada[]): string | null {
  if (alunos.some((a) => !a.statusPresenca)) {
    return 'Marque a presença de todos os alunos antes de salvar.';
  }

  const semMotivo = alunos.find(
    (a) => a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA && !a.motivoFalta,
  );
  if (semMotivo) {
    return `Informe o motivo da falta justificada de ${semMotivo.nomeCompleto}.`;
  }

  const outroSemObservacao = alunos.find(
    (a) =>
      a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA &&
      a.motivoFalta === MotivoFalta.OUTRO &&
      !a.observacao?.trim(),
  );
  if (outroSemObservacao) {
    return `Motivo "Outro" exige observação — preencha a de ${outroSemObservacao.nomeCompleto}.`;
  }

  return null;
}

/** US-67: quem tem acesso à edição/correção de chamada (lançar ou corrigir). */
export function podeEditarChamada(perfil: Role | null): boolean {
  return perfil === Role.SOCIO || perfil === Role.COORD;
}

/**
 * CA-65.3/US-67: sociopedagógico só realiza/corrige a chamada no dia da
 * aula; coordenador corrige chamada de qualquer data.
 */
export function podeCorrigirDataChamada(perfil: Role | null, aulaEhHoje: boolean): boolean {
  return perfil === Role.COORD || aulaEhHoje;
}

/**
 * Alunos que fazem aniversário no dia da aula, com a idade que completam.
 * Quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos.
 */
export function aniversariantesDoDia(
  alunos: LinhaChamada[],
  dataAula: string | null | undefined,
): { aluno: LinhaChamada; idade: number }[] {
  if (!dataAula) return [];
  const [ano, mes, dia] = dataAula.split('-').map(Number);
  const bissexto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  return alunos
    .filter((aluno) => {
      if (!aluno.dataNascimento) return false;
      const [, m, d] = aluno.dataNascimento.split('-').map(Number);
      if (m === mes && d === dia) return true;
      return m === 2 && d === 29 && mes === 2 && dia === 28 && !bissexto(ano);
    })
    .map((aluno) => ({ aluno, idade: ano - Number(aluno.dataNascimento!.slice(0, 4)) }));
}
