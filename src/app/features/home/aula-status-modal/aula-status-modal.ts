import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AulaService } from '../../../core/aula.service';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { StatusAula } from '../../../shared/enum/StatusAula';
import { resolveBadgeStatus } from '../../../shared/utils/badge-status.util';
import { Modal } from '../../../shared/components/modal/modal';
import { Badge } from '../../../shared/components/badge/badge';
import { Select, SelectOption } from '../../../shared/components/select/select';

const OPCOES_STATUS_AULA: SelectOption<StatusAula>[] = Object.values(StatusAula).map((status) => ({
  value: status,
  label: resolveBadgeStatus(status)?.label ?? status,
}));

@Component({
  selector: 'app-aula-status-modal',
  standalone: true,
  imports: [FormsModule, Modal, Badge, Select],
  templateUrl: './aula-status-modal.html',
})
export class AulaStatusModal {
  private readonly aulaService = inject(AulaService);

  readonly aula = input.required<AulaComDetalhesResponseDTO>();
  readonly fechar = output<void>();
  readonly salvo = output<void>();

  protected readonly opcoesStatus = OPCOES_STATUS_AULA;
  readonly novoStatus = signal<StatusAula | null>(null);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly podeSalvar = computed(() => {
    const novo = this.novoStatus();
    return !!novo && novo !== this.aula().statusAula && !this.salvando();
  });

  salvarStatus() {
    const novo = this.novoStatus();
    if (!novo || !this.podeSalvar()) return;

    this.salvando.set(true);
    this.erro.set(null);

    this.aulaService.atualizarStatus(this.aula().aulaId, novo).subscribe({
      next: () => {
        this.salvando.set(false);
        this.novoStatus.set(null);
        this.salvo.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.salvando.set(false);
        this.erro.set(err.error?.message ?? 'Não foi possível salvar o status. Tente novamente.');
      },
    });
  }
}