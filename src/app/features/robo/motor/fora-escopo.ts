/**
 * ADRAbot — reconhece o que NÃO é pergunta do sistema, para responder com
 * educação e devolver a pessoa ao que o robô sabe. Ordem importa: proteção
 * de criança e dado pessoal vêm antes de tudo.
 */
import { CategoriaFora, Termo } from './tipos';

export interface Verificador {
  tem: (termo: Termo) => boolean;
  /** Quantas palavras com sentido a mensagem tem. */
  palavrasUteis: number;
  temNome: boolean;
  temDominio: boolean;
}

const PROTECAO: Termo[] = [
  'abuso', 'abusad*', 'violencia', 'violentad*', 'maus tratos', 'maltrat*', 'espancad*', 'apanha*', 'agredid*',
  'assedio', 'assediad*', 'conselho tutelar', 'denunci*', 'negligencia', 'trabalho infantil', 'suicid*',
  'se machuca*', 'automutila*', 'drogas', 'uso de droga*',
];

const ORIENTACAO: Termo[] = [
  'o que eu faco com', 'o que faco com', 'o que fazer com', 'como lidar', 'como agir', 'devo fazer', 'o que devo',
  'conselho', 'diagnostic*', 'tratamento', 'remedio*', 'medicament*', 'advogad*', 'juridic*', 'processo judicial',
  'psicolog*', 'terapia',
];

const DADO_PESSOAL: Termo[] = [
  'cpf', 'rg', 'telefone', 'celular', 'whatsapp', 'endereco', 'onde mora', 'mora onde', 'rua', 'renda*', 'salario*',
  'bolsa familia', 'bpc', 'nis', 'beneficio*', 'saude', 'doenca*', 'laudo*', 'deficien*', 'diagnostic*', 'remedio*',
  'senha',
];

const ESCRITA: Termo[] = [
  'lanca', 'lance', 'registra', 'registre', 'cadastra', 'cadastre', 'apaga', 'apague', 'exclui', 'exclua',
  'deleta', 'delete', 'remove', 'remova', 'edita', 'edite', 'altera', 'altere', 'muda', 'mude', 'aprova', 'aprove',
  'recusa', 'recuse', 'envia', 'envie', 'manda', 'mande', 'marca', 'marque', 'desmarca', 'cria', 'crie', 'adiciona',
  'adicione', 'inclui', 'inclua', 'troca', 'troque', 'corrige', 'corrija', 'atualiza', 'atualize', 'desliga',
  'desligue', 'inativa', 'inative', 'reativa', 'reative', 'suspende', 'suspenda', 'pra mim', 'para mim', 'por mim',
];

const ALHEIO: Termo[] = [
  'futebol', 'jogo', 'time', 'campeonato', 'clima', 'tempo amanha', 'chuva', 'chover', 'previsao', 'politic*',
  'eleic*', 'president*', 'governo', 'prefeito', 'religi*', 'igreja', 'deus', 'biblia', 'noticia*', 'piada*',
  'receita', 'filme*', 'serie*', 'musica*', 'namor*', 'bitcoin', 'dolar', 'horoscopo', 'signo', 'python',
  'javascript', 'programacao', 'chatgpt', 'inteligencia artificial', 'capital d*', 'traduz*', 'ingles', 'redacao',
  'poema', 'poesia', 'conta de', 'quanto e', 'quanto da', 'calcul*', 'loteria', 'mega sena', 'pizza', 'comida',
  'viagem', 'praia', 'carro', 'celular novo', 'compra*', 'preco*',
];

const OFENSA: Termo[] = [
  'burro', 'idiota', 'lixo', 'inutil', 'porcaria', 'merda', 'bosta', 'imbecil', 'otario', 'fdp', 'vsf', 'porra',
  'caralho', 'droga de robo', 'robo burro', 'estupido',
];

const SAUDACAO: Termo[] = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'e ai', 'opa', 'salve', 'hey', 'hello', 'oie', 'tudo bem', 'como vai'];
const AGRADECIMENTO: Termo[] = ['obrigad*', 'valeu', 'brigad*', 'agradec*', 'show', 'perfeito', 'otimo', 'legal', 'beleza', 'top', 'massa', 'certo', 'ok', 'entendi'];
const DESPEDIDA: Termo[] = ['tchau', 'ate mais', 'ate logo', 'ate amanha', 'falou', 'fui', 'flw'];
const APRESENTACAO: Termo[] = [
  'quem e voce', 'quem voce e', 'o que voce faz', 'o que voce sabe', 'seu nome', 'qual seu nome', 'voce e um robo',
  'voce e uma ia', 'voce e humano', 'como voce funciona', 'o que posso perguntar', 'o que da pra perguntar',
];
const MENU: Termo[] = ['menu', 'opcoes', 'ajuda', 'socorro', 'me ajuda', 'help', 'inicio', 'comecar', 'sugestoes'];

const algum = (v: Verificador, lista: Termo[]) => lista.some((t) => v.tem(t));

/**
 * Categoria de uma mensagem que nenhuma intenção pegou com confiança
 * (ou que pede algo que o robô não deve fazer). `null` = é do domínio, mas
 * não ficou claro; o motor oferece "Você quis dizer…".
 */
export function classificarFora(v: Verificador, temIntencaoDeDados: boolean): CategoriaFora | null {
  if (algum(v, PROTECAO)) return 'protecao';
  if (v.temNome && algum(v, DADO_PESSOAL)) return 'dado-pessoal';
  if (algum(v, ORIENTACAO) && (v.temDominio || v.temNome)) return 'orientacao';
  if (algum(v, OFENSA)) return 'ofensa';
  if (temIntencaoDeDados) return null;

  if (algum(v, APRESENTACAO)) return 'apresentacao';
  if (v.palavrasUteis <= 2 && algum(v, MENU)) return 'menu';
  if (v.palavrasUteis <= 3 && algum(v, DESPEDIDA)) return 'despedida';
  if (v.palavrasUteis <= 3 && algum(v, AGRADECIMENTO)) return 'agradecimento';
  if (v.palavrasUteis <= 4 && algum(v, SAUDACAO)) return 'saudacao';
  if (algum(v, ESCRITA) && v.temDominio) return 'escrita';
  if (algum(v, ALHEIO) && !v.temDominio) return 'alheio';
  if (!v.temDominio) return v.palavrasUteis === 0 ? 'menu' : 'alheio';
  return null;
}

/** Pedido de ação (para responder "eu só consulto" junto do "Como faço"). */
export function pedeAcao(v: Verificador): boolean {
  return algum(v, ESCRITA);
}

/** Palavras das listas acima, para o corretor não "consertar" assunto alheio em palavra do sistema. */
export function palavrasForaDoEscopo(): string[] {
  return [PROTECAO, ORIENTACAO, DADO_PESSOAL, ESCRITA, ALHEIO, OFENSA, SAUDACAO, AGRADECIMENTO, DESPEDIDA, APRESENTACAO, MENU]
    .flat()
    .flatMap((t) => t.replace(/\*/g, '').split(' '))
    .filter((p) => p.length >= 4);
}
