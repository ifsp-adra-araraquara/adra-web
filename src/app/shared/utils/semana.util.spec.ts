import { rotuloSemana, segundaDaSemana, semanasAoRedor } from './semana.util';

describe('semana.util', () => {
  it('acha a segunda-feira da semana, inclusive no domingo', () => {
    expect(segundaDaSemana('2026-11-04')).toBe('2026-11-02');
    expect(segundaDaSemana('2026-11-02')).toBe('2026-11-02');
    expect(segundaDaSemana('2026-11-08')).toBe('2026-11-02');
  });

  it('mostra a semana de segunda a domingo, virando o mês', () => {
    expect(rotuloSemana('2026-11-30')).toBe('30/11 a 06/12');
  });

  it('lista as semanas ao redor de hoje, a mais recente primeiro', () => {
    expect(semanasAoRedor('2026-11-04', 1, 1)).toEqual(['2026-11-09', '2026-11-02', '2026-10-26']);
  });
});
