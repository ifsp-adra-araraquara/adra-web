import { Role } from '../../../shared/enum/role.enum';
import { Periodo } from './periodo';

export type Tema = 'frequencia' | 'atendidos' | 'social' | 'grupos' | 'disciplinar' | 'pendencias' | 'ajuda' | 'relatorio';

/**
 * Um termo do catálogo:
 *  - palavra (ou termo canônico, ex.: "frequencia", "atendido");
 *  - prefixo terminado em "*" ("seguid*");
 *  - expressão com espaço ("dia da semana"), procurada no texto inteiro;
 *  - marcador "#..." posto pelo motor ("#periodo", "#2periodos", "#grupo",
 *    "#oficina", "#nome", "#dimensao", "#numero").
 */
export type Termo = string;

/** Todos os grupos precisam aparecer; dentro de um grupo, basta um termo. */
export type Regra = Termo[][];

export type Dimensao = 'FAIXA_ETARIA' | 'IDADE' | 'SEXO' | 'GRUPO' | 'OFICINA' | 'BAIRRO' | 'TURNO_ESCOLA';

export interface Intencao {
  id: string;
  tema: Tema;
  /** Nome curto, usado nos chips ("Frequência dos grupos"). */
  titulo: string;
  perfis: Role[];
  /** Basta uma regra inteira bater. Regras com mais grupos são mais específicas e ganham. */
  regras: Regra[];
  /** Termos que somam um pouco na nota. */
  reforcos?: Termo[];
  /** Se aparecer, esta intenção fica de fora. */
  bloqueios?: Termo[];
  /** Frases típicas: entram na nota por semelhança e no banco de testes. */
  exemplos: string[];
  /** O que o chip envia quando a pessoa escolhe esta intenção num menu. */
  sugestao: string;
}

export interface Opcao {
  id: number;
  nome: string;
  detalhe?: string | null;
}

export interface Lacunas {
  periodos: Periodo[];
  grupo?: Opcao;
  oficina?: Opcao;
  /** Nome solto de atendido ("frequência da Ana Paula"). */
  nome?: string;
  dimensao?: Dimensao;
  numero?: number;
  comparar: boolean;
}

/** O que o motor decidiu fazer com a mensagem. */
export type Decisao =
  | { tipo: 'executar'; intencao: Intencao; lacunas: Lacunas; confianca: number }
  | { tipo: 'sugerir'; opcoes: Intencao[]; lacunas: Lacunas }
  | { tipo: 'sem-permissao'; intencao: Intencao }
  | { tipo: 'fora'; categoria: CategoriaFora; lacunas: Lacunas; ajuda?: Intencao };

export type CategoriaFora =
  | 'saudacao'
  | 'agradecimento'
  | 'despedida'
  | 'apresentacao'
  | 'menu'
  | 'escrita'
  | 'dado-pessoal'
  | 'orientacao'
  | 'protecao'
  | 'alheio'
  | 'ofensa'
  | 'nao-entendi';

/** Memória da conversa, para "e em setembro?" e "e o grupo B?". */
export interface ContextoConversa {
  ultima?: { intencao: Intencao; lacunas: Lacunas };
  falhasSeguidas: number;
}

export interface Entidades {
  grupos: Opcao[];
  oficinas: Opcao[];
}
