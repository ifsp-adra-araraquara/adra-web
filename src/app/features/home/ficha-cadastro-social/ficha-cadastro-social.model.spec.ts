import { ProgramaTransferencia } from '../../../shared/enum/ProgramaTransferencia';
import { Sexo } from '../../../shared/enum/Sexo';
import { StatusGeral } from '../../../shared/enum/StatusGeral';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { PreCadastroResponseDTO } from '../../../shared/models/precadastro/PreCadastro';
import { VinculoFamiliarResponseDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarResponseDTO';
import { deAssistido, dePreCadastro } from './ficha-cadastro-social.model';

// Dados inventados.
const preCadastro = {
  preCadastroId: 1,
  nomeCompleto: 'Crianca Teste',
  dataNascimento: '2016-04-12',
  cpf: '56532228281',
  sexo: Sexo.FEMININO,
  email: null,
  responsavelNome: 'Avo Teste',
  responsavelTelefone: '16991112222',
  dados: {
    termos: { aceiteLgpd: true, autorizaUsoImagem: false },
    crianca: { endereco: null },
    mae: null,
    pai: { nomeCompleto: 'Pai Teste', cpf: null, profissao: null, renda: 800, telefone: null },
    responsavelLegal: { nomeCompleto: 'Avo Teste', parentesco: 'Avó', cpf: '39577220045', telefone: '16991112222' },
    enderecoFamilia: { logradouro: 'Rua das Flores', numero: '100', bairro: 'Centro', pontoReferencia: null },
    transferencia: { recebe: true, programas: [ProgramaTransferencia.OUTRO], outro: 'Bolsa Alimentação', nis: null },
    saude: { possuiProblema: false, descricao: null, contatoEmergenciaNome: 'Tia Teste', contatoEmergenciaTelefone: '16998765432' },
    autorizacoes: { eventosPasseios: true, irEmboraSozinho: false, quemBusca: 'Avó Teste' },
  },
  status: 'PENDENTE',
} as PreCadastroResponseDTO;

describe('ficha de cadastro social', () => {
  it('do pré-cadastro: usa o endereço da família, soma a renda e marca os termos', () => {
    const ficha = dePreCadastro(preCadastro);
    expect(ficha.mae).toBeNull();
    expect(ficha.responsavelLegal?.parentesco).toBe('Avó');
    expect(ficha.endereco?.logradouro).toBe('Rua das Flores');
    expect(ficha.rendaFamiliar).toBe(800);
    expect(ficha.programas).toEqual(['Bolsa Alimentação']);
    expect(ficha.contatoEmergencia).toBe('Tia Teste — (16) 99876-5432');
    expect(ficha.aceiteLgpd).toBe(true);
    expect(ficha.autorizaUsoImagem).toBe(false);
  });

  it('do atendido: separa mãe pelo parentesco e lê emergência e quem busca das observações', () => {
    const assistido = {
      assistidoId: 9,
      nomeCompleto: 'Crianca Teste',
      dataNascimento: '2016-04-12',
      cpf: '56532228281',
      observacoes: 'Contato de emergência: Tia Teste — (16) 99876-5432\nQuem busca: Avó Teste',
      status: StatusGeral.ATIVO,
      aceiteLgpd: true,
    } as AssistidoResponseDTO;
    const mae = {
      nomeResponsavel: 'Mae Teste',
      cpfResponsavel: '96234168493',
      telefoneResponsavel: '16991234567',
      parentesco: 'Mãe',
      responsavelPrincipal: true,
      contatoEmergencia: false,
    } as VinculoFamiliarResponseDTO;

    const ficha = deAssistido(assistido, [mae]);

    expect(ficha.mae?.nome).toBe('Mae Teste');
    expect(ficha.pai).toBeNull();
    expect(ficha.responsavelLegal).toBeNull();
    expect(ficha.contatoEmergencia).toBe('Tia Teste — (16) 99876-5432');
    expect(ficha.quemBusca).toBe('Avó Teste');
    expect(ficha.autorizaUsoImagem).toBeNull();
  });
});
