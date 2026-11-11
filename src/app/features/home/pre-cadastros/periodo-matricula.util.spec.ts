import { PeriodoMatriculaDTO } from '../../../shared/models/matricula/Matricula';
import { anosDaLista, hojeIso } from './periodo-matricula.util';

const periodo = (ano: number): PeriodoMatriculaDTO => ({ ano, inicio: `${ano - 1}-11-15`, fim: null, abertoHoje: true });

describe('período de matrícula', () => {
  it('anos da lista: corrente, períodos e o da inscrição, sem repetir, do mais recente para o mais antigo', () => {
    expect(anosDaLista([periodo(2027)], 2027, 2026)).toEqual([2027, 2026]);
    expect(anosDaLista([], 2026, 2026)).toEqual([2026]);
    expect(anosDaLista([periodo(2027), periodo(2026)], 2027, 2026)).toEqual([2027, 2026]);
  });

  it('hoje em AAAA-MM-DD no horário local', () => {
    expect(hojeIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
