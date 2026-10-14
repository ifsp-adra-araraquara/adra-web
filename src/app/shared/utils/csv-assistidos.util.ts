import * as Papa from 'papaparse';
import { somenteDigitos } from '../validators/cpf.validator';
import { telefoneNacional } from './mascara.util';

export interface ResponsavelLinhaLote {
  nomeCompleto: string;
  cpf: string;
  parentesco: string;
  telefone: string;
  email: string;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
}

export interface AssistidoLinhaLote {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  responsaveis: ResponsavelLinhaLote[];
}

const CAMPOS_ASSISTIDO = ['nome', 'data_nascimento', 'cpf'];
const CAMPOS_RESPONSAVEL = [
  'nome',
  'cpf',
  'parentesco',
  'telefone',
  'email',
  'contato_emergencia',
  'autorizado_retirada',
];

export function decodificarCsv(conteudo: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(conteudo);
  } catch {
    // CSV salvo pelo Excel em pt-BR sem a opção "UTF-8".
    return new TextDecoder('windows-1252').decode(conteudo);
  }
}

export function parseCsvAssistidos(texto: string): AssistidoLinhaLote[] {
  const resultado = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (cabecalho) => cabecalho.trim().toLowerCase(),
  });
  const cabecalhos = resultado.meta.fields ?? [];
  const totalResponsaveis = contarGruposResponsavel(cabecalhos);

  return resultado.data.map((registro) => {
    const valor = (coluna: string) => (registro[coluna] ?? '').trim();
    const responsaveis: ResponsavelLinhaLote[] = [];
    for (let n = 1; n <= totalResponsaveis; n++) {
      const prefixo = `resp${n}_`;
      if (CAMPOS_RESPONSAVEL.every((campo) => !valor(prefixo + campo))) continue;
      responsaveis.push({
        nomeCompleto: valor(prefixo + 'nome'),
        cpf: normalizarCpf(valor(prefixo + 'cpf')),
        parentesco: valor(prefixo + 'parentesco'),
        telefone: telefoneNacional(valor(prefixo + 'telefone')),
        email: valor(prefixo + 'email'),
        contatoEmergencia: ehSim(valor(prefixo + 'contato_emergencia')),
        autorizadoRetirada: ehSim(valor(prefixo + 'autorizado_retirada')),
      });
    }
    return {
      nomeCompleto: valor('nome'),
      dataNascimento: normalizarData(valor('data_nascimento')),
      cpf: normalizarCpf(valor('cpf')),
      responsaveis,
    };
  });
}

export function gerarCsvAssistidos(linhas: AssistidoLinhaLote[]): string {
  const totalResponsaveis = Math.max(2, ...linhas.map((linha) => linha.responsaveis.length));
  const camposResponsavel = Array.from({ length: totalResponsaveis }, (_, i) =>
    CAMPOS_RESPONSAVEL.map((campo) => `resp${i + 1}_${campo}`),
  ).flat();

  const dados = linhas.map((linha) => [
    linha.nomeCompleto,
    linha.dataNascimento,
    linha.cpf,
    ...Array.from({ length: totalResponsaveis }, (_, i) => {
      const r = linha.responsaveis[i];
      if (!r) return CAMPOS_RESPONSAVEL.map(() => '');
      return [
        r.nomeCompleto,
        r.cpf,
        r.parentesco,
        r.telefone,
        r.email,
        r.contatoEmergencia ? 'S' : 'N',
        r.autorizadoRetirada ? 'S' : 'N',
      ];
    }).flat(),
  ]);

  // BOM faz o Excel abrir os acentos corretamente.
  return '\uFEFF' + Papa.unparse({ fields: [...CAMPOS_ASSISTIDO, ...camposResponsavel], data: dados }, { delimiter: ';' });
}

export function modeloCsvAssistidos(): string {
  return gerarCsvAssistidos([
    {
      nomeCompleto: 'Ana Souza (exemplo, apague esta linha)',
      dataNascimento: '03/05/2015',
      cpf: '',
      responsaveis: [
        {
          nomeCompleto: 'Maria Souza',
          cpf: '52998224725',
          parentesco: 'Mãe',
          telefone: '16999990000',
          email: '',
          contatoEmergencia: true,
          autorizadoRetirada: true,
        },
      ],
    },
  ]);
}

export function paraDataIso(valor: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  if (!partes) return null;
  const [, dia, mes, ano] = partes;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const existe = data.getFullYear() === Number(ano) && data.getMonth() === Number(mes) - 1 && data.getDate() === Number(dia);
  return existe ? `${ano}-${mes}-${dia}` : null;
}

function contarGruposResponsavel(cabecalhos: string[]): number {
  let n = 0;
  while (cabecalhos.some((cabecalho) => cabecalho.startsWith(`resp${n + 1}_`))) n++;
  return n;
}

// O Excel converte CPF em número e descarta zeros à esquerda.
function normalizarCpf(valor: string): string {
  const digitos = somenteDigitos(valor);
  return digitos && digitos.length < 11 ? digitos.padStart(11, '0') : digitos;
}

function normalizarData(valor: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor);
  if (br) return `${br[1].padStart(2, '0')}/${br[2].padStart(2, '0')}/${br[3]}`;
  return valor;
}

function ehSim(valor: string): boolean {
  return ['s', 'sim', 'x'].includes(valor.toLowerCase());
}
