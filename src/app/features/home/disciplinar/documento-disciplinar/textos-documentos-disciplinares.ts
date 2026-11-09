import { NivelDisciplinar } from '../../../../shared/enum/NivelDisciplinar';
import { Sexo } from '../../../../shared/enum/Sexo';
import { RegistroDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import { dataBr } from '../../../../shared/utils/disciplinar.util';

/**
 * FT-25: textos dos documentos disciplinares, transcritos dos modelos da ADRA
 * ("Carta de Advertência Educativa", "... por acúmulo de 03 ocorrências" e
 * "Termo de Suspensão Educativa"). A carta é individual: usa só os dados do
 * próprio registro, nunca outros atendidos do mesmo fato (LGPD).
 */

export type ModeloDocumento = 'ADVERTENCIA_FATO' | 'ADVERTENCIA_ACUMULO' | 'SUSPENSAO' | 'UNIFORME' | 'OCORRENCIA';

export interface TextoDocumento {
  titulo: string;
  /** "Prezados responsáveis," — só no comunicado de uniforme, como no modelo antigo. */
  saudacao: string | null;
  paragrafos: string[];
}

export interface PronomeAtendido {
  /** "o atendido" */
  o: string;
  /** "O atendido" */
  O: string;
  /** "do atendido" */
  do: string;
  /** Final dos adjetivos: orientad{o}. */
  fim: string;
}

type DadosDocumento = Pick<
  RegistroDisciplinarDTO,
  | 'nivel'
  | 'origem'
  | 'nomeAssistido'
  | 'sexoAssistido'
  | 'motivo'
  | 'descricao'
  | 'sequencia'
  | 'dataRegistro'
  | 'suspensaoInicio'
  | 'suspensaoFim'
  | 'suspensaoDiasDeAtividade'
  | 'suspensaoRetorno'
>;

const ORDINAIS = ['PRIMEIRA', 'SEGUNDA', 'TERCEIRA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÉTIMA', 'OITAVA', 'NONA', 'DÉCIMA'];
const DIAS_DA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const NUMEROS = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
];

export function modeloDocumento(r: Pick<RegistroDisciplinarDTO, 'nivel' | 'origem'>): ModeloDocumento {
  switch (r.nivel) {
    case NivelDisciplinar.ADVERTENCIA:
      return r.origem === 'RECOMENDACAO' ? 'ADVERTENCIA_ACUMULO' : 'ADVERTENCIA_FATO';
    case NivelDisciplinar.SUSPENSAO:
      return 'SUSPENSAO';
    case NivelDisciplinar.UNIFORME:
      return 'UNIFORME';
    default:
      return 'OCORRENCIA';
  }
}

export function pronomeAtendido(sexo: Sexo | null): PronomeAtendido {
  if (sexo === Sexo.FEMININO) return { o: 'a atendida', O: 'A atendida', do: 'da atendida', fim: 'a' };
  if (sexo === Sexo.MASCULINO) return { o: 'o atendido', O: 'O atendido', do: 'do atendido', fim: 'o' };
  return { o: 'o(a) atendido(a)', O: 'O(a) atendido(a)', do: 'do(a) atendido(a)', fim: 'o(a)' };
}

/** Dias de segunda a sexta entre as duas datas, incluindo as pontas. Feriados entram com o calendário (FT-16). */
export function diasUteis(inicio: string, fim: string): number {
  let dias = 0;
  for (let data = paraData(inicio); data <= paraData(fim); data.setDate(data.getDate() + 1)) {
    if (ehDiaUtil(data)) dias++;
  }
  return dias;
}

/** Primeiro dia de segunda a sexta depois da data (retorno da suspensão). */
export function proximoDiaUtil(iso: string): string {
  const data = paraData(iso);
  do {
    data.setDate(data.getDate() + 1);
  } while (!ehDiaUtil(data));
  return paraIso(data);
}

export function diaDaSemana(iso: string): string {
  return DIAS_DA_SEMANA[paraData(iso).getDay()];
}

/** 3 → "03 (três)", como nos modelos da ADRA. */
export function numeroPorExtenso(n: number): string {
  const extenso = n <= 20 ? NUMEROS[n] : n % 10 === 0 ? 'trinta' : `vinte e ${NUMEROS[n % 10]}`;
  return `${String(n).padStart(2, '0')} (${extenso})`;
}

export function textoDocumento(r: DadosDocumento): TextoDocumento {
  const p = pronomeAtendido(r.sexoAssistido);
  const nome = r.nomeAssistido.toUpperCase();
  const orientado = `${p.O} foi orientad${p.fim} quanto à importância de respeitar as regras da instituição, as orientações da equipe e manter uma conduta adequada durante sua permanência e participação nas atividades da ADRA.`;
  const reincidencia =
    'Informamos ainda que, conforme previsto na Cartilha de Disciplina da ADRA, a reincidência de advertências poderá acarretar medidas disciplinares mais restritivas, incluindo suspensão temporária das atividades.';
  const parceria = `Contamos com a parceria da família no acompanhamento e orientação ${p.do}, visando à adequação às normas institucionais e ao pleno aproveitamento das atividades ofertadas.`;
  const devolucao = 'Solicitamos a devolução desta ADVERTÊNCIA, devidamente ASSINADA pelo responsável.';
  const educativo = `Reforçamos que nosso objetivo é educativo, buscando orientar, corrigir e apoiar o desenvolvimento integral ${p.do}. Permanecemos à disposição para o diálogo e contamos com a parceria da família na condução desse processo.`;

  switch (modeloDocumento(r)) {
    case 'ADVERTENCIA_FATO':
      return {
        titulo: 'Carta de Advertência Educativa',
        saudacao: null,
        paragrafos: [
          `Comunicamos que ${p.o} ${nome} está recebendo a presente advertência em decorrência de ${r.motivo.toLowerCase()}.`,
          r.descricao,
          orientado,
          reincidencia,
          parceria,
          devolucao,
          educativo,
        ],
      };
    case 'ADVERTENCIA_ACUMULO':
      return {
        titulo: 'Carta de Advertência Educativa',
        saudacao: null,
        paragrafos: [
          `Comunicamos que ${p.o} ${nome} está recebendo a presente advertência em decorrência do acúmulo de 03 (três) ocorrências disciplinares, conforme previsto na Cartilha de Disciplina da ADRA.`,
          'As ocorrências registradas referem-se a comportamentos inadequados e incompatíveis com as normas de convivência estabelecidas pela instituição. Diante do acúmulo das três ocorrências, aplica-se a presente advertência, conforme os procedimentos disciplinares adotados pela ADRA.',
          orientado,
          'Ressaltamos que as normas e diretrizes da ADRA têm como objetivo assegurar um ambiente organizado, seguro e respeitoso, favorecendo o desenvolvimento das atividades socioeducativas e a convivência saudável entre todos os participantes.',
          reincidencia,
          parceria,
          devolucao,
          educativo,
        ],
      };
    case 'SUSPENSAO': {
      // Dias de atividade do grupo e retorno vêm da API (reunião de 05/11); sem eles, conta de segunda a sexta.
      const dias = r.suspensaoDiasDeAtividade ?? diasUteis(r.suspensaoInicio!, r.suspensaoFim!);
      const retorno = r.suspensaoRetorno ?? proximoDiaUtil(r.suspensaoFim!);
      const causa = r.origem === 'RECOMENDACAO' ? 'ao acúmulo de 03 (três) advertências' : `a ${semPontoFinal(r.descricao)}`;
      return {
        titulo: 'Termo de Suspensão Educativa',
        saudacao: null,
        paragrafos: [
          `Comunicamos, por meio desta, que ${p.o} ${nome} receberá suspensão das atividades do projeto, conforme previsto na Cartilha de Disciplina da ADRA.`,
          `A ocorrência que resultou na presente medida refere-se ${causa}.`,
          'Tal comportamento é incompatível com os princípios e normas de convivência da ADRA, que prezam pelo respeito, pela dignidade, pela diversidade e pela convivência harmoniosa entre todos os atendidos.',
          'A presente medida possui caráter educativo e orientador, visando promover a reflexão sobre as atitudes praticadas, suas consequências para a convivência coletiva e a importância do respeito aos educadores, colegas e às diferenças presentes em nosso ambiente socioeducativo.',
          'Solicitamos o comparecimento do responsável para ciência e alinhamento das orientações institucionais, reforçando a importância do acompanhamento familiar para prevenção de novas ocorrências.',
          `${p.O} deverá cumprir suspensão pelo período de ${numeroPorExtenso(dias)} ${dias === 1 ? 'dia' : 'dias'}, podendo retornar às atividades no dia ${dataBr(retorno)} (${diaDaSemana(retorno)}).`,
          educativo,
        ],
      };
    }
    case 'UNIFORME':
      return {
        titulo: 'Comunicado – Uso do uniforme',
        saudacao: 'Prezados responsáveis,',
        paragrafos: [
          `Comunicamos que ${p.o} ${nome} compareceu ao projeto sem o uniforme obrigatório, conforme estabelecido nas normas internas da ADRA.`,
          'O uso do uniforme é obrigatório durante as atividades, por questões de organização, identificação e segurança, sendo o mesmo fornecido pela instituição.',
          `Esta é a ${ORDINAIS[r.sequencia - 1] ?? `${r.sequencia}ª`} ocorrência registrada por não utilização do uniforme.`,
          `Informamos que, ao completar três ocorrências, ${p.o} somente poderá retornar às atividades acompanhad${p.fim} do responsável, para conversa e alinhamento junto à coordenação.`,
          'Solicitamos a devolução deste comunicado devidamente assinado no próximo dia de participação.',
          'Contamos com a parceria da família para o cumprimento das normas do projeto.',
        ],
      };
    case 'OCORRENCIA':
      // Provisório: texto nosso até a ADRA mandar o modelo do comunicado de ocorrência.
      return {
        titulo: 'Comunicado de Ocorrência',
        saudacao: null,
        paragrafos: [
          `Comunicamos que ${p.o} ${nome} teve registrada, em ${dataBr(r.dataRegistro)}, a sua ${r.sequencia}ª ocorrência disciplinar, em decorrência de ${r.motivo.toLowerCase()}.`,
          r.descricao,
          'Conforme a Cartilha de Disciplina da ADRA, ao completar 03 (três) ocorrências é enviada advertência escrita para ciência e assinatura do responsável.',
          `Contamos com a parceria da família no acompanhamento e orientação ${p.do}.`,
        ],
      };
  }
}

function semPontoFinal(texto: string): string {
  return texto.trim().replace(/[.!]+$/, '');
}

function ehDiaUtil(data: Date): boolean {
  return data.getDay() !== 0 && data.getDay() !== 6;
}

function paraData(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}

function paraIso(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}
