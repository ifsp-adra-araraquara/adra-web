import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Input } from '../../../../shared/components/input/input';
import { Select, SelectOption } from '../../../../shared/components/select/select';
import { AssistidoRequestDTO } from '../../../../shared/models/assistido/AssistidoRequestDTO';
import {
  PROGRAMA_TRANSFERENCIA_LABELS,
  ProgramaTransferencia,
} from '../../../../shared/enum/ProgramaTransferencia';
import { formatarMoeda } from '../../../../shared/utils/mascara.util';

export type DadosSocioeconomicosAssistido = Pick<
  AssistidoRequestDTO,
  'rendaFamiliar' | 'recebeProgramaTransferencia' | 'programasTransferencia' | 'programaTransferenciaOutro' | 'nis'
>;

/**
 * Socioeconômico da família: renda familiar (com aviso do limite do programa),
 * programas de transferência de renda e NIS/CadÚnico.
 * Uso: `<app-socioeconomico-assistido [(dados)]="form" [limiteRenda]="limite()" />`.
 */
@Component({
  selector: 'app-socioeconomico-assistido',
  imports: [FormsModule, Input, Select],
  templateUrl: './socioeconomico-assistido.html',
  styleUrl: './socioeconomico-assistido.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
})
export class SocioeconomicoAssistidoForm<T extends DadosSocioeconomicosAssistido> {
  dados = model.required<T>();
  /** Limite de renda familiar do programa (null = regra ainda não definida). */
  limiteRenda = input<number | null>(null);
  /** Soma da renda dos responsáveis já informados — só como referência para preencher. */
  somaRendaResponsaveis = input<number | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly simNaoOptions: SelectOption<boolean | null>[] = [
    { value: null, label: 'Não informado' },
    { value: true, label: 'Sim' },
    { value: false, label: 'Não' },
  ];
  protected readonly programas = Object.values(ProgramaTransferencia).map((programa) => ({
    valor: programa,
    label: PROGRAMA_TRANSFERENCIA_LABELS[programa],
  }));

  protected readonly acimaDoLimite = computed(() => {
    const limite = this.limiteRenda();
    const renda = this.dados().rendaFamiliar;
    return limite != null && renda != null && renda > limite;
  });

  protected readonly temOutro = computed(
    () => !!this.dados().programasTransferencia?.includes(ProgramaTransferencia.OUTRO),
  );

  protected atualizar<K extends keyof DadosSocioeconomicosAssistido>(campo: K, valor: T[K]): void {
    this.dados.update((atual) => ({ ...atual, [campo]: valor }));
  }

  protected programaMarcado(programa: ProgramaTransferencia): boolean {
    return !!this.dados().programasTransferencia?.includes(programa);
  }

  protected alternarPrograma(programa: ProgramaTransferencia, marcado: boolean): void {
    const atuais = this.dados().programasTransferencia ?? [];
    const novos = marcado ? [...atuais, programa] : atuais.filter((p) => p !== programa);
    this.atualizar('programasTransferencia', novos as T['programasTransferencia']);
  }

  /** NIS só com dígitos (o back valida 11). */
  protected atualizarNis(texto: string): void {
    this.atualizar('nis', (texto ?? '').replace(/\D/g, '') as T['nis']);
  }
}
