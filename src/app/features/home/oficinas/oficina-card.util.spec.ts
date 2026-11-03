import { corDaOficina, textoHorario } from './oficina-card.util';

describe('oficina-card.util', () => {
  it('junta os dias com vírgula e "e"', () => {
    expect(textoHorario({ dias: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], turmas: 1 })).toBe('Seg, Qua e Sex');
    expect(textoHorario({ dias: ['SATURDAY', 'SUNDAY'], turmas: 1 })).toBe('Sáb e Dom');
    expect(textoHorario({ dias: ['TUESDAY'], turmas: 1 })).toBe('Ter');
  });

  it('dá a mesma cor para a mesma oficina e não repete nas 12 primeiras', () => {
    expect(corDaOficina(3)).toBe(corDaOficina(3));
    const cores = Array.from({ length: 12 }, (_, i) => corDaOficina(i + 1));
    expect(new Set(cores).size).toBe(12);
    expect(corDaOficina(13)).toBe(corDaOficina(1));
  });
});
