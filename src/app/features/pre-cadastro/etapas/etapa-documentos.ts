import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import { FotoPerfil } from '../../../shared/components/foto-perfil/foto-perfil';
import { UploadDocumento } from '../../../shared/components/upload-documento/upload-documento';

/** Comprovante de endereço (obrigatório), foto e documentos. O que for opcional pode ser levado no dia da entrevista. */
@Component({
  selector: 'app-etapa-documentos',
  imports: [FotoPerfil, UploadDocumento],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="intro">
      O comprovante de endereço é obrigatório. Foto e documentos são opcionais: se não tiver em mãos, leve no dia da
      entrevista.
    </p>

    <section class="bloco" aria-labelledby="doc-comprovante">
      <h3 id="doc-comprovante">Comprovante de endereço</h3>
      <app-upload-documento
        label="Comprovante de endereço"
        dica="Foto ou PDF de uma conta de água, luz ou telefone."
        [obrigatorio]="true"
        [(arquivos)]="comprovanteEndereco"
      />
    </section>

    <section class="bloco" aria-labelledby="doc-foto">
      <h3 id="doc-foto">Foto do atendido</h3>
      <app-foto-perfil label="Foto do atendido" [(arquivo)]="foto" />
    </section>

    <section class="bloco" aria-labelledby="doc-crianca">
      <h3 id="doc-crianca">Documento do atendido</h3>
      <app-upload-documento
        label="RG ou CPF do atendido"
        dica="Foto ou PDF. Até 2 arquivos (frente e verso)."
        [maximo]="2"
        [(arquivos)]="documentosCrianca"
      />
    </section>

    <section class="bloco" aria-labelledby="doc-responsavel">
      <h3 id="doc-responsavel">Documento do responsável</h3>
      <app-upload-documento
        label="RG ou CPF do responsável"
        dica="Foto ou PDF. Até 2 arquivos (frente e verso)."
        [maximo]="2"
        [(arquivos)]="documentosResponsavel"
      />
    </section>
  `,
  styles: `
    .intro { margin: 0 0 16px; font-size: 15px; line-height: 1.55; color: var(--gray-600); }
    .bloco { padding: 16px; margin-bottom: 16px; border: 1px solid var(--borda); border-radius: var(--radius); }
    h3 { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--gray-800); }
  `,
})
export class EtapaDocumentos {
  foto = model<File | null>(null);
  documentosCrianca = model<File[]>([]);
  documentosResponsavel = model<File[]>([]);
  comprovanteEndereco = model<File[]>([]);
}
