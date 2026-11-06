import { StatusPresenca } from '../enum/StatusPresenca';
import { MotivoFalta } from '../enum/MotivoFalta';
import { LinhaChamada, aniversarioNaAula, filtrarPorNome, marcarPresenca, marcarTodosPresentes, proximoStatusPresenca } from './chamada.util';

const aluno = (assistidoId: number, nomeCompleto: string) =>
  ({ assistidoId, nomeCompleto, statusPresenca: StatusPresenca.PRESENTE, motivoFalta: null, observacao: '' }) as LinhaChamada;

describe('chamada.util — botão único P/F/FJ', () => {
  it('cicla P → F → FJ → P', () => {
    expect(proximoStatusPresenca(StatusPresenca.PRESENTE)).toBe(StatusPresenca.FALTA);
    expect(proximoStatusPresenca(StatusPresenca.FALTA)).toBe(StatusPresenca.FALTA_JUSTIFICADA);
    expect(proximoStatusPresenca(StatusPresenca.FALTA_JUSTIFICADA)).toBe(StatusPresenca.PRESENTE);
  });

  it('sem status conta como presente', () => {
    expect(proximoStatusPresenca(null)).toBe(StatusPresenca.FALTA);
  });

  it('voltar para P limpa o motivo da FJ', () => {
    const comMotivo = [{ ...aluno(1, 'Ana'), statusPresenca: StatusPresenca.FALTA_JUSTIFICADA, motivoFalta: MotivoFalta.ATESTADO }];
    const [resultado] = marcarPresenca(comMotivo, 1, StatusPresenca.PRESENTE);
    expect(resultado.motivoFalta).toBeNull();
  });

  it('FT-13: a falta justificada marcada na chamada já vem como Atestado', () => {
    const [resultado] = marcarPresenca([aluno(1, 'Ana')], 1, StatusPresenca.FALTA_JUSTIFICADA);
    expect(resultado.motivoFalta).toBe(MotivoFalta.ATESTADO);
  });

  it('FT-13: o suspenso não muda ao tocar nem com "todos presentes"', () => {
    const suspenso = {
      ...aluno(1, 'Ana'),
      statusPresenca: StatusPresenca.FALTA_JUSTIFICADA,
      motivoFalta: MotivoFalta.SUSPENSAO,
      suspensoAte: '2026-11-05',
    };
    expect(marcarPresenca([suspenso], 1, StatusPresenca.PRESENTE)[0]).toBe(suspenso);
    expect(marcarTodosPresentes([suspenso, aluno(2, 'Bruno')])[0]).toBe(suspenso);
  });

  it('aniversário no dia da aula, no mês ou fora dele', () => {
    expect(aniversarioNaAula('2015-10-24', '2026-10-24')).toEqual({ tipo: 'hoje', dia: '24/10', idade: 11 });
    expect(aniversarioNaAula('2015-10-02', '2026-10-24')).toEqual({ tipo: 'mes', dia: '02/10', idade: 11 });
    expect(aniversarioNaAula('2015-11-24', '2026-10-24')).toBeNull();
    expect(aniversarioNaAula(null, '2026-10-24')).toBeNull();
  });

  it('busca pelo nome ignorando acento e caixa', () => {
    const alunos = [aluno(1, 'Érica Souza'), aluno(2, 'Bruno Lima')];
    expect(filtrarPorNome(alunos, 'erica').map((a) => a.assistidoId)).toEqual([1]);
    expect(filtrarPorNome(alunos, '  ')).toHaveLength(2);
  });
});
