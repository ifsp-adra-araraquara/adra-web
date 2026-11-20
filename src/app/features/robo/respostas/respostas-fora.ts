/**
 * ADRAbot — respostas para o que não é pergunta de dados: saudação, fora do
 * escopo, sem permissão, "você quis dizer". Toda resposta termina com
 * próximos passos, para a conversa nunca ficar solta.
 */
import { Role } from '../../../shared/enum/role.enum';
import { BOAS_VINDAS, INTENCOES, intencaoPorId } from '../motor/catalogo';
import { ajudaPorIntencao } from '../motor/ajuda';
import { CategoriaFora, Intencao, Lacunas, Tema } from '../motor/tipos';
import { NOME_ROBO } from '../nome';
import { Acao, Resposta } from './resposta';

const NOME_PERFIL: Record<Role, string> = {
  [Role.COORD]: 'Coordenação',
  [Role.ASSISTENTE]: 'Assistente Social',
  [Role.EDUCADOR]: 'Educador Social',
  [Role.OFICINEIRO]: 'Oficineiro',
};

export function nomeDoPerfil(perfil: Role): string {
  return NOME_PERFIL[perfil];
}

export function sugestoesIniciais(perfil: Role): Acao[] {
  return BOAS_VINDAS[perfil]
    .map((id) => intencaoPorId(id))
    .filter((i): i is Intencao => !!i && i.perfis.includes(perfil))
    .map((i) => ({ tipo: 'executar', rotulo: i.sugestao, intencaoId: i.id }));
}

const MENU: Acao = { tipo: 'menu', rotulo: 'O que eu sei responder' };

export function saudacaoDoHorario(agora = new Date()): string {
  const h = agora.getHours();
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function boasVindas(perfil: Role, primeiroNome: string, agora = new Date()): Resposta {
  return {
    texto: [`${saudacaoDoHorario(agora)}${primeiroNome ? `, ${primeiroNome}` : ''}! Eu sou o **${NOME_ROBO}**. Respondo com os números do sistema e gero o relatório em PDF no modelo da ADRA.`],
    interpretacao: ['Pergunte do seu jeito, por exemplo: "frequência do grupo Girassol em outubro", "quem está faltando seguido?" ou "como lanço a chamada?".'],
    acoes: [...sugestoesIniciais(perfil), MENU].slice(0, 5),
    humor: 'acenando',
  };
}

const TEMAS: { tema: Tema; titulo: string }[] = [
  { tema: 'frequencia', titulo: 'Frequência' },
  { tema: 'atendidos', titulo: 'Atendidos' },
  { tema: 'social', titulo: 'Perfil social' },
  { tema: 'grupos', titulo: 'Grupos e oficinas' },
  { tema: 'disciplinar', titulo: 'Disciplinar' },
  { tema: 'pendencias', titulo: 'Pendências' },
  { tema: 'ajuda', titulo: 'Como faço' },
];

/** "O que eu sei responder": tudo que o perfil pode perguntar, por tema. */
export function menuCompleto(perfil: Role): { titulo: string; acoes: Acao[] }[] {
  return TEMAS.map(({ tema, titulo }) => ({
    titulo,
    acoes: INTENCOES.filter((i) => i.tema === tema && i.perfis.includes(perfil)).map(
      (i): Acao => ({ tipo: 'executar', rotulo: i.tema === 'ajuda' ? i.titulo : i.sugestao, intencaoId: i.id }),
    ),
  })).filter((g) => g.acoes.length);
}

export function respostaMenu(perfil: Role): Resposta {
  return {
    texto: ['Isto é o que eu sei responder. Toque num tema ou pergunte do seu jeito:'],
    acoes: [],
    menu: menuCompleto(perfil),
  };
}

export function respostaFora(categoria: CategoriaFora, perfil: Role, falhasSeguidas: number, ajuda?: Intencao): Resposta {
  const sugestoes = [...sugestoesIniciais(perfil).slice(0, 3), MENU];
  switch (categoria) {
    case 'saudacao':
      return { texto: ['Oi! Em que posso ajudar?'], acoes: sugestoes, humor: 'acenando' };
    case 'agradecimento':
      return { texto: ['Por nada! Precisa de mais alguma coisa?'], acoes: sugestoes, humor: 'acenando' };
    case 'despedida':
      return { texto: ['Até mais! Estou aqui no canto da tela quando precisar.'], acoes: [], humor: 'acenando' };
    case 'apresentacao':
      return {
        texto: [`Eu sou o **${NOME_ROBO}**, o assistente do Sistema ADRA. Consulto os números do sistema (frequência, atendidos, grupos, disciplinar, pendências), comparo períodos e gero o relatório em PDF.`],
        interpretacao: ['Eu só consulto: não lanço, não cadastro e não apago nada. E só falo do sistema da ADRA.'],
        acoes: sugestoes,
      };
    case 'menu':
      return respostaMenu(perfil);
    case 'escrita': {
      const artigo = ajuda ? ajudaPorIntencao(ajuda.id) : undefined;
      return {
        texto: ['Eu só consulto, não altero nada no sistema. Mas te mostro como fazer:'],
        passos: artigo?.passos,
        acoes: artigo
          ? [{ tipo: 'navegar', rotulo: artigo.rotuloRota, rota: artigo.rota }, MENU]
          : sugestoes,
      };
    }
    case 'dado-pessoal':
      return {
        texto: ['Por proteção de dados, eu só mostro **totais**. O dado de uma pessoa (CPF, endereço, renda, saúde) fica na ficha dela, para quem tem acesso.'],
        acoes: [
          ...(perfil === Role.COORD || perfil === Role.ASSISTENTE ? [{ tipo: 'navegar', rotulo: 'Abrir Atendidos', rota: '/assistidos' } as Acao] : []),
          ...(perfil === Role.COORD || perfil === Role.ASSISTENTE ? [{ tipo: 'executar', rotulo: 'Perfil social (totais)', intencaoId: 'social.programas' } as Acao] : []),
          MENU,
        ],
        humor: 'confuso',
      };
    case 'orientacao':
      return {
        texto: ['Isso precisa de uma pessoa da equipe. Converse com a **Assistente Social** ou a **Coordenação**: eu não dou orientação sobre casos.'],
        acoes: [MENU],
      };
    case 'protecao':
      return {
        texto: [
          'Isso é sério e precisa de gente agora. Avise a **Assistente Social** ou a **Coordenação** da ADRA hoje mesmo.',
          'Suspeita de violência contra criança ou adolescente também pode ser denunciada pelo **Disque 100** (ligação gratuita, 24 horas) ou ao **Conselho Tutelar**. Em emergência, **190**.',
        ],
        acoes: [],
      };
    case 'ofensa':
      return { texto: ['Entendi. Vamos tentar de novo? Me diga o que você precisa do sistema.'], acoes: sugestoes, humor: 'confuso' };
    case 'alheio':
      return {
        texto: [falhasSeguidas >= 1 ? `Essa também não é comigo 😅 Sou o **${NOME_ROBO}** e só ajudo com o sistema da ADRA. Veja tudo o que eu sei:` : `Essa eu não sei. Sou o **${NOME_ROBO}** e só ajudo com o sistema da ADRA.`],
        acoes: falhasSeguidas >= 1 ? [] : sugestoes,
        humor: 'confuso',
        ...(falhasSeguidas >= 1 ? { menu: menuCompleto(perfil) } : {}),
      };
    case 'nao-entendi':
    default:
      return falhasSeguidas >= 1
        ? { texto: ['Ainda não entendi. Escolha por aqui:'], acoes: [], humor: 'confuso', menu: menuCompleto(perfil) }
        : {
            texto: ['Não entendi bem. Pode dizer de outro jeito? Por exemplo: "frequência do grupo Girassol em outubro".'],
            acoes: sugestoes,
            humor: 'confuso',
          };
  }
}

export function respostaSemPermissao(intencao: Intencao, perfil: Role): Resposta {
  const quem = intencao.perfis.map((p) => NOME_PERFIL[p]).join(', ');
  return {
    texto: [`Essa informação (${intencao.titulo.toLowerCase()}) fica com: **${quem}**. Com o seu perfil eu não consigo mostrar.`],
    acoes: [...sugestoesIniciais(perfil).slice(0, 3), MENU],
    humor: 'confuso',
  };
}

export function respostaSugestao(opcoes: Intencao[], lacunas: Lacunas): Resposta {
  const assunto = lacunas.nome
    ? `de **${lacunas.nome}**`
    : lacunas.grupo
      ? `do **${lacunas.grupo.nome}**`
      : lacunas.oficina
        ? `da oficina **${lacunas.oficina.nome}**`
        : null;
  return {
    texto: [assunto ? `O que você quer saber ${assunto}?` : 'Você quis dizer:'],
    acoes: [...opcoes.map((i): Acao => ({ tipo: 'executar', rotulo: i.sugestao, intencaoId: i.id, lacunas })), MENU],
  };
}
