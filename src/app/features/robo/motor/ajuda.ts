/**
 * ADRAbot — artigos "Como faço?". Cada artigo vira uma intenção do catálogo
 * (id "ajuda.<id>") e responde com os passos e um botão para ir à tela.
 * O robô só ensina: não lança, não cadastra e não apaga nada.
 */
import { Role } from '../../../shared/enum/role.enum';
import { Intencao, Regra, Termo } from './tipos';

const C = Role.COORD;
const AS = Role.ASSISTENTE;
const ES = Role.EDUCADOR;
const O = Role.OFICINEIRO;

export interface Ajuda {
  intencao: Intencao;
  passos: string[];
  /** Tela onde a pessoa faz isso. */
  rota: string;
  rotuloRota: string;
}

/** Palavras de quem pede instrução. */
export const PEDIDO_DE_AJUDA: Termo[] = [
  'como', 'onde', 'ajuda', 'passo a passo', 'tutorial', 'ensina*', 'explica*', 'consigo', 'posso', 'faco',
  'fazer', 'jeito', 'maneira', 'tem como', 'da pra', 'da para', 'nao sei', 'duvida', 'preciso',
];

function ajuda(
  id: string,
  titulo: string,
  perfis: Role[],
  assunto: Termo[],
  exemplos: string[],
  passos: string[],
  rota: string,
  rotuloRota: string,
  diretas: Termo[] = [],
  extras: Regra[] = [],
): Ajuda {
  return {
    intencao: {
      id: `ajuda.${id}`,
      tema: 'ajuda',
      titulo,
      perfis,
      regras: [[PEDIDO_DE_AJUDA, assunto], ...(diretas.length ? [[diretas]] : []), ...extras],
      exemplos,
      sugestao: `Como ${titulo.charAt(0).toLowerCase()}${titulo.slice(1)}?`,
    },
    passos,
    rota,
    rotuloRota,
  };
}

export const AJUDAS: Ajuda[] = [
  ajuda(
    'chamada', 'Lançar a chamada', [C, ES],
    ['lanc*', 'fazer a chamada', 'fazer chamada', 'passar a chamada', 'registrar presenca', 'marcar presenca', 'marcar falta'],
    ['como lanco a chamada', 'como faco a chamada do grupo', 'onde marco a presenca', 'como passar a chamada'],
    [
      'Abra **Chamada** no menu.',
      'Escolha o dia (hoje já vem marcado) e toque no grupo.',
      'Todos começam como **P** (presente). Toque no nome de quem faltou para trocar para **F**, ou **FJ** se a falta tiver justificativa.',
      'Toque em **Salvar chamada**. Dá para corrigir depois, no mesmo lugar.',
    ],
    '/chamada', 'Abrir Chamada',
    ['lancar a chamada', 'lancar chamada', 'fazer a chamada'],
 
    [[PEDIDO_DE_AJUDA, ['marc*', 'lanc*', 'fazer', 'faco', 'faz', 'passar', 'registr*', 'funciona'], ['chamada', 'frequencia', 'falta']], [PEDIDO_DE_AJUDA, ['chamada']]],
  ),
  ajuda(
    'justificar', 'Justificar uma falta', [C, ES],
    ['justific*', 'atestado', 'falta justificada'],
    ['como justifico uma falta', 'onde coloco o atestado', 'como marcar falta justificada'],
    [
      'Abra a **Chamada** do dia e do grupo.',
      'Toque no nome do atendido até aparecer **FJ** (falta justificada).',
      'Salve a chamada. A FJ conta como ausência na frequência, mas fica registrado que foi justificada.',
    ],
    '/chamada', 'Abrir Chamada',
  ),
  ajuda(
    'siglas', 'Entender P, F e FJ', [C, AS, ES, O],
    ['o que e fj', 'o que significa', 'significado', 'sigla*', 'legenda', 'o que quer dizer'],
    ['o que significa fj', 'o que e p f e fj', 'qual a legenda da chamada'],
    [
      '**P**: presente.',
      '**F**: falta.',
      '**FJ**: falta justificada (atestado, por exemplo). Na frequência ela conta como ausência, mas fica marcada como justificada.',
      'Frequência = presenças ÷ atendidos esperados nas chamadas lançadas.',
    ],
    '/chamada', 'Abrir Chamada',
    ['o que e fj', 'significa fj', 'p f fj'],
 
    [[['fj']], [['legenda']], [['sigla*']]],
  ),
  ajuda(
    'corrigir.entrada', 'Corrigir a data de entrada no grupo', [C, AS],
    ['data de entrada', 'entrada no grupo', 'corrigir entrada', 'corrigir a entrada', 'entrou errado'],
    ['como corrijo a data de entrada no grupo', 'a data de entrada esta errada', 'como mudar a entrada no grupo'],
    [
      'Abra **Grupos** e entre no grupo do atendido.',
      'Na lista de atendidos, abra as ações do atendido e escolha **Corrigir data de entrada**.',
      'Informe a data certa. O sistema avisa se já existem chamadas lançadas no período que muda.',
    ],
    '/turmas', 'Abrir Grupos',
    [],
    [[['data de entrada', 'entrada no grupo'], ['errad*', 'corrig*', 'mudar', 'alterar', 'trocar', 'ajustar']]],
 
  ),
  ajuda(
    'cadastrar', 'Cadastrar um atendido', [C, AS],
    ['cadastr*', 'novo atendido', 'incluir atendido', 'adicionar atendido', 'matricular'],
    ['como cadastro um atendido', 'como adicionar uma crianca nova', 'onde cadastro um aluno'],
    [
      'Abra **Atendidos** e toque em **Novo atendido**.',
      'Preencha os dados, a foto e os documentos obrigatórios.',
      'Salve e depois coloque o atendido num grupo em **Grupos**.',
      'Se a família já fez o pré-cadastro pelo link, é mais rápido aprovar em **Pré-cadastros**.',
    ],
    '/assistidos/novo', 'Abrir Novo atendido',
    [],
    [[PEDIDO_DE_AJUDA, ['cadastr*', 'adicion*', 'inclu*', 'novo', 'nova', 'matricul*', 'colocar'], ['atendido']]],
  ),
  ajuda(
    'precadastro', 'Avaliar um pré-cadastro', [C, AS],
    ['avaliar', 'aprovar', 'reprovar', 'precadastro', 'pre cadastro', 'lista de espera'],
    ['como avalio um pre cadastro', 'como aprovar uma inscricao', 'como coloco na lista de espera'],
    [
      'Abra **Pré-cadastros** e escolha a inscrição.',
      'Confira os dados e os documentos enviados pela família.',
      'Escolha **Aprovar** (vira atendido), **Lista de espera** ou **Reprovar** (com o motivo).',
    ],
    '/pre-cadastros', 'Abrir Pré-cadastros',
  ),
  ajuda(
    'rematricula', 'Rematricular para o próximo ano', [C, AS],
    ['rematricul*', 'proximo ano', 'renovar matricula'],
    ['como rematriculo um atendido', 'como fazer a rematricula', 'o que e possivel rematricula'],
    [
      'A família envia a rematrícula pelo link do pré-cadastro; o sistema avisa quando parece ser **possível rematrícula** de alguém que já é atendido.',
      'Em **Pré-cadastros**, abra a inscrição: a equipe compara o que foi enviado com a ficha atual.',
      'Revise e atualize os campos que mudaram, escolha o grupo e confirme a rematrícula.',
    ],
    '/pre-cadastros', 'Abrir Pré-cadastros',
    ['possivel rematricula'],
    [[['rematricul*'], ['o que e', 'o que significa', 'como funciona', 'quando']]],
  ),
  ajuda(
    'desligamento', 'Pedir ou aprovar um desligamento', [C, AS],
    ['deslig*', 'inativar', 'tirar do projeto', 'saiu do projeto'],
    ['como desligo um atendido', 'como pedir desligamento', 'como aprovar um desligamento'],
    [
      'A **Assistente Social** abre o atendido em **Atendidos** e escolhe **Solicitar desligamento**, com a data e o motivo.',
      'O **Coordenador** vê o pedido na aba de pedidos de desligamento e **aprova** ou **recusa** (com a resposta).',
      'Inativar e reativar direto é só com o Coordenador.',
    ],
    '/assistidos', 'Abrir Atendidos',
  ),
  ajuda(
    'ocorrencia', 'Registrar uma ocorrência', [C, ES],
    ['registr*', 'lanc*', 'advertencia', 'ocorrencia', 'suspensao', 'disciplinar'],
    ['como registro uma ocorrencia', 'como dar advertencia', 'onde lanco uma suspensao'],
    [
      'Abra **Disciplinar** e toque em **Registrar**.',
      'Escolha o atendido (ou vários), o nível (ocorrência, advertência ou suspensão) e escreva o motivo.',
      'Salve. A cada 3 registros do mesmo nível o sistema recomenda a próxima medida.',
    ],
    '/disciplinar', 'Abrir Disciplinar',
  ),
  ajuda(
    'semanario', 'Enviar o semanário', [C, O],
    ['semanario', 'planejamento'],
    ['como envio o semanario', 'onde mando o planejamento da semana', 'como preencher o semanario'],
    [
      'Abra **Minhas oficinas** (Oficineiro) e escolha a oficina.',
      'Na aba do semanário, preencha **Conteúdos**, **Estratégias** e **Material para impressão**.',
      'Anexe arquivos se precisar e envie. A coordenação recebe aviso do que não foi enviado na semana.',
    ],
    '/oficineiro', 'Abrir Minhas oficinas',
  ),
  ajuda(
    'imprimir', 'Imprimir listas e relatórios', [C, AS, ES, O],
    ['imprim*', 'salvar em pdf', 'salvar como pdf', 'gerar pdf', 'baixar', 'planilha', 'lista de frequencia', 'lista anual', 'lista de evento', 'faixas de idade'],
    ['como imprimo a lista de frequencia', 'como salvo em pdf', 'como baixo a planilha de atendidos', 'onde fica a lista anual'],
    [
      'Toda resposta minha com números tem o botão **Gerar PDF**: abre a folha da ADRA e você escolhe **Salvar como PDF** no destino da impressão.',
      'Lista de frequência e grade do mês: em **Chamada**, abra o grupo.',
      'Lista anual: **Atendidos → Por ano** (também baixa a planilha).',
      'Lista para evento (Coordenador): **Grupos → Lista para evento**.',
    ],
    '/chamada', 'Abrir Chamada',
    [],
    [[PEDIDO_DE_AJUDA, ['salv*', 'imprim*', 'baix*', 'gerar', 'gero', 'exportar'], ['relatorio', 'lista', 'planilha']]],
  ),
  ajuda(
    'faixa.etaria', 'Cadastrar faixas etárias', [C],
    ['faixa etaria', 'faixas etarias', 'faixa de idade', 'faixas de idade'],
    ['como cadastro uma faixa etaria', 'como mudar as faixas de idade dos grupos'],
    [
      'Abra **Grupos** e use a opção de **faixas etárias**.',
      'Cadastre a idade mínima e a máxima (ex.: 6 a 10 anos).',
      'Depois escolha a faixa em cada grupo. O Painel passa a contar os atendidos por essas faixas.',
    ],
    '/turmas', 'Abrir Grupos',
  ),
  ajuda(
    'convidar', 'Convidar um usuário', [C],
    ['convid*', 'novo usuario', 'criar usuario', 'acesso para', 'cadastrar usuario'],
    ['como convido um usuario', 'como dar acesso para um educador', 'como criar um usuario novo'],
    [
      'Abra **Usuários** e toque em **Convidar usuário**.',
      'Informe o e-mail e o perfil (Coordenador, Assistente Social, Educador Social ou Oficineiro).',
      'A pessoa recebe o convite por e-mail e cria a senha.',
    ],
    '/usuarios/convidar', 'Abrir Convidar usuário',
    [],
    [[PEDIDO_DE_AJUDA, ['convid*', 'criar', 'crio', 'cadastr*', 'novo', 'adicion*', 'dar acesso', 'liberar'], ['usuario*', 'educador*', 'oficineiro*', 'assistente social', 'coordenador*']]],
  ),
  ajuda(
    'senha', 'Trocar a senha ou os meus dados', [C, AS, ES, O],
    ['senha', 'meu perfil', 'meus dados', 'meu telefone', 'meu nome'],
    ['como troco minha senha', 'como mudar meu telefone', 'esqueci a senha'],
    [
      'Abra **Meu Perfil** (no menu, no seu nome).',
      'Altere nome e telefone, ou use **Trocar senha**.',
      'Esqueceu a senha? Na tela de entrada, toque em **Esqueci a senha**.',
    ],
    '/perfil', 'Abrir Meu Perfil',
    [],
    [[['senha']], [['esqueci*'], ['senha', 'acesso', 'login']]],
  ),
];

export function ajudaPorIntencao(id: string): Ajuda | undefined {
  return AJUDAS.find((a) => a.intencao.id === id);
}
