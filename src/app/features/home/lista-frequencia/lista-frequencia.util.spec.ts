import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { GradeMensalTurmaDTO } from '../../../shared/models/presenca/GradeMensalTurmaDTO';
import { mesPorExtenso, montarListaFrequencia } from './lista-frequencia.util';

const { PRESENTE: P, FALTA: F, FALTA_JUSTIFICADA: FJ } = StatusPresenca;

const grade: GradeMensalTurmaDTO = {
  turmaId: 1,
  nomeTurma: 'SI Manhã',
  ano: 2026,
  mes: 11,
  colunas: [
    { data: '2026-11-03', tipo: 'LANCADA', rotulo: null },
    { data: '2026-11-05', tipo: 'LANCADA', rotulo: null },
    { data: '2026-11-20', tipo: 'SEM_CHAMADA', rotulo: 'Feriado nacional' },
    { data: '2026-11-24', tipo: 'PENDENTE', rotulo: null },
  ],
  alunos: [
    { assistidoId: 1, nomeCompleto: 'Ana', dataNascimento: null, dataSaida: null, motivoSaida: null, presencas: [P, F, null, null] },
    { assistidoId: 2, nomeCompleto: 'Bia', dataNascimento: null, dataSaida: '2026-11-04', motivoSaida: 'Mudou', presencas: [FJ, null, null, null] },
  ],
};

describe('montarListaFrequencia', () => {
  it('monta as colunas com o feriado marcado e as células P/F/FJ', () => {
    const lista = montarListaFrequencia(grade);

    expect(lista.titulo).toBe('Lista de frequência — SI Manhã — novembro de 2026');
    expect(lista.colunas.map((c) => [c.dia, c.semana])).toEqual([[3, 'T'], [5, 'Q'], [20, 'S'], [24, 'T']]);
    expect(lista.semChamada).toEqual([{ data: '2026-11-20', rotulo: 'Feriado nacional' }]);
    expect(lista.linhas[0].celulas).toEqual(['P', 'F', '—', '']);
    expect(lista.linhas[1].celulas).toEqual(['FJ', '—', '—', '—']);
  });

  it('soma os totais e a frequência (FJ conta como ausência)', () => {
    const lista = montarListaFrequencia(grade);

    expect(lista.linhas[0]).toMatchObject({ presencas: 1, faltas: 1, justificadas: 0, frequencia: 50 });
    expect(lista.linhas[1]).toMatchObject({ presencas: 0, faltas: 0, justificadas: 1, frequencia: 0 });
    expect(lista.diasComChamada).toBe(2);
    expect(lista.frequenciaGeral).toBe(33);
  });

  it('escreve o mês por extenso', () => {
    expect(mesPorExtenso('2026-03')).toBe('março de 2026');
  });
});
