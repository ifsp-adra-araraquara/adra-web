/**
 * Situação "derivada" de uma aula, usada só no front para decidir se ela
 * pode ser aberta e como destacá-la nas tabelas/telas.
 *
 * Não existe uma coluna própria pra isso no banco — é calculada a partir
 * de `statusAula` (PLANEJADA / REALIZADA / CANCELADA, vindo da API) e da
 * data da aula (comparada com hoje). Ver `shared/utils/aula.util.ts`.
 */
export enum SituacaoAula {
  /** Data no futuro — ainda não pode ser aberta. */
  PENDENTE = 'PENDENTE',
  /** É hoje ou já passou, e a chamada/registro ainda não foi concluído. */
  DISPONIVEL = 'DISPONIVEL',
  /** Já foi concluída (statusAula = REALIZADA). */
  FINALIZADA = 'FINALIZADA',
  /** Aula cancelada. */
  CANCELADA = 'CANCELADA',
}
