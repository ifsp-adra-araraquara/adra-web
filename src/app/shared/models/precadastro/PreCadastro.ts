import { Escolaridade } from '../../enum/Escolaridade';
import { EstadoCivil } from '../../enum/EstadoCivil';
import { ProgramaTransferencia } from '../../enum/ProgramaTransferencia';
import { Sexo } from '../../enum/Sexo';
import { ArquivoResponseDTO } from '../arquivo/ArquivoResponseDTO';
import { EnderecoDTO } from '../endereco/EnderecoDTO';

/** Respostas do formulário de inscrição além das colunas (espelha PreCadastroDadosDTO da API). */
export interface PreCadastroDadosDTO {
  termos: { aceiteLgpd: boolean; autorizaUsoImagem: boolean; cienteFrequencia: boolean };
  crianca: { endereco: EnderecoDTO | null } | null;
  mae: {
    nomeCompleto: string;
    dataNascimento: string;
    cpf: string;
    escolaridade: Escolaridade;
    estadoCivil: EstadoCivil | null;
    estadoCivilOutro: string | null;
    profissao: string | null;
    renda: number;
    telefone: string;
  } | null;
  pai: {
    nomeCompleto: string;
    cpf: string | null;
    profissao: string | null;
    renda: number;
    telefone: string | null;
  } | null;
  responsavelLegal: {
    nomeCompleto: string;
    parentesco: string;
    cpf: string | null;
    telefone: string;
  } | null;
  enderecoFamilia: EnderecoDTO;
  transferencia: {
    recebe: boolean;
    programas: ProgramaTransferencia[];
    outro: string | null;
    nis: string | null;
  };
  saude: {
    possuiProblema: boolean;
    descricao: string | null;
    contatoEmergenciaNome: string;
    contatoEmergenciaTelefone: string;
  };
  autorizacoes: { eventosPasseios: boolean; irEmboraSozinho: boolean; quemBusca: string | null };
}

export interface PreCadastroRequestDTO {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  sexo: Sexo;
  email: string | null;
  dados: PreCadastroDadosDTO;
  /** Honeypot: sempre vazio para humanos; se vier preenchido, o backend descarta como robô. */
  site: string;
}

export type StatusPreCadastro = 'PENDENTE' | 'LISTA_ESPERA' | 'CONVERTIDO' | 'DESCARTADO';

export function emAvaliacao(status: StatusPreCadastro): boolean {
  return status === 'PENDENTE' || status === 'LISTA_ESPERA';
}

export interface PreCadastroResumoDTO {
  preCadastroId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  idade: number | null;
  responsavelNome: string;
  responsavelTelefone: string | null;
  criadoEm: string;
  status: StatusPreCadastro;
  cpfJaCadastrado: boolean;
  assistidoId: number | null;
  /** O que a família não enviou ("Foto da criança"...). Vazio depois de aprovado. */
  anexosFaltando: string[];
  rendaFamiliar: number | null;
  possuiProblemaSaude: boolean | null;
  programasTransferencia: ProgramaTransferencia[];
  vistoAssistenteSocial: boolean;
  /** Ano letivo da inscrição. */
  anoReferencia: number;
}

/** Comprovante de endereço (obrigatório), foto e documentos enviados junto com a inscrição. */
export interface AnexosPreCadastro {
  foto: File | null;
  documentosCrianca: File[];
  documentosResponsavel: File[];
  comprovanteEndereco: File[];
}

export interface PreCadastroResponseDTO {
  preCadastroId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  cpf: string | null;
  sexo: Sexo | null;
  email: string | null;
  responsavelNome: string;
  responsavelTelefone: string | null;
  /** Pré-cadastros do formulário antigo vêm com os blocos vazios. */
  dados: Partial<PreCadastroDadosDTO>;
  status: StatusPreCadastro;
  motivoReprovacao: string | null;
  observacao: string | null;
  assistidoId: number | null;
  /** Ano letivo da inscrição. */
  anoReferencia: number;
  /** Atendido que já tem este CPF: é rematrícula. */
  assistidoExistenteId: number | null;
  /** O atendido existente já tem matrícula no ano da inscrição. */
  jaMatriculadoNoAno: boolean;
  /** Foto e documentos enviados (até a aprovação; depois ficam no atendido e no responsável). */
  arquivos: ArquivoResponseDTO[];
  anexosFaltando: string[];
  revisadoPorNome: string | null;
  revisadoEm: string | null;
  criadoEm: string;
}
