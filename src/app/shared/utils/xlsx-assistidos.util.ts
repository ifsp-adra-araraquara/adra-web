import ExcelJS from 'exceljs';
import { AssistidoLinhaLote } from './csv-assistidos.util';

/**
 * Lê a planilha de "lista de presença" da ADRA (uma aba por mês, grade
 * turma × dias: #, NOME, NIVER, uma coluna por data com P/F, RESPONSÁVEL,
 * SAIR ACOMPANHADO) e extrai só o cadastro (nome, nascimento, responsável)
 * da aba do mês mais recente QUE JÁ TEM GENTE — meses futuros existem como
 * abas vazias (ex.: dezembro em outubro), e o mês mais antigo (fevereiro)
 * pode ter uma turma provisória diferente da atual. Não importa a grade de
 * presença em si (isso é outra feature); CPF fica em branco, pendente.
 */
export async function parseXlsxPresenca(conteudo: ArrayBuffer): Promise<AssistidoLinhaLote[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(conteudo);

  for (let i = workbook.worksheets.length - 1; i >= 0; i--) {
    const aba = workbook.worksheets[i];
    const linhas = extrairLinhas(aba);
    if (linhas.length > 0) return linhas;
  }
  return [];
}

function extrairLinhas(aba: ExcelJS.Worksheet): AssistidoLinhaLote[] {
  const { linhaCabecalho, colNome, colNiver, colResponsavel } = localizarCabecalho(aba);
  if (colNome === null) return [];

  const linhas: AssistidoLinhaLote[] = [];
  for (let numeroLinha = linhaCabecalho + 1; numeroLinha <= aba.rowCount; numeroLinha++) {
    const linha = aba.getRow(numeroLinha);
    const nome = textoDaCelula(linha, colNome).trim();
    if (!nome) continue;

    const nascimento = colNiver !== null ? dataDaCelula(linha, colNiver) : '';
    const responsavel = colResponsavel !== null ? textoDaCelula(linha, colResponsavel).trim() : '';

    linhas.push({
      nomeCompleto: nome,
      dataNascimento: nascimento,
      cpf: '',
      responsaveis: responsavel
        ? [
            {
              nomeCompleto: responsavel,
              cpf: '',
              parentesco: '',
              telefone: '',
              email: '',
              contatoEmergencia: true,
              autorizadoRetirada: true,
            },
          ]
        : [],
    });
  }
  return linhas;
}

// A coluna de nome nem sempre tem um cabeçalho literal ("NOME" vem em
// branco em algumas planilhas da ADRA) — mas sempre vem imediatamente à
// esquerda de "NIVER", que é consistente em todas. "Responsável" também
// varia ("RESPONSÁVEL", "NOME DO RESPONSAVEL"), por isso é busca por trecho.
function localizarCabecalho(aba: ExcelJS.Worksheet): {
  linhaCabecalho: number;
  colNome: number | null;
  colNiver: number | null;
  colResponsavel: number | null;
} {
  const limite = Math.min(aba.rowCount, 10);
  for (let numeroLinha = 1; numeroLinha <= limite; numeroLinha++) {
    const linha = aba.getRow(numeroLinha);
    const textos: Record<number, string> = {};
    linha.eachCell({ includeEmpty: false }, (celula, coluna) => {
      textos[coluna] = normalizar(String(celula.value ?? ''));
    });

    const colNiverEntry = Object.entries(textos).find(([, texto]) => texto === 'niver' || texto.includes('nascimento'));
    if (!colNiverEntry) continue;
    const colNiver = Number(colNiverEntry[0]);

    const colNomeLiteral = Object.entries(textos).find(([, texto]) => texto === 'nome');
    const colResponsavelEntry = Object.entries(textos).find(([, texto]) => texto.includes('responsa'));

    return {
      linhaCabecalho: numeroLinha,
      colNome: colNomeLiteral ? Number(colNomeLiteral[0]) : colNiver - 1,
      colNiver,
      colResponsavel: colResponsavelEntry ? Number(colResponsavelEntry[0]) : null,
    };
  }
  return { linhaCabecalho: 1, colNome: null, colNiver: null, colResponsavel: null };
}

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function textoDaCelula(linha: ExcelJS.Row, coluna: number): string {
  const valor = linha.getCell(coluna).value;
  if (valor == null) return '';
  if (typeof valor === 'object' && 'text' in (valor as object)) return String((valor as { text: unknown }).text ?? '');
  return String(valor);
}

// NIVER é formatado como só dia/mês ("d/m", sem ano exibido) em todas as
// linhas da coluna — mas o valor por trás é uma data completa. Quando a
// pessoa digitou a data sem informar o ano, o Excel completa sozinho com o
// ano corrente (confirmado comparando célula a célula: mesmo numFmt em
// todas, só o ano muda). Não dá pra distinguir "ano real" de "ano
// inventado pelo Excel" só pelo formato — por isso descartamos qualquer
// data cujo ano seja o ano corrente (sinal de que não foi informado de
// verdade: nenhuma criança já matriculada desde fevereiro nasceu este ano),
// deixando em branco pra confirmação manual.
function dataDaCelula(linha: ExcelJS.Row, coluna: number): string {
  const valor = linha.getCell(coluna).value;
  const data = valor instanceof Date ? valor : typeof valor === 'number' ? serialParaData(valor) : null;
  if (!data) return '';
  if (data.getUTCFullYear() === new Date().getUTCFullYear()) return '';
  return formatarDataBr(data);
}

function serialParaData(serial: number): Date {
  const epocaExcel = Date.UTC(1899, 11, 30);
  return new Date(epocaExcel + serial * 86400000);
}

function formatarDataBr(data: Date): string {
  const dia = String(data.getUTCDate()).padStart(2, '0');
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const ano = data.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

