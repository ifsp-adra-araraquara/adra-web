import { nomesDosDias, ordenarDias } from './dia-semana.util';

describe('dia-semana.util', () => {
  it('escreve os dias por extenso, na ordem da semana', () => {
    expect(nomesDosDias(['WEDNESDAY', 'MONDAY', 'TUESDAY'])).toBe('Segunda, Terça e Quarta');
    expect(nomesDosDias(['FRIDAY'])).toBe('Sexta');
    expect(nomesDosDias([])).toBe('');
  });

  it('ordena os dias pela semana', () => {
    expect(ordenarDias(['FRIDAY', 'MONDAY', 'WEDNESDAY'])).toEqual(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
  });
});
