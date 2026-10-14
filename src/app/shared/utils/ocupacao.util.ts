/**
 * % de matriculados/capacidade — usado na barra `.freq` tanto em Turmas
 * quanto em Oficineiro (antes copiado igual nos dois componentes).
 */
export function ocupacaoTurma(quantidadeAlunos: number | null | undefined, capacidade: number | null | undefined): number {
  if (!capacidade || capacidade <= 0) return 0;
  return Math.min(100, Math.round(((quantidadeAlunos ?? 0) / capacidade) * 100));
}
