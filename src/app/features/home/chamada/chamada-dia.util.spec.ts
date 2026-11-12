import { diasUteisVizinhos, ehFimDeSemana, motivoSemGrupos, nomeDoDia, tituloDoDia } from './chamada-dia.util';

// Novembro de 2026: 07 = sábado, 08 = domingo, 09 = segunda, 12 = quinta.
describe('chamada-dia.util', () => {
  it('dá o dia da semana sem depender do fuso', () => {
    expect(nomeDoDia('2026-11-07')).toBe('Sábado');
    expect(nomeDoDia('2026-11-08')).toBe('Domingo');
    expect(nomeDoDia('2026-11-12')).toBe('Quinta-feira');
    expect(ehFimDeSemana('2026-11-07')).toBe(true);
    expect(ehFimDeSemana('2026-11-09')).toBe(false);
  });

  it('título mostra o dia da semana e marca o dia de hoje', () => {
    expect(tituloDoDia('2026-11-07', '2026-11-12')).toBe('Sábado, 07/11/2026');
    expect(tituloDoDia('2026-11-12', '2026-11-12')).toBe('Hoje · Quinta-feira, 12/11/2026');
  });

  it('explica a lista vazia: fim de semana ou dia sem grupo cadastrado', () => {
    expect(motivoSemGrupos('2026-11-08')).toBe('Domingo não tem chamada: os grupos não funcionam aos fins de semana.');
    expect(motivoSemGrupos('2026-11-11')).toBe(
      'Nenhum grupo tem chamada às quartas-feiras. Confira os dias de chamada no cadastro do grupo.',
    );
  });

  it('atalhos do fim de semana levam à sexta anterior e à segunda seguinte', () => {
    const { anterior, proximo } = diasUteisVizinhos('2026-11-08');
    expect(anterior).toEqual({ data: '2026-11-06', rotulo: 'Sexta, 06/11' });
    expect(proximo).toEqual({ data: '2026-11-09', rotulo: 'Segunda, 09/11' });
  });
});
