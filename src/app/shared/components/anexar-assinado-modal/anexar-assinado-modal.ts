import { ChangeDetectionStrategy, Component, inject, input, model, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ArquivoService } from '../../../core/arquivo.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { CategoriaArquivo } from '../../enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../enum/EntidadeArquivo';
import { RegistroDisciplinarDTO } from '../../models/disciplinar/Disciplinar';
import { mensagemErro } from '../../utils/erro-http.util';
import { rotuloSequencia } from '../../utils/disciplinar.util';
import { Modal } from '../modal/modal';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { UploadDocumento } from '../upload-documento/upload-documento';

/**
 * FT-25: anexa o documento disciplinar assinado pelo responsável e marca o
 * registro como devolvido (some de "documentos a assinar"). A foto/PDF é
 * opcional, como no back. Usado na tela Disciplinar e na ficha do atendido.
 */
@Component({
  selector: 'app-anexar-assinado-modal',
  imports: [Modal, Button, Icon, UploadDocumento],
  template: `
    @if (registro(); as r) {
      <app-modal [(open)]="open" title="Anexar documento assinado" [subtitle]="r.nomeAssistido" size="sm">
        <div modal-icon class="mh-ico ico-green"><app-icon name="file-text" /></div>

        @if (erro()) {
          <div class="notice notice-error" role="alert">{{ erro() }}</div>
        }

        <p>Confirme que o documento da {{ rotuloSequencia(r) }} voltou assinado pelo responsável.</p>
        <app-upload-documento
          label="Foto ou PDF do documento assinado (opcional)"
          dica="No celular, dá para tirar a foto direto pela câmera."
          [(arquivos)]="arquivos"
        />

        <ng-template #footer>
          <app-button variant="secondary" (click)="open.set(false)">Cancelar</app-button>
          <app-button [loading]="salvando()" (click)="confirmar(r)">Marcar como assinado</app-button>
        </ng-template>
      </app-modal>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnexarAssinadoModal {
  private readonly arquivoService = inject(ArquivoService);
  private readonly disciplinarService = inject(DisciplinarService);

  open = model(false);
  registro = input<RegistroDisciplinarDTO | null>(null);
  salvo = output<RegistroDisciplinarDTO>();

  readonly rotuloSequencia = rotuloSequencia;
  readonly arquivos = signal<File[]>([]);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  async confirmar(r: RegistroDisciplinarDTO): Promise<void> {
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const arquivo = this.arquivos()[0];
      const salvo = arquivo
        ? await this.arquivoService.enviar(
            EntidadeArquivo.ASSISTIDO,
            r.assistidoId,
            CategoriaArquivo.DOCUMENTO_DISCIPLINAR_ASSINADO,
            arquivo,
          )
        : null;
      const atualizado = await this.disciplinarService.marcarDocumentoDevolvido(r.registroId, salvo?.arquivoId ?? null);
      this.arquivos.set([]);
      this.open.set(false);
      this.salvo.emit(atualizado);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível registrar o documento assinado.'));
    } finally {
      this.salvando.set(false);
    }
  }
}
