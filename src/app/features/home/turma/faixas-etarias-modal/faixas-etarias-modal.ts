import { ChangeDetectionStrategy, Component, inject, input, model, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { FaixaEtariaService } from '../../../../core/faixa-etaria.service';
import { FaixaEtariaDTO } from '../../../../shared/models/faixa-etaria/FaixaEtaria';
import { mensagemErro } from '../../../../shared/utils/erro-http.util';
import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { Input } from '../../../../shared/components/input/input';
import { Modal } from '../../../../shared/components/modal/modal';

/** Cadastro das faixas etárias dos grupos (Coordenador). Faixas podem se sobrepor. */
@Component({
  selector: 'app-faixas-etarias-modal',
  imports: [FormsModule, Badge, Button, Icon, Input, Modal],
  templateUrl: './faixas-etarias-modal.html',
  styleUrl: './faixas-etarias-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaixasEtariasModal {
  private readonly faixaEtariaService = inject(FaixaEtariaService);

  open = model(false);
  faixas = input.required<FaixaEtariaDTO[]>();
  alterado = output<void>();

  protected readonly editando = signal<FaixaEtariaDTO | null>(null);
  protected readonly idadeMinima = signal<number | null>(null);
  protected readonly idadeMaxima = signal<number | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected editar(faixa: FaixaEtariaDTO): void {
    this.editando.set(faixa);
    this.idadeMinima.set(faixa.idadeMinima);
    this.idadeMaxima.set(faixa.idadeMaxima);
    this.erro.set(null);
  }

  protected limparFormulario(): void {
    this.editando.set(null);
    this.idadeMinima.set(null);
    this.idadeMaxima.set(null);
    this.erro.set(null);
  }

  protected async salvar(): Promise<void> {
    const idadeMinima = this.idadeMinima();
    const idadeMaxima = this.idadeMaxima();
    if (idadeMinima == null || idadeMaxima == null) {
      this.erro.set('Informe a idade mínima e a máxima.');
      return;
    }
    if (idadeMinima > idadeMaxima) {
      this.erro.set('A idade mínima não pode ser maior que a máxima.');
      return;
    }

    const editando = this.editando();
    await this.enviar(() =>
      editando
        ? this.faixaEtariaService.atualizar(editando.faixaEtariaId, { idadeMinima, idadeMaxima })
        : this.faixaEtariaService.criar({ idadeMinima, idadeMaxima }),
    );
  }

  protected alternarAtivo(faixa: FaixaEtariaDTO): void {
    const { idadeMinima, idadeMaxima, ativo } = faixa;
    this.enviar(() => this.faixaEtariaService.atualizar(faixa.faixaEtariaId, { idadeMinima, idadeMaxima, ativo: !ativo }));
  }

  private async enviar(requisicao: () => Promise<FaixaEtariaDTO>): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    try {
      await requisicao();
      this.limparFormulario();
      this.alterado.emit();
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível salvar a faixa etária.'));
    } finally {
      this.salvando.set(false);
    }
  }
}
