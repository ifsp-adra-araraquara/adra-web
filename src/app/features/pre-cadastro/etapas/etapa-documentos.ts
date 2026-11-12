import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { FotoPerfil } from '../../../shared/components/foto-perfil/foto-perfil';
import { UploadDocumento } from '../../../shared/components/upload-documento/upload-documento';

/** Comprovante de endereço, foto e documentos do atendido e do responsável: todos obrigatórios. */
@Component({
  selector: 'app-etapa-documentos',
  imports: [FotoPerfil, UploadDocumento],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="intro">
      Todos os itens abaixo são obrigatórios. Pode ser foto tirada pelo celular ou PDF.
    </p>

    <section class="bloco" aria-labelledby="doc-comprovante">
      <h3 id="doc-comprovante">Comprovante de endereço</h3>
      <app-upload-documento
        label="Comprovante de endereço"
        dica="Foto ou PDF de uma conta de água, luz ou telefone."
        [obrigatorio]="true"
        [invalido]="tentou() && comprovanteEndereco().length === 0"
        [(arquivos)]="comprovanteEndereco"
      />
    </section>

    <section class="bloco" aria-labelledby="doc-foto">
      <h3 id="doc-foto">Foto do atendido</h3>
      <app-foto-perfil label="Foto do atendido" [obrigatorio]="true" [invalido]="tentou() && !foto()" [(arquivo)]="foto" />
    </section>

    <section class="bloco" aria-labelledby="doc-crianca">
      <h3 id="doc-crianca">Documento do atendido</h3>
      <app-upload-documento
        label="RG ou CPF do atendido"
        dica="Foto ou PDF. Até 2 arquivos (frente e verso)."
        [maximo]="2"
        [obrigatorio]="true"
        [invalido]="tentou() && documentosCrianca().length === 0"
        [(arquivos)]="documentosCrianca"
      />
    </section>

    <section class="bloco" aria-labelledby="doc-responsavel">
      <h3 id="doc-responsavel">Documento do responsável</h3>
      <app-upload-documento
        label="RG ou CPF do responsável"
        dica="Foto ou PDF. Até 2 arquivos (frente e verso)."
        [maximo]="2"
        [obrigatorio]="true"
        [invalido]="tentou() && documentosResponsavel().length === 0"
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
  /** Já tentou avançar: destaca o que falta. */
  tentou = input(false);
  foto = model<File | null>(null);
  documentosCrianca = model<File[]>([]);
  documentosResponsavel = model<File[]>([]);
  comprovanteEndereco = model<File[]>([]);
}
