import type { Worksheet } from 'exceljs';

import { LinhaListaAnualDTO, ListaAnualDTO, StatusMatricula } from '../../../shared/models/matricula/Matricula';

export const SITUACAO_MATRICULA: Record<StatusMatricula, string> = {
  ATIVA: 'Ativo no ano',
  ENCERRADA: 'Concluiu o ano',
  DESLIGADA: 'Saiu durante o ano',
};

/** AAAA-MM-DD → DD/MM/AAAA (sem passar por Date, para não mudar de dia por fuso). */
export function dataBr(iso: string | null): string {
  return iso ? iso.split('-').reverse().join('/') : '';
}

export function frequencia(linha: LinhaListaAnualDTO): string {
  return linha.frequenciaPercentual == null ? 'Sem chamada' : `${linha.frequenciaPercentual}%`;
}

/** Data de calendário no meio-dia UTC: o Excel mostra o mesmo dia em qualquer fuso. */
function dataPlanilha(iso: string | null): Date | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, 12));
}

const COLUNAS = [
  { header: 'Nome', key: 'nome', width: 36 },
  { header: 'Data de nascimento', key: 'nascimento', width: 18, style: { numFmt: 'dd/mm/yyyy' } },
  { header: 'Grupo', key: 'grupo', width: 24 },
  { header: 'Situação', key: 'situacao', width: 20 },
  { header: 'Entrada no grupo', key: 'entrada', width: 16, style: { numFmt: 'dd/mm/yyyy' } },
  { header: 'Saída', key: 'saida', width: 14, style: { numFmt: 'dd/mm/yyyy' } },
  { header: 'Chamadas', key: 'chamadas', width: 11 },
  { header: 'Presenças', key: 'presencas', width: 11 },
  { header: 'Faltas', key: 'faltas', width: 9 },
  { header: 'Faltas justificadas', key: 'justificadas', width: 18 },
  { header: 'Frequência (%)', key: 'frequencia', width: 15 },
];

/**
 * Planilha da lista anual: aba com os atendidos (filtrável) e aba de resumo.
 * O exceljs só é carregado aqui, ao exportar — não pesa na abertura da tela.
 */
export async function planilhaDaListaAnual(lista: ListaAnualDTO): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema ADRA';
  workbook.created = new Date();

  const aba = workbook.addWorksheet(`Atendidos ${lista.ano}`, { views: [{ state: 'frozen', ySplit: 1 }] });
  aba.columns = COLUNAS;
  for (const linha of lista.atendidos) {
    aba.addRow({
      nome: linha.nomeCompleto,
      nascimento: dataPlanilha(linha.dataNascimento),
      grupo: linha.grupo ?? '',
      situacao: SITUACAO_MATRICULA[linha.statusMatricula],
      entrada: dataPlanilha(linha.entrada),
      saida: dataPlanilha(linha.saida),
      chamadas: linha.totalChamadas,
      presencas: linha.presencas,
      faltas: linha.faltas,
      justificadas: linha.faltasJustificadas,
      frequencia: linha.frequenciaPercentual,
    });
  }
  destacarCabecalho(aba);
  aba.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUNAS.length } };

  const resumo = workbook.addWorksheet('Resumo');
  resumo.columns = [
    { header: 'Ano', key: 'rotulo', width: 34 },
    { header: String(lista.ano), key: 'valor', width: 16 },
  ];
  resumo.addRows([
    { rotulo: 'Atendidos matriculados', valor: lista.atendidos.length },
    { rotulo: 'Ativos no ano', valor: lista.totalAtivas },
    { rotulo: 'Concluíram o ano', valor: lista.totalEncerradas },
    { rotulo: 'Saíram durante o ano', valor: lista.totalDesligadas },
    { rotulo: 'Ano encerrado', valor: lista.encerrado ? 'Sim' : 'Não' },
    { rotulo: 'Frequência considerada até', valor: dataBr(lista.frequenciaAte) },
  ]);
  destacarCabecalho(resumo);

  const conteudo = await workbook.xlsx.writeBuffer();
  return new Blob([conteudo], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function destacarCabecalho(aba: Worksheet): void {
  aba.getRow(1).font = { bold: true };
}
