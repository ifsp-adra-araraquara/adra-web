/** Dia da semana como o Java manda (`DayOfWeek`). */
export type DiaSemana = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const DIAS_SEMANA: { valor: DiaSemana; rotulo: string }[] = [
  { valor: 'MONDAY', rotulo: 'Segunda' },
  { valor: 'TUESDAY', rotulo: 'Terça' },
  { valor: 'WEDNESDAY', rotulo: 'Quarta' },
  { valor: 'THURSDAY', rotulo: 'Quinta' },
  { valor: 'FRIDAY', rotulo: 'Sexta' },
  { valor: 'SATURDAY', rotulo: 'Sábado' },
  { valor: 'SUNDAY', rotulo: 'Domingo' },
];
