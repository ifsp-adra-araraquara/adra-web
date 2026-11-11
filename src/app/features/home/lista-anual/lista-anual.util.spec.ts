import ExcelJS from 'exceljs';

import { ListaAnualDTO } from '../../../shared/models/matricula/Matricula';
import { dataBr, frequencia, planilhaDaListaAnual } from './lista-anual.util';

// Dados inventados.
const lista: ListaAnualDTO = {
  ano: 2026,
  encerrado: true,
  frequenciaAte: '2026-12-31',
  totalAtivas: 0,
  totalEncerradas: 1,
  totalDesligadas: 1,
  atendidos: [
    {
      assistidoId: 1,
      nomeCompleto: 'Ana Teste',
      dataNascimento: '2016-04-12',
      statusMatricula: 'ENCERRADA',
      grupo: 'Grupo Manhã',
      entrada: '2026-02-03',
      saida: null,
      totalChamadas: 40,
      presencas: 36,
      faltas: 3,
      faltasJustificadas: 1,
      frequenciaPercentual: 90,
    },
    {
      assistidoId: 2,
      nomeCompleto: 'Bruno Teste',
      dataNascimento: '2015-01-01',
      statusMatricula: 'DESLIGADA',
      grupo: null,
      entrada: null,
      saida: '2026-06-30',
      totalChamadas: 0,
      presencas: 0,
      faltas: 0,
      faltasJustificadas: 0,
      frequenciaPercentual: null,
    },
  ],
};

describe('lista anual', () => {
  it('formata datas sem mudar o dia e mostra frequência ou "Sem chamada"', () => {
    expect(dataBr('2026-01-01')).toBe('01/01/2026');
    expect(dataBr(null)).toBe('');
    expect(frequencia(lista.atendidos[0])).toBe('90%');
    expect(frequencia(lista.atendidos[1])).toBe('Sem chamada');
  });

  it('planilha: uma linha por atendido com situação, datas e frequência, mais a aba de resumo', async () => {
    const arquivo = await planilhaDaListaAnual(lista);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await arquivo.arrayBuffer());

    const aba = workbook.getWorksheet('Atendidos 2026')!;
    expect(aba.rowCount).toBe(3);
    expect(aba.getRow(1).getCell(1).value).toBe('Nome');
    const ana = aba.getRow(2);
    expect(ana.getCell('A').value).toBe('Ana Teste');
    expect(ana.getCell('D').value).toBe('Concluiu o ano');
    expect((ana.getCell('B').value as Date).toISOString().slice(0, 10)).toBe('2016-04-12');
    expect(ana.getCell('K').value).toBe(90);
    const bruno = aba.getRow(3);
    expect(bruno.getCell('D').value).toBe('Saiu durante o ano');
    expect(bruno.getCell('K').value).toBeNull();

    const resumo = workbook.getWorksheet('Resumo')!;
    expect(resumo.getRow(2).getCell(2).value).toBe(2);
  });
});
