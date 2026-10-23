import { feriadosNacionais } from './feriados.util';

describe('feriados.util', () => {
  it('calcula os feriados móveis a partir da Páscoa (2026: Páscoa em 05/04)', () => {
    const datas = feriadosNacionais(2026).map((f) => `${f.data} ${f.nome}`);
    expect(datas).toContain('2026-04-03 Sexta-feira Santa');
    expect(datas).toContain('2026-02-17 Carnaval');
    expect(datas).toContain('2026-06-04 Corpus Christi');
    expect(datas).toContain('2026-11-20 Dia Nacional de Zumbi e da Consciência Negra');
  });
});
