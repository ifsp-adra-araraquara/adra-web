import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CategoriaArquivo } from '../../enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../enum/EntidadeArquivo';
import { SemanarioResponseDTO } from '../../models/semanario/SemanarioResponseDTO';
import { rotuloSemana } from '../../utils/semana.util';
import { ListaDocumentos } from '../lista-documentos/lista-documentos';

/**
 * Um semanário: semana, grupo, conteúdos, estratégias, recursos e o material para impressão.
 * Uso: `<app-cartao-semanario [semanario]="s" />`
 */
@Component({
  selector: 'app-cartao-semanario',
  imports: [ListaDocumentos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="cartao">
      <header>
        <strong>Semana de {{ rotuloSemana(semanario().semanaInicio) }}</strong>
        <span class="muted">{{ semanario().nomeTurma }} · {{ semanario().nomeOficina }}</span>
      </header>

      <div class="campos">
        <section>
          <p class="rotulo">Conteúdos</p>
          <p class="texto">{{ semanario().conteudoPrevisto }}</p>
        </section>

        <section>
          <p class="rotulo">Estratégias</p>
          <p class="texto">{{ semanario().objetivos || '—' }}</p>
        </section>

        <section>
          <p class="rotulo">Recursos necessários</p>
          <p class="texto">{{ semanario().recursosNecessarios || '—' }}</p>
        </section>

        <section>
          <p class="rotulo">Material para impressão</p>
          <app-lista-documentos
            [entidadeTipo]="EntidadeArquivo.SEMANARIO"
            [entidadeId]="semanario().semanarioId"
            [categoria]="CategoriaArquivo.MATERIAL_SEMANARIO"
            rotulo="Material para impressão"
            vazio="Nenhum material enviado."
          />
        </section>
      </div>

      <p class="muted enviado">Enviado por {{ semanario().nomeEnviadoPor }}</p>
    </article>
  `,
  styles: `
    .cartao { border: 1px solid var(--borda, #e5e7eb); border-radius: 10px; padding: 14px 16px; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; margin-bottom: 12px; }
    .campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px 24px; }
    .campos section { min-width: 0; }
    .rotulo { font-size: 12px; font-weight: 600; margin: 0 0 4px; color: var(--rotulo); }
    .texto { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
    .enviado { font-size: 12px; margin: 14px 0 0; }
  `,
})
export class CartaoSemanario {
  semanario = input.required<SemanarioResponseDTO>();

  protected readonly EntidadeArquivo = EntidadeArquivo;
  protected readonly CategoriaArquivo = CategoriaArquivo;
  protected readonly rotuloSemana = rotuloSemana;
}
