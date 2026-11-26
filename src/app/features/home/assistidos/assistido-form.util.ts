import { SelectOption } from '../../../shared/components/select/select';
import { ProgramaTransferencia } from '../../../shared/enum/ProgramaTransferencia';
import { AssistidoRequestDTO } from '../../../shared/models/assistido/AssistidoRequestDTO';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { ResponsavelRequestDTO } from '../../../shared/models/responsavel/ResponsavelRequestDTO';
import { VinculoFamiliarComResponsavelRequestDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarComResponsavelRequestDTO';
import { enderecoParaForm, enderecoParaPayload } from '../../../shared/utils/endereco.util';
import { cpfValido, telefoneValido } from '../../../shared/validators/cpf.validator';

/**
 * Formulário de assistido e de responsável — compartilhado entre a página
 * de cadastro (assistido-novo) e os modais de edição da listagem.
 */

/** Responsável informado no cadastro, com os dados do vínculo; só vai para o banco junto com o assistido. */
export interface ResponsavelPendente extends ResponsavelRequestDTO {
  parentesco: string;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
  /** Preenchido quando a pessoa já tinha cadastro: ela é só vinculada, não recadastrada. */
  responsavelId?: number | null;
}

export const PARENTESCO_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'Selecione' },
  { value: 'Mãe', label: 'Mãe' },
  { value: 'Pai', label: 'Pai' },
  { value: 'Avó/Avô', label: 'Avó/Avô' },
  { value: 'Tio/Tia', label: 'Tio/Tia' },
  { value: 'Responsável legal', label: 'Responsável legal' },
];

export function assistidoVazio(): AssistidoRequestDTO {
  return {
    nomeCompleto: '',
    dataNascimento: '',
    cpf: '',
    dataEntrada: '',
    necessidadesEspecificas: '',
    observacoes: '',
    turmaId: null,
    sexo: null,
    possuiProblemaSaude: null,
    problemaSaude: '',
    pcd: null,
    deficiencia: '',
    escolaNome: '',
    escolaAnoSerie: '',
    escolaTurno: null,
    estudaContraturno: null,
    endereco: enderecoParaForm(null),
    rendaFamiliar: null,
    recebeProgramaTransferencia: null,
    programasTransferencia: [],
    programaTransferenciaOutro: '',
    nis: '',
    aceiteLgpd: false,
    autorizaUsoImagem: false,
    autorizaEventosPasseios: false,
    podeIrEmboraSozinho: false,
    cienteFrequenciaObrigatoria: false,
    responsaveis: [],
  };
}

export function responsavelVazio(): ResponsavelPendente {
  return {
    nomeCompleto: '',
    dataNascimento: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco: enderecoParaForm(null),
    observacoes: '',
    escolaridade: null,
    estadoCivil: null,
    profissao: '',
    renda: null,
    parentesco: '',
    responsavelPrincipal: false,
    contatoEmergencia: false,
    autorizadoRetirada: false,
  };
}

export function validarResponsavel(responsavel: { nomeCompleto: string; cpf?: string; telefone?: string; renda?: number | null }): string | null {
  if (!responsavel.nomeCompleto.trim()) {
    return 'Informe o nome do responsável.';
  }
  if (responsavel.cpf && !cpfValido(responsavel.cpf)) {
    return 'Informe um CPF válido para o responsável.';
  }
  if (!telefoneValido(responsavel.telefone ?? '')) {
    return 'Telefone do responsável deve ter DDD + número (10 ou 11 dígitos).';
  }
  if (responsavel.renda == null || responsavel.renda < 0) {
    return 'Informe a renda mensal do responsável.';
  }
  return null;
}

/** "Qual?" é obrigatório quando problema de saúde / PcD está marcado como Sim (mesma regra do back). */
export function validarDadosComplementares(dados: AssistidoRequestDTO): string | null {
  if (dados.possuiProblemaSaude && !dados.problemaSaude?.trim()) {
    return 'Informe qual é o problema de saúde do atendido.';
  }
  if (dados.pcd && !dados.deficiencia?.trim()) {
    return 'Informe qual é a deficiência do atendido.';
  }
  if (dados.recebeProgramaTransferencia) {
    const programas = dados.programasTransferencia ?? [];
    if (programas.length === 0) {
      return 'Marque qual programa de transferência de renda a família recebe.';
    }
    if (programas.includes(ProgramaTransferencia.OUTRO) && !dados.programaTransferenciaOutro?.trim()) {
      return 'Informe o nome do outro programa de transferência de renda.';
    }
  }
  if (dados.nis && dados.nis.length !== 11) {
    return 'NIS / CadÚnico deve ter 11 dígitos.';
  }
  return null;
}

/** Normaliza o form antes de enviar: endereço vazio vira null e descrições só vão com o indicador marcado. */
export function paraPayloadAssistido(dados: AssistidoRequestDTO): AssistidoRequestDTO {
  return {
    ...dados,
    problemaSaude: dados.possuiProblemaSaude ? dados.problemaSaude?.trim() || null : null,
    deficiencia: dados.pcd ? dados.deficiencia?.trim() || null : null,
    escolaNome: dados.escolaNome?.trim() || null,
    escolaAnoSerie: dados.escolaAnoSerie?.trim() || null,
    endereco: enderecoParaPayload(dados.endereco),
    programasTransferencia: dados.recebeProgramaTransferencia ? (dados.programasTransferencia ?? []) : [],
    programaTransferenciaOutro:
      dados.recebeProgramaTransferencia && dados.programasTransferencia?.includes(ProgramaTransferencia.OUTRO)
        ? dados.programaTransferenciaOutro?.trim() || null
        : null,
    nis: dados.nis?.replace(/\D/g, '') || null,
  };
}

/**
 * Responsável preenchido no front -> payload "cadastrar e vincular". Para quem
 * já tem cadastro, a API acha pelo id e só cria o vínculo.
 */
export function paraVinculoComResponsavel(
  responsavel: ResponsavelPendente,
  responsavelPrincipal = responsavel.responsavelPrincipal,
): VinculoFamiliarComResponsavelRequestDTO {
  return {
    nomeCompleto: responsavel.nomeCompleto,
    dataNascimento: responsavel.dataNascimento || undefined,
    cpf: responsavel.cpf || undefined,
    telefone: responsavel.telefone || undefined,
    email: responsavel.email || undefined,
    endereco: enderecoParaPayload(responsavel.endereco),
    observacoes: responsavel.observacoes || undefined,
    escolaridade: responsavel.escolaridade ?? null,
    estadoCivil: responsavel.estadoCivil ?? null,
    profissao: responsavel.profissao?.trim() || null,
    renda: responsavel.renda ?? null,
    parentesco: responsavel.parentesco || undefined,
    responsavelPrincipal,
    contatoEmergencia: responsavel.contatoEmergencia,
    autorizadoRetirada: responsavel.autorizadoRetirada,
    responsavelId: responsavel.responsavelId,
  };
}

/** Request completo (PUT substitui o cadastro inteiro) a partir do que a API devolveu. */
export function formDoAssistido(assistido: AssistidoResponseDTO): AssistidoRequestDTO {
  return {
    nomeCompleto: assistido.nomeCompleto,
    dataNascimento: assistido.dataNascimento ?? '',
    cpf: assistido.cpf ?? '',
    dataEntrada: assistido.dataEntrada ?? '',
    necessidadesEspecificas: assistido.necessidadesEspecificas ?? '',
    observacoes: assistido.observacoes ?? '',
    turmaId: assistido.turmaId ?? null,
    sexo: assistido.sexo ?? null,
    possuiProblemaSaude: assistido.possuiProblemaSaude ?? null,
    problemaSaude: assistido.problemaSaude ?? '',
    pcd: assistido.pcd ?? null,
    deficiencia: assistido.deficiencia ?? '',
    escolaNome: assistido.escolaNome ?? '',
    escolaAnoSerie: assistido.escolaAnoSerie ?? '',
    escolaTurno: assistido.escolaTurno ?? null,
    estudaContraturno: assistido.estudaContraturno ?? null,
    endereco: enderecoParaForm(assistido.endereco),
    rendaFamiliar: assistido.rendaFamiliar ?? null,
    recebeProgramaTransferencia: assistido.recebeProgramaTransferencia ?? null,
    programasTransferencia: [...(assistido.programasTransferencia ?? [])],
    programaTransferenciaOutro: assistido.programaTransferenciaOutro ?? '',
    nis: assistido.nis ?? '',
    aceiteLgpd: assistido.aceiteLgpd ?? false,
    autorizaUsoImagem: assistido.autorizaUsoImagem ?? false,
    autorizaEventosPasseios: assistido.autorizaEventosPasseios ?? false,
    podeIrEmboraSozinho: assistido.podeIrEmboraSozinho ?? false,
    cienteFrequenciaObrigatoria: assistido.cienteFrequenciaObrigatoria ?? false,
    // Sem `responsaveis`: a API reconcilia os vínculos se a lista vier, mesmo vazia.
    // Responsáveis se editam na aba "Família".
  };
}
