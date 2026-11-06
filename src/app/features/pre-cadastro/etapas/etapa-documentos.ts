import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import { FotoPerfil } from '../../../shared/components/foto-perfil/foto-perfil';
import { UploadDocumento } from '../../../shared/components/upload-documento/upload-documento';

/** Foto da criança e documentos (criança e responsável). Tudo opcional: quem não enviar leva no dia da entrevista. */
@Component({
  selector: 'app-etapa-documentos',
  imports: [FotoPerfil, UploadDocumento],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="intro">
      Opcional. Se puder, envie agora uma foto ou PDF dos documentos — agiliza o cadastro. Se não tiver em mãos,
      é só continuar e levar os documentos no dia da entrevista.
    </p>

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
}
