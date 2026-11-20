/**
 * ADRAbot — tudo o que pesa (motor, catálogo, respostas) num módulo só,
 * importado dinamicamente na primeira vez que alguém abre o robô.
 */
export { entender } from './motor/motor';
export { intencaoPorId } from './motor/catalogo';
export { executorPara } from './respostas/executores';
export {
  boasVindas,
  nomeDoPerfil,
  respostaFora,
  respostaMenu,
  respostaSemPermissao,
  respostaSugestao,
} from './respostas/respostas-fora';
