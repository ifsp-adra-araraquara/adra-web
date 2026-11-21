import { Lacunas } from '../motor/tipos';

/** Próximo passo oferecido no fim de toda resposta (nunca deixar a conversa solta). */
export type Acao =
  | { tipo: 'perguntar'; rotulo: string; texto: string }
  | { tipo: 'executar'; rotulo: string; intencaoId: string; lacunas?: Lacunas }
  | { tipo: 'pdf'; rotulo: string }
  | { tipo: 'navegar'; rotulo: string; rota: string; query?: Record<string, string | number> }
  | { tipo: 'menu'; rotulo: string };

export interface Tabela {
  titulo?: string;
  colunas: string[];
  linhas: string[][];
  /** Índices das colunas numéricas (alinhadas à direita). */
  numericas?: number[];
}

export interface Barra {
  rotulo: string;
  /** 0–100, largura da barra. */
  valor: number;
  texto: string;
  destaque?: boolean;
}

/** O documento no modelo ADRA (folha A4). Gerado na hora; nada fica guardado. */
export interface Relatorio {
  titulo: string;
  subtitulo: string;
  resumo: string[];
  tabelas: Tabela[];
  criterio?: string;
  paisagem?: boolean;
  /** Linha de assinatura (prestação de contas). */
  assinatura?: boolean;
}

export type Humor = 'falando' | 'confuso' | 'acenando';

/** "O que eu sei responder": opções agrupadas por tema. */
export interface GrupoMenu {
  titulo: string;
  acoes: Acao[];
}

export interface Resposta {
  /** Parágrafos; trechos entre **asteriscos** saem em negrito. */
  texto: string[];
  interpretacao?: string[];
  barras?: Barra[];
  tabela?: Tabela;
  lista?: string[];
  /** Lista numerada (passos do "Como faço"). */
  passos?: string[];
  criterio?: string;
  acoes: Acao[];
  relatorio?: Relatorio;
  menu?: GrupoMenu[];
  humor?: Humor;
}

/* ---------------- Formatação pt-BR ---------------- */

const NUM = new Intl.NumberFormat('pt-BR');
const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const num = (n: number) => NUM.format(n);
export const moeda = (n: number) => MOEDA.format(n);
export const pct = (n: number | null | undefined) => (n == null ? '—' : `${n}%`);

/** "1 falta" / "3 faltas". */
export function plural(n: number, um: string, varios: string): string {
  return `${num(n)} ${n === 1 ? um : varios}`;
}

/** yyyy-MM-dd → dd/MM/yyyy (ou dd/MM se `curta`). */
export function dataBr(iso: string | null | undefined, curta = false): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`;
}

export function agoraBr(data = new Date()): string {
  return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Percentual de presença: (esperados − ausências) ÷ esperados. Mesmo critério do Painel. */
export function percentual(esperados: number, ausencias: number): number | null {
  return esperados > 0 ? Math.round(((esperados - ausencias) * 100) / esperados) : null;
}

/** "5 pontos abaixo de setembro (87%)" / "igual a setembro" / "2 pontos acima de…". */
export function variacao(atual: number | null, anterior: number | null, rotuloAnterior: string): string | null {
  if (atual == null || anterior == null) return null;
  const d = atual - anterior;
  if (d === 0) return `igual a ${rotuloAnterior} (${anterior}%)`;
  return `${plural(Math.abs(d), 'ponto', 'pontos')} ${d > 0 ? 'acima' : 'abaixo'} de ${rotuloAnterior} (${anterior}%)`;
}

export function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const CRITERIO_FREQUENCIA =
  'Frequência = presenças ÷ atendidos esperados nas chamadas lançadas. Falta justificada (FJ) conta como ausência. Mesmo critério do Painel.';

export const DIAS_SEMANA = ['', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];

export const ROTULOS: Record<string, string> = {
  FEMININO: 'Feminino',
  MASCULINO: 'Masculino',
  OUTRO: 'Outro',
  NAO_INFORMADO: 'Não informado',
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  INTEGRAL: 'Integral',
  BPC: 'BPC',
  BOLSA_FAMILIA: 'Bolsa Família',
  PETI: 'PETI',
  BOLSA_ESCOLA: 'Bolsa Escola',
  AUXILIO_GAS: 'Auxílio Gás',
  ALUGUEL_SOCIAL: 'Aluguel Social',
  OCORRENCIA: 'ocorrência',
  ADVERTENCIA: 'advertência',
  SUSPENSAO: 'suspensão',
  UNIFORME: 'uniforme',
};

export const rotulo = (valor: string) => ROTULOS[valor] ?? valor;

/** Barras proporcionais ao maior valor (para contagens). */
export function barrasDeContagem(itens: { rotulo: string; total: number }[], base: number, limite = 8): Barra[] {
  const maior = Math.max(1, ...itens.map((i) => i.total));
  return itens.slice(0, limite).map((i) => ({
    rotulo: rotulo(i.rotulo),
    valor: Math.round((i.total * 100) / maior),
    texto: base > 0 ? `${num(i.total)} (${Math.round((i.total * 100) / base)}%)` : num(i.total),
  }));
}
