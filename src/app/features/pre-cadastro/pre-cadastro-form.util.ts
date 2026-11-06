import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { Escolaridade } from '../../shared/enum/Escolaridade';
import { EstadoCivil } from '../../shared/enum/EstadoCivil';
import { ProgramaTransferencia } from '../../shared/enum/ProgramaTransferencia';
import { Sexo } from '../../shared/enum/Sexo';
import { EnderecoDTO } from '../../shared/models/endereco/EnderecoDTO';
import { PreCadastroRequestDTO } from '../../shared/models/precadastro/PreCadastro';
import { enderecoParaPayload, enderecoVazio } from '../../shared/utils/endereco.util';
import { cpfOpcional, cpfValido, cpfValidator } from '../../shared/validators/cpf.validator';

/** Valor do select de estado civil que abre o campo "Qual?" (o enum da API não tem OUTRO). */
export const ESTADO_CIVIL_OUTRO = 'OUTRO';

const TELEFONE = /^\d{10,11}$/;

export type ChaveEtapa = 'termos' | 'crianca' | 'responsaveis' | 'renda' | 'saude' | 'documentos' | 'revisao';

export const ETAPAS: { chave: ChaveEtapa; titulo: string }[] = [
  { chave: 'termos', titulo: 'Termos' },
  { chave: 'crianca', titulo: 'Atendido' },
  { chave: 'responsaveis', titulo: 'Responsáveis' },
  { chave: 'renda', titulo: 'Renda da família' },
  { chave: 'saude', titulo: 'Saúde e autorizações' },
  { chave: 'documentos', titulo: 'Documentos e foto' },
  { chave: 'revisao', titulo: 'Revisão' },
];

function enderecoComRua(): ValidatorFn {
  return (control) => ((control.value as EnderecoDTO | null)?.logradouro?.trim() ? null : { required: true });
}

function algumMarcado(): ValidatorFn {
  return (control) => ((control.value as unknown[] | null)?.length ? null : { required: true });
}

export function criarFormularioPreCadastro(fb: FormBuilder) {
  return fb.group({
    termos: fb.group({
      aceiteLgpd: fb.control<boolean | null>(null, Validators.requiredTrue),
      autorizaUsoImagem: fb.control<boolean | null>(null, Validators.required),
      cienteFrequencia: fb.control<boolean | null>(null, Validators.requiredTrue),
    }),
    crianca: fb.group({
      nomeCompleto: fb.nonNullable.control('', [Validators.required, Validators.maxLength(180)]),
      dataNascimento: fb.nonNullable.control('', Validators.required),
      cpf: fb.nonNullable.control('', cpfValidator()),
      sexo: fb.control<Sexo | null>(null, Validators.required),
      endereco: fb.nonNullable.control<EnderecoDTO>(enderecoVazio(), enderecoComRua()),
    }),
    responsaveis: fb.group({
      temMae: fb.nonNullable.control(true),
      mae: fb.group({
        nomeCompleto: fb.nonNullable.control('', [Validators.required, Validators.maxLength(180)]),
        dataNascimento: fb.nonNullable.control('', Validators.required),
        cpf: fb.nonNullable.control('', cpfValidator()),
        escolaridade: fb.control<Escolaridade | null>(null, Validators.required),
        estadoCivil: fb.control<EstadoCivil | typeof ESTADO_CIVIL_OUTRO | null>(null, Validators.required),
        estadoCivilOutro: fb.nonNullable.control('', [Validators.required, Validators.maxLength(60)]),
        profissao: fb.nonNullable.control('', Validators.maxLength(120)),
        renda: fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
        telefone: fb.nonNullable.control('', [Validators.required, Validators.pattern(TELEFONE)]),
      }),
      temPai: fb.nonNullable.control(false),
      pai: fb.group({
        nomeCompleto: fb.nonNullable.control('', [Validators.required, Validators.maxLength(180)]),
        cpf: fb.nonNullable.control('', cpfOpcional()),
        profissao: fb.nonNullable.control('', Validators.maxLength(120)),
        renda: fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
        telefone: fb.nonNullable.control('', Validators.pattern(TELEFONE)),
      }),
      temResponsavelLegal: fb.nonNullable.control(false),
      responsavelLegal: fb.group({
        nomeCompleto: fb.nonNullable.control('', [Validators.required, Validators.maxLength(180)]),
        parentesco: fb.nonNullable.control('', [Validators.required, Validators.maxLength(60)]),
        cpf: fb.nonNullable.control('', cpfOpcional()),
        telefone: fb.nonNullable.control('', [Validators.required, Validators.pattern(TELEFONE)]),
      }),
      mesmoEnderecoDaCrianca: fb.nonNullable.control(true),
      enderecoFamilia: fb.nonNullable.control<EnderecoDTO>(enderecoVazio(), enderecoComRua()),
      email: fb.nonNullable.control('', [Validators.email, Validators.maxLength(180)]),
    }),
    renda: fb.group({
      recebe: fb.control<boolean | null>(null, Validators.required),
      programas: fb.nonNullable.control<ProgramaTransferencia[]>([], algumMarcado()),
      outro: fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
      nis: fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{11}$/)]),
    }),
    saude: fb.group({
      possuiProblema: fb.control<boolean | null>(null, Validators.required),
      descricao: fb.nonNullable.control('', [Validators.required, Validators.maxLength(1000)]),
      contatoEmergenciaNome: fb.nonNullable.control('', [Validators.required, Validators.maxLength(180)]),
      contatoEmergenciaTelefone: fb.nonNullable.control('', [Validators.required, Validators.pattern(TELEFONE)]),
      eventosPasseios: fb.control<boolean | null>(null, Validators.required),
      irEmboraSozinho: fb.control<boolean | null>(null, Validators.required),
      quemBusca: fb.nonNullable.control('', [Validators.required, Validators.maxLength(500)]),
    }),
    site: fb.nonNullable.control(''),
  });
}

export type FormularioPreCadastro = ReturnType<typeof criarFormularioPreCadastro>;

function alternar(control: AbstractControl, ativo: boolean): void {
  if (ativo && control.disabled) control.enable({ emitEvent: false });
  if (!ativo && control.enabled) control.disable({ emitEvent: false });
}

/**
 * Liga só as perguntas que se aplicam às respostas atuais ("se sim, qual?").
 * Campo desligado não valida nem vai no envio — mesmas regras da API.
 */
export function aplicarCondicionais(form: FormularioPreCadastro): void {
  const r = form.controls.responsaveis.controls;
  const temMae = r.temMae.value;
  alternar(r.mae, temMae);
  alternar(r.mae.controls.estadoCivilOutro, temMae && r.mae.controls.estadoCivil.value === ESTADO_CIVIL_OUTRO);
  alternar(r.pai, r.temPai.value);
  alternar(r.responsavelLegal, !temMae || r.temResponsavelLegal.value);
  // Sem a mãe, o responsável legal vira o responsável principal: o CPF passa a ser obrigatório.
  const cpfLegal = r.responsavelLegal.controls.cpf;
  cpfLegal.setValidators(temMae ? cpfOpcional() : cpfValidator());
  cpfLegal.updateValueAndValidity({ emitEvent: false });
  alternar(r.enderecoFamilia, !r.mesmoEnderecoDaCrianca.value);

  const renda = form.controls.renda.controls;
  alternar(renda.programas, renda.recebe.value === true);
  alternar(renda.outro, renda.recebe.value === true && renda.programas.value.includes(ProgramaTransferencia.OUTRO));

  const saude = form.controls.saude.controls;
  alternar(saude.descricao, saude.possuiProblema.value === true);
  alternar(saude.quemBusca, saude.irEmboraSozinho.value === false);
}

/** Mensagem do campo depois que a pessoa passou por ele (ou tentou continuar). */
export function mensagemDoCampo(control: AbstractControl | null, formatoInvalido = 'Formato inválido'): string | null {
  if (!control || control.disabled || !control.touched || !control.errors) return null;
  const erros = control.errors;
  if (erros['required']) return 'Obrigatório';
  if (erros['cpfInvalido']) return 'CPF inválido';
  if (erros['email']) return 'E-mail inválido';
  if (erros['min']) return 'Valor inválido';
  if (erros['maxlength']) return 'Texto muito longo';
  if (erros['pattern']) return formatoInvalido;
  return null;
}

export const MENSAGEM_TELEFONE = 'Telefone com DDD (10 ou 11 dígitos)';

function texto(valor: string | null | undefined): string | null {
  return valor?.trim() || null;
}

/** Formulário → payload do POST público (o que está desligado não vai). */
export function paraPayload(form: FormularioPreCadastro): PreCadastroRequestDTO {
  const { termos, crianca, responsaveis: r, renda, saude, site } = form.getRawValue();
  const enderecoCrianca = enderecoParaPayload(crianca.endereco) ?? enderecoVazio();
  const estadoCivilOutro = r.mae.estadoCivil === ESTADO_CIVIL_OUTRO;
  const temLegal = !r.temMae || r.temResponsavelLegal;
  const recebe = renda.recebe === true;

  return {
    nomeCompleto: crianca.nomeCompleto.trim(),
    dataNascimento: crianca.dataNascimento,
    cpf: crianca.cpf,
    sexo: crianca.sexo as Sexo,
    email: texto(r.email),
    site,
    dados: {
      termos: {
        aceiteLgpd: termos.aceiteLgpd === true,
        autorizaUsoImagem: termos.autorizaUsoImagem === true,
        cienteFrequencia: termos.cienteFrequencia === true,
      },
      crianca: { endereco: enderecoCrianca },
      mae: r.temMae
        ? {
            nomeCompleto: r.mae.nomeCompleto.trim(),
            dataNascimento: r.mae.dataNascimento,
            cpf: r.mae.cpf,
            escolaridade: r.mae.escolaridade as Escolaridade,
            estadoCivil: estadoCivilOutro ? null : (r.mae.estadoCivil as EstadoCivil),
            estadoCivilOutro: estadoCivilOutro ? texto(r.mae.estadoCivilOutro) : null,
            profissao: texto(r.mae.profissao),
            renda: r.mae.renda ?? 0,
            telefone: r.mae.telefone,
          }
        : null,
      pai: r.temPai
        ? {
            nomeCompleto: r.pai.nomeCompleto.trim(),
            cpf: texto(r.pai.cpf),
            profissao: texto(r.pai.profissao),
            renda: r.pai.renda ?? 0,
            telefone: texto(r.pai.telefone),
          }
        : null,
      responsavelLegal: temLegal
        ? {
            nomeCompleto: r.responsavelLegal.nomeCompleto.trim(),
            parentesco: r.responsavelLegal.parentesco.trim(),
            cpf: texto(r.responsavelLegal.cpf),
            telefone: r.responsavelLegal.telefone,
          }
        : null,
      enderecoFamilia: r.mesmoEnderecoDaCrianca ? enderecoCrianca : (enderecoParaPayload(r.enderecoFamilia) ?? enderecoVazio()),
      transferencia: {
        recebe,
        programas: recebe ? renda.programas : [],
        outro: recebe && renda.programas.includes(ProgramaTransferencia.OUTRO) ? texto(renda.outro) : null,
        nis: texto(renda.nis),
      },
      saude: {
        possuiProblema: saude.possuiProblema === true,
        descricao: saude.possuiProblema ? texto(saude.descricao) : null,
        contatoEmergenciaNome: saude.contatoEmergenciaNome.trim(),
        contatoEmergenciaTelefone: saude.contatoEmergenciaTelefone,
      },
      autorizacoes: {
        eventosPasseios: saude.eventosPasseios === true,
        irEmboraSozinho: saude.irEmboraSozinho === true,
        quemBusca: saude.irEmboraSozinho === false ? texto(saude.quemBusca) : null,
      },
    },
  };
}
