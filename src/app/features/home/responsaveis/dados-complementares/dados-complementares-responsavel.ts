import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Input } from '../../../../shared/components/input/input';
import { Select, SelectOption } from '../../../../shared/components/select/select';
import { EnderecoForm } from '../../../../shared/components/endereco-form/endereco-form';
import { ResponsavelRequestDTO } from '../../../../shared/models/responsavel/ResponsavelRequestDTO';
import { ESCOLARIDADE_LABELS, Escolaridade } from '../../../../shared/enum/Escolaridade';
import { ESTADO_CIVIL_LABELS, EstadoCivil } from '../../../../shared/enum/EstadoCivil';
import { calcularIdade, hojeIso } from '../../../../shared/utils/idade.util';

export type DadosComplementaresResponsavel = Pick<
  ResponsavelRequestDTO,
  'dataNascimento' | 'escolaridade' | 'estadoCivil' | 'profissao' | 'renda' | 'endereco'
>;

export const ESCOLARIDADE_OPTIONS: SelectOption<Escolaridade | null>[] = [
  { value: null, label: 'Não informado' },
  ...Object.values(Escolaridade).map((e) => ({ value: e, label: ESCOLARIDADE_LABELS[e] })),
];

export const ESTADO_CIVIL_OPTIONS: SelectOption<EstadoCivil | null>[] = [
  { value: null, label: 'Não informado' },
  ...Object.values(EstadoCivil).map((e) => ({ value: e, label: ESTADO_CIVIL_LABELS[e] })),
];

/**
 * Data de nascimento (com idade), escolaridade, estado civil, profissão, renda e endereço do responsável
 * (formulários template-driven da tela de Assistidos).
 * Uso: `<app-dados-complementares-responsavel [(dados)]="novoResponsavel" />`.
 */
@Component({
  selector: 'app-dados-complementares-responsavel',
  imports: [FormsModule, Input, Select, EnderecoForm],
  templateUrl: './dados-complementares-responsavel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
})
export class DadosComplementaresResponsavelForm<T extends DadosComplementaresResponsavel> {
  dados = model.required<T>();

  protected readonly escolaridadeOptions = ESCOLARIDADE_OPTIONS;
  protected readonly estadoCivilOptions = ESTADO_CIVIL_OPTIONS;
  protected readonly hoje = hojeIso();
  protected readonly idade = computed(() => calcularIdade(this.dados().dataNascimento));

  protected atualizar<K extends keyof DadosComplementaresResponsavel>(campo: K, valor: T[K]): void {
    this.dados.update((atual) => ({ ...atual, [campo]: valor }));
  }
}
