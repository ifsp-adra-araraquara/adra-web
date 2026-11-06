import { ESCOLARIDADE_LABELS } from '../../../shared/enum/Escolaridade';
import { ESTADO_CIVIL_LABELS } from '../../../shared/enum/EstadoCivil';
import { PROGRAMA_TRANSFERENCIA_LABELS, ProgramaTransferencia } from '../../../shared/enum/ProgramaTransferencia';
import { SEXO_LABELS } from '../../../shared/enum/Sexo';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { EnderecoDTO } from '../../../shared/models/endereco/EnderecoDTO';
import { PreCadastroResponseDTO } from '../../../shared/models/precadastro/PreCadastro';
import { VinculoFamiliarResponseDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarResponseDTO';
import { formatarTelefone } from '../../../shared/utils/mascara.util';

/** Pessoa da família na ficha. Campo vazio sai como linha em branco para completar à mão. */
export interface PessoaFicha {
  nome: string;
  nascimento: string | null;
  cpf: string | null;
  telefone: string | null;
  escolaridade: string | null;
  estadoCivil: string | null;
  profissao: string | null;
  renda: number | null;
  parentesco: string | null;
}

/** Modelo neutro da ficha: o mesmo documento sai do pré-cadastro e do cadastro do atendido. */
export interface FichaCadastroSocial {
  crianca: { nome: string; nascimento: string | null; cpf: string | null; sexo: string | null };
  mae: PessoaFicha | null;
  pai: PessoaFicha | null;
  responsavelLegal: PessoaFicha | null;
  endereco: EnderecoDTO | null;
  rendaFamiliar: number | null;
  recebePrograma: boolean | null;
  programas: string[];
  nis: string | null;
  possuiProblemaSaude: boolean | null;
  problemaSaude: string | null;
  contatoEmergencia: string | null;
  eventosPasseios: boolean | null;
  irEmboraSozinho: boolean | null;
  quemBusca: string | null;
  aceiteLgpd: boolean | null;
  autorizaUsoImagem: boolean | null;
  cienteFrequencia: boolean | null;
}

const PREFIXO_EMERGENCIA = 'Contato de emergência: ';
const PREFIXO_QUEM_BUSCA = 'Quem busca: ';

function nomesDosProgramas(programas: ProgramaTransferencia[] | null | undefined, outro: string | null | undefined): string[] {
  return (programas ?? []).map((p) => (p === ProgramaTransferencia.OUTRO && outro ? outro : PROGRAMA_TRANSFERENCIA_LABELS[p]));
}

function rendaFamiliar(...rendas: (number | null | undefined)[]): number | null {
  const informadas = rendas.filter((r): r is number => r != null);
  return informadas.length ? informadas.reduce((total, r) => total + r, 0) : null;
}

/** Pré-cadastro (antes de aprovar): tudo o que a família respondeu. */
export function dePreCadastro(p: PreCadastroResponseDTO): FichaCadastroSocial {
  const { mae, pai, responsavelLegal: legal, transferencia: t, saude, autorizacoes: a, termos } = p.dados;
  const enderecoCrianca = p.dados.crianca?.endereco;
  return {
    crianca: { nome: p.nomeCompleto, nascimento: p.dataNascimento, cpf: p.cpf, sexo: p.sexo ? SEXO_LABELS[p.sexo] : null },
    mae: mae
      ? {
          nome: mae.nomeCompleto,
          nascimento: mae.dataNascimento,
          cpf: mae.cpf,
          telefone: mae.telefone,
          escolaridade: ESCOLARIDADE_LABELS[mae.escolaridade],
          estadoCivil: mae.estadoCivil ? ESTADO_CIVIL_LABELS[mae.estadoCivil] : mae.estadoCivilOutro,
          profissao: mae.profissao,
          renda: mae.renda,
          parentesco: 'Mãe',
        }
      : null,
    pai: pai
      ? {
          nome: pai.nomeCompleto,
          nascimento: null,
          cpf: pai.cpf,
          telefone: pai.telefone,
          escolaridade: null,
          estadoCivil: null,
          profissao: pai.profissao,
          renda: pai.renda,
          parentesco: 'Pai',
        }
      : null,
    responsavelLegal: legal
      ? {
          nome: legal.nomeCompleto,
          nascimento: null,
          cpf: legal.cpf,
          telefone: legal.telefone,
          escolaridade: null,
          estadoCivil: null,
          profissao: null,
          renda: null,
          parentesco: legal.parentesco,
        }
      : null,
    endereco: enderecoCrianca?.logradouro ? enderecoCrianca : (p.dados.enderecoFamilia ?? null),
    rendaFamiliar: rendaFamiliar(mae?.renda, pai?.renda),
    recebePrograma: t?.recebe ?? null,
    programas: nomesDosProgramas(t?.programas, t?.outro),
    nis: t?.nis ?? null,
    possuiProblemaSaude: saude?.possuiProblema ?? null,
    problemaSaude: saude?.descricao ?? null,
    contatoEmergencia: saude
      ? `${saude.contatoEmergenciaNome} — ${formatarTelefone(saude.contatoEmergenciaTelefone)}`
      : null,
    eventosPasseios: a?.eventosPasseios ?? null,
    irEmboraSozinho: a?.irEmboraSozinho ?? null,
    quemBusca: a?.quemBusca ?? null,
    aceiteLgpd: termos?.aceiteLgpd ?? null,
    autorizaUsoImagem: termos?.autorizaUsoImagem ?? null,
    cienteFrequencia: termos?.cienteFrequencia ?? null,
  };
}

function dePessoaVinculada(v: VinculoFamiliarResponseDTO): PessoaFicha {
  return {
    nome: v.nomeResponsavel,
    nascimento: v.dataNascimentoResponsavel ?? null,
    cpf: v.cpfResponsavel,
    telefone: v.telefoneResponsavel,
    escolaridade: v.escolaridadeResponsavel ? ESCOLARIDADE_LABELS[v.escolaridadeResponsavel] : null,
    estadoCivil: v.estadoCivilResponsavel ? ESTADO_CIVIL_LABELS[v.estadoCivilResponsavel] : null,
    profissao: v.profissaoResponsavel ?? null,
    renda: v.rendaResponsavel ?? null,
    parentesco: v.parentesco,
  };
}

/** Linha "Prefixo: texto" das observações (a aprovação do pré-cadastro grava assim). */
function linhaDasObservacoes(observacoes: string | null, prefixo: string): string | null {
  const linha = (observacoes ?? '').split('\n').find((l) => l.startsWith(prefixo));
  return linha ? linha.slice(prefixo.length) : null;
}

/** Ficha do atendido já cadastrado (FT-26). Mãe e pai saem pelo parentesco; o principal que sobrar é o responsável legal. */
export function deAssistido(a: AssistidoResponseDTO, vinculos: VinculoFamiliarResponseDTO[]): FichaCadastroSocial {
  const parentesco = (v: VinculoFamiliarResponseDTO) => (v.parentesco ?? '').trim().toLocaleLowerCase('pt-BR');
  const mae = vinculos.find((v) => parentesco(v) === 'mãe');
  const pai = vinculos.find((v) => parentesco(v) === 'pai');
  const outros = vinculos.filter((v) => v !== mae && v !== pai);
  const legal = outros.find((v) => v.responsavelPrincipal) ?? outros[0];
  const emergencia = vinculos.find((v) => v.contatoEmergencia);

  return {
    crianca: { nome: a.nomeCompleto, nascimento: a.dataNascimento, cpf: a.cpf, sexo: a.sexo ? SEXO_LABELS[a.sexo] : null },
    mae: mae ? dePessoaVinculada(mae) : null,
    pai: pai ? dePessoaVinculada(pai) : null,
    responsavelLegal: legal ? dePessoaVinculada(legal) : null,
    endereco: a.endereco ?? null,
    rendaFamiliar: a.rendaFamiliar ?? null,
    recebePrograma: a.recebeProgramaTransferencia ?? null,
    programas: nomesDosProgramas(a.programasTransferencia, a.programaTransferenciaOutro),
    nis: a.nis ?? null,
    possuiProblemaSaude: a.possuiProblemaSaude ?? null,
    problemaSaude: a.problemaSaude ?? null,
    contatoEmergencia: emergencia
      ? `${emergencia.nomeResponsavel}${emergencia.telefoneResponsavel ? ' — ' + formatarTelefone(emergencia.telefoneResponsavel) : ''}`
      : linhaDasObservacoes(a.observacoes, PREFIXO_EMERGENCIA),
    eventosPasseios: a.autorizaEventosPasseios ?? null,
    irEmboraSozinho: a.podeIrEmboraSozinho ?? null,
    quemBusca: linhaDasObservacoes(a.observacoes, PREFIXO_QUEM_BUSCA),
    aceiteLgpd: a.aceiteLgpd ?? null,
    autorizaUsoImagem: a.autorizaUsoImagem ?? null,
    cienteFrequencia: a.cienteFrequenciaObrigatoria ?? null,
  };
}
