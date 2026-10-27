import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Input } from '../../../../shared/components/input/input';
import { Select, SelectOption } from '../../../../shared/components/select/select';
import { EnderecoForm } from '../../../../shared/components/endereco-form/endereco-form';
import { Button } from '../../../../shared/components/button/button';
import { AssistidoRequestDTO } from '../../../../shared/models/assistido/AssistidoRequestDTO';
import { EnderecoDTO } from '../../../../shared/models/endereco/EnderecoDTO';
import { SEXO_LABELS, Sexo } from '../../../../shared/enum/Sexo';
import { TURNOS_DISPONIVEIS, Turno } from '../../../../shared/enum/Turno';
import { enderecoParaForm, enderecoParaPayload } from '../../../../shared/utils/endereco.util';

export type DadosComplementaresAssistido = Pick<
  AssistidoRequestDTO,
  | 'sexo'
  | 'possuiProblemaSaude'
  | 'problemaSaude'
  | 'pcd'
  | 'deficiencia'
  | 'escolaNome'
  | 'escolaAnoSerie'
  | 'escolaTurno'
  | 'estudaContraturno'
  | 'endereco'
>;

const SIM_NAO: SelectOption<boolean | null>[] = [
  { value: null, label: 'Não informado' },
  { value: true, label: 'Sim' },
  { value: false, label: 'Não' },
];

/** Opções de sexo — também usadas por quem desenha o campo fora do bloco (`exibirSexo=false`). */
export const SEXO_OPTIONS: SelectOption<Sexo | null>[] = [
  { value: null, label: 'Não informado' },
  ...Object.values(Sexo).map((sexo) => ({ value: sexo, label: SEXO_LABELS[sexo] })),
];

/**
 * Sexo, saúde/PCD, escola e endereço do assistido — mesmo bloco no cadastro e na edição.
 * Two-way no objeto do formulário pai: `<app-dados-complementares-assistido [(dados)]="form" />`.
 */
@Component({
  selector: 'app-dados-complementares-assistido',
  imports: [FormsModule, Input, Select, EnderecoForm, Button],
  templateUrl: './dados-complementares-assistido.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
})
export class DadosComplementaresAssistidoForm<T extends DadosComplementaresAssistido> {
  dados = model.required<T>();
  /** Endereço do responsável principal, oferecido como atalho ("mesmo endereço"). */
  enderecoSugerido = input<EnderecoDTO | null>(null);
  /** false quando o formulário pai põe o Sexo na mesma linha de outros dados pessoais. */
  exibirSexo = input(true);

  protected readonly simNaoOptions = SIM_NAO;
  protected readonly sexoOptions = SEXO_OPTIONS;
  protected readonly turnoOptions: SelectOption<Turno | null>[] = [
    { value: null, label: 'Não informado' },
    ...TURNOS_DISPONIVEIS.map((turno) => ({ value: turno, label: turno })),
  ];

  protected readonly podeCopiarEndereco = computed(() => !!enderecoParaPayload(this.enderecoSugerido()));

  protected atualizar<K extends keyof DadosComplementaresAssistido>(campo: K, valor: T[K]): void {
    this.dados.update((atual) => ({ ...atual, [campo]: valor }));
  }

  protected copiarEnderecoSugerido(): void {
    this.atualizar('endereco', enderecoParaForm(this.enderecoSugerido()) as T['endereco']);
  }
}
