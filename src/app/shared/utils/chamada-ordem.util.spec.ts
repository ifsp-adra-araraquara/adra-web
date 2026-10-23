import { StatusPresenca } from '../enum/StatusPresenca';
import { aniversariantesDoDia, contarJustificadasConsecutivas, ordenarPorNome, rotuloAutorizados, LinhaChamada } from './chamada.util';

const aluno = (nomeCompleto: string) => ({ nomeCompleto } as LinhaChamada);

describe('chamada.util — ordem, justificadas e autorizados', () => {
  it('ordena A-Z e Z-A ignorando acento', () => {
    const alunos = [aluno('Érica'), aluno('Ana'), aluno('Bruno')];
    expect(ordenarPorNome(alunos).map((a) => a.nomeCompleto)).toEqual(['Ana', 'Bruno', 'Érica']);
    expect(ordenarPorNome(alunos, 'za').map((a) => a.nomeCompleto)).toEqual(['Érica', 'Bruno', 'Ana']);
  });

  it('conta só as justificadas seguidas mais recentes', () => {
    const fj = { dataAula: '', statusPresenca: StatusPresenca.FALTA_JUSTIFICADA };
    const p = { dataAula: '', statusPresenca: StatusPresenca.PRESENTE };
    expect(contarJustificadasConsecutivas([fj, fj, fj, p, fj])).toBe(3);
  });

  it('monta "nome (parentesco)"', () => {
    expect(rotuloAutorizados([{ nome: 'Débora', parentesco: 'Mãe', telefone: null }, { nome: 'Sueli', parentesco: null, telefone: null }]))
      .toBe('Débora(mãe), Sueli');
  });
});

describe('chamada.util — aniversariantes', () => {
  it('acha quem faz aniversário no dia da aula e calcula a idade', () => {
    const a = { assistidoId: 1, nomeCompleto: 'Ana', dataNascimento: '2015-10-18' } as LinhaChamada;
    const b = { assistidoId: 2, nomeCompleto: 'Bia', dataNascimento: '2014-03-02' } as LinhaChamada;
    const r = aniversariantesDoDia([a, b], '2026-10-18');
    expect(r.map((x) => [x.aluno.nomeCompleto, x.idade])).toEqual([['Ana', 11]]);
  });
});
