import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { Button } from '../../../shared/components/button/button';
import { EnderecoForm } from '../../../shared/components/endereco-form/endereco-form';
import { EscolhaSimNao } from '../../../shared/components/escolha-sim-nao/escolha-sim-nao';
import { Icon } from '../../../shared/components/icon/icon';
import { Input } from '../../../shared/components/input/input';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { ESCOLARIDADE_LABELS, Escolaridade } from '../../../shared/enum/Escolaridade';
import { ESTADO_CIVIL_LABELS, EstadoCivil } from '../../../shared/enum/EstadoCivil';
import { ESTADO_CIVIL_OUTRO, FormularioPreCadastro, MENSAGEM_TELEFONE, mensagemDoCampo } from '../pre-cadastro-form.util';

type Grupo = FormularioPreCadastro['controls']['responsaveis'];

@Component({
  selector: 'app-etapa-responsaveis',
  imports: [ReactiveFormsModule, Input, Select, EnderecoForm, EscolhaSimNao, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './etapa-responsaveis.html',
  styleUrl: './etapas.css',
})
export class EtapaResponsaveis {
  grupo = input.required<Grupo>();
  tentativa = input(0);

  protected readonly MENSAGEM_TELEFONE = MENSAGEM_TELEFONE;
  protected readonly ESTADO_CIVIL_OUTRO = ESTADO_CIVIL_OUTRO;

  protected readonly escolaridadeOptions: SelectOption<Escolaridade>[] = Object.values(Escolaridade).map((valor) => ({
    value: valor,
    label: ESCOLARIDADE_LABELS[valor],
  }));

  protected readonly estadoCivilOptions: SelectOption<EstadoCivil | typeof ESTADO_CIVIL_OUTRO>[] = [
    ...Object.values(EstadoCivil).map((valor) => ({ value: valor, label: ESTADO_CIVIL_LABELS[valor] })),
    { value: ESTADO_CIVIL_OUTRO, label: 'Outro' },
  ];

  /** Ex.: erro('mae.cpf'). */
  protected erro(caminho: string, formatoInvalido?: string): string | null {
    return mensagemDoCampo(this.grupo().get(caminho), formatoInvalido);
  }

  protected incluir(campo: 'temPai' | 'temResponsavelLegal', incluir: boolean): void {
    this.grupo().controls[campo].setValue(incluir);
  }
}
