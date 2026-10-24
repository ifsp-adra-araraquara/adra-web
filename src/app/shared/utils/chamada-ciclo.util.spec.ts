import { StatusPresenca } from '../enum/StatusPresenca';
import { MotivoFalta } from '../enum/MotivoFalta';
import { LinhaChamada, filtrarPorNome, marcarPresenca, proximoStatusPresenca } from './chamada.util';

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
    const comMotivo = [{ ...aluno(1, 'Ana'), statusPresenca: StatusPresenca.FALTA_JUSTIFICADA, motivoFalta: MotivoFalta.SAUDE }];
    const [resultado] = marcarPresenca(comMotivo, 1, StatusPresenca.PRESENTE);
    expect(resultado.motivoFalta).toBeNull();
  });

  it('busca pelo nome ignorando acento e caixa', () => {
    const alunos = [aluno(1, 'Érica Souza'), aluno(2, 'Bruno Lima')];
    expect(filtrarPorNome(alunos, 'erica').map((a) => a.assistidoId)).toEqual([1]);
    expect(filtrarPorNome(alunos, '  ')).toHaveLength(2);
  });
});
