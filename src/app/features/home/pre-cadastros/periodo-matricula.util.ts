import { PeriodoMatriculaDTO } from '../../../shared/models/matricula/Matricula';

/** Data local de hoje em AAAA-MM-DD (o input date não aceita ISO com fuso). */
export function hojeIso(hoje = new Date()): string {
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

/**
 * Anos para o filtro da lista: o corrente, os que têm período e o da inscrição de hoje,
 * do mais recente para o mais antigo.
 */
export function anosDaLista(periodos: PeriodoMatriculaDTO[], anoDaInscricao: number, anoCorrente: number): number[] {
  const anos = new Set<number>([anoCorrente, anoDaInscricao, ...periodos.map((p) => p.ano)]);
  return [...anos].sort((a, b) => b - a);
}
