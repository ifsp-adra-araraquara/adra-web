import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';

import { Escolaridade } from '../../shared/enum/Escolaridade';
import { EstadoCivil } from '../../shared/enum/EstadoCivil';
import { ProgramaTransferencia } from '../../shared/enum/ProgramaTransferencia';
import { Sexo } from '../../shared/enum/Sexo';
import {
  ESTADO_CIVIL_OUTRO,
  FormularioPreCadastro,
  aplicarCondicionais,
  criarFormularioPreCadastro,
  paraPayload,
} from './pre-cadastro-form.util';
import { secoesRevisao } from './resumo-inscricao';

// Dados inventados (CPFs válidos gerados).
function formularioPreenchido(): FormularioPreCadastro {
  const form = criarFormularioPreCadastro(TestBed.inject(FormBuilder));
  form.patchValue({
    termos: { aceiteLgpd: true, autorizaUsoImagem: false, cienteFrequencia: true },
    crianca: {
      nomeCompleto: ' Crianca Teste ',
      dataNascimento: '2016-04-12',
      cpf: '56532228281',
      sexo: Sexo.FEMININO,
      endereco: { logradouro: 'Rua das Flores', numero: '100', bairro: 'Centro', pontoReferencia: '' },
    },
    responsaveis: {
      temMae: true,
      mae: {
        nomeCompleto: 'Mae Teste',
        dataNascimento: '1990-01-20',
        cpf: '96234168493',
        escolaridade: Escolaridade.MEDIO_COMPLETO,
        estadoCivil: EstadoCivil.SOLTEIRO,
        renda: 1500,
        telefone: '16991234567',
      },
    },
    renda: { recebe: false, nis: '12345678901' },
    saude: {
      possuiProblema: false,
      contatoEmergenciaNome: 'Tia Teste',
      contatoEmergenciaTelefone: '16998765432',
      eventosPasseios: true,
      irEmboraSozinho: true,
    },
  });
  aplicarCondicionais(form);
  return form;
}

describe('pre-cadastro-form.util', () => {
  it('NIS e regra de frequência são obrigatórios', () => {
    const form = TestBed.inject(FormBuilder);
    const { renda, termos } = criarFormularioPreCadastro(form).controls;

    expect(renda.controls.nis.hasError('required')).toBe(true);
    expect(termos.controls.cienteFrequencia.hasError('required')).toBe(true);

    renda.controls.nis.setValue('123');
    expect(renda.controls.nis.hasError('pattern')).toBe(true);

    renda.controls.nis.setValue('12345678901');
    termos.controls.cienteFrequencia.setValue(false);
    expect(renda.controls.nis.valid).toBe(true);
    expect(termos.controls.cienteFrequencia.valid).toBe(false);
  });

  it('formulário completo fica válido e o "se sim, qual?" só é exigido no Sim', () => {
    const form = formularioPreenchido();
    expect(form.valid).toBe(true);

    form.controls.saude.controls.possuiProblema.setValue(true);
    aplicarCondicionais(form);
    expect(form.controls.saude.controls.descricao.enabled).toBe(true);
    expect(form.controls.saude.valid).toBe(false);

    form.controls.saude.controls.irEmboraSozinho.setValue(false);
    aplicarCondicionais(form);
    expect(form.controls.saude.controls.quemBusca.hasError('required')).toBe(true);

    form.controls.renda.controls.recebe.setValue(true);
    aplicarCondicionais(form);
    expect(form.controls.renda.valid).toBe(false);
    form.controls.renda.controls.programas.setValue([ProgramaTransferencia.OUTRO]);
    aplicarCondicionais(form);
    expect(form.controls.renda.controls.outro.enabled).toBe(true);
    expect(form.controls.renda.valid).toBe(false);
  });

  it('sem a mãe, o responsável legal passa a ser obrigatório e com CPF', () => {
    const form = formularioPreenchido();
    const r = form.controls.responsaveis.controls;
    r.temMae.setValue(false);
    aplicarCondicionais(form);

    expect(r.mae.disabled).toBe(true);
    expect(r.responsavelLegal.enabled).toBe(true);
    r.responsavelLegal.patchValue({ nomeCompleto: 'Avo Teste', parentesco: 'Avó', telefone: '16991112222' });
    expect(r.responsavelLegal.controls.cpf.hasError('required')).toBe(true);
    r.responsavelLegal.controls.cpf.setValue('39577220045');
    expect(form.controls.responsaveis.valid).toBe(true);
  });

  it('monta o payload só com o que se aplica', () => {
    const form = formularioPreenchido();
    form.controls.responsaveis.controls.mae.controls.estadoCivil.setValue(ESTADO_CIVIL_OUTRO);
    aplicarCondicionais(form);
    form.controls.responsaveis.controls.mae.controls.estadoCivilOutro.setValue('Amasiada');
    form.controls.saude.controls.descricao.setValue('não devia ir');

    const payload = paraPayload(form);

    expect(payload.nomeCompleto).toBe('Crianca Teste');
    expect(payload.dados.mae?.estadoCivil).toBeNull();
    expect(payload.dados.mae?.estadoCivilOutro).toBe('Amasiada');
    expect(payload.dados.pai).toBeNull();
    expect(payload.dados.responsavelLegal).toBeNull();
    expect(payload.dados.enderecoFamilia.logradouro).toBe('Rua das Flores');
    expect(payload.dados.saude.descricao).toBeNull();
    expect(payload.dados.transferencia.programas).toEqual([]);
    expect(payload.dados.autorizacoes.quemBusca).toBeNull();
  });

  it('a revisão mostra as respostas por seção', () => {
    const secoes = secoesRevisao(paraPayload(formularioPreenchido()));
    expect(secoes.map((s) => s.chave)).toEqual(['termos', 'crianca', 'responsaveis', 'renda', 'saude']);
    const crianca = secoes.find((s) => s.chave === 'crianca')!;
    expect(crianca.itens).toContainEqual({ rotulo: 'CPF', valor: '565.322.282-81' });
    expect(secoes.find((s) => s.chave === 'renda')!.itens[0].valor).toBe('Não recebe');
  });
});
