import { corDaOficina, horaCurta, textoHorario } from './oficina-card.util';

describe('oficina-card.util', () => {
  it('junta os dias com vírgula e "e", e a hora curta', () => {
    expect(textoHorario({ dias: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], inicio: '14:00:00', turmas: 1 })).toBe(
      'Seg, Qua e Sex · 14h',
    );
    expect(textoHorario({ dias: ['TUESDAY'], inicio: '09:30:00', turmas: 1 })).toBe('Ter · 9h30');
  });

  it('omite a parte que faltar', () => {
    expect(textoHorario({ dias: [], inicio: '16:00:00', turmas: 1 })).toBe('16h');
    expect(textoHorario({ dias: ['SATURDAY', 'SUNDAY'], inicio: null, turmas: 1 })).toBe('Sáb e Dom');
    expect(horaCurta(null)).toBe('');
  });

  it('dá a mesma cor para a mesma oficina e não repete nas 12 primeiras', () => {
    expect(corDaOficina(3)).toBe(corDaOficina(3));
    const cores = Array.from({ length: 12 }, (_, i) => corDaOficina(i + 1));
    expect(new Set(cores).size).toBe(12);
    expect(corDaOficina(13)).toBe(corDaOficina(1));
  });
});
