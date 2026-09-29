import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return '';
  const data = new Date(valor);
  if (isNaN(data.getTime())) return valor;
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

/**
 * US-68 (CA-68.3): Componente de rastreabilidade para exibir quem lançou e
 * alterou o registro de presença de um assistido, de forma discreta e sem poluir
 * a tela principal.
 */
@Component({
  selector: 'app-rastreabilidade-tooltip',
  standalone: true,
  templateUrl: './rastreabilidade-tooltip.html',
  styleUrl: './rastreabilidade-tooltip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RastreabilidadeTooltip {
  readonly criadoPorNome = input<string | null | undefined>(null);
  readonly criadoEm = input<string | null | undefined>(null);
  readonly atualizadoPorNome = input<string | null | undefined>(null);
  readonly atualizadoEm = input<string | null | undefined>(null);

  protected readonly criadoEmFormatado = computed(() => formatarDataHora(this.criadoEm()));
  protected readonly atualizadoEmFormatado = computed(() => formatarDataHora(this.atualizadoEm()));

  protected readonly houveAlteracao = computed(() => {
    const atualizado = this.atualizadoPorNome();
    const criado = this.criadoPorNome();
    if (!atualizado || !this.atualizadoEm()) return false;
    if (criado && atualizado !== criado) return true;
    if (this.criadoEm() && this.atualizadoEm()) {
      const diff = Math.abs(new Date(this.atualizadoEm()!).getTime() - new Date(this.criadoEm()!).getTime());
      return diff > 1000;
    }
    return false;
  });

  protected readonly textoAcessivel = computed(() => {
    let texto = `Lançado por ${this.criadoPorNome() || 'desconhecido'}`;
    if (this.criadoEmFormatado()) {
      texto += ` em ${this.criadoEmFormatado()}`;
    }
    if (this.houveAlteracao() && this.atualizadoPorNome()) {
      texto += `. Alterado por ${this.atualizadoPorNome()}`;
      if (this.atualizadoEmFormatado()) {
        texto += ` em ${this.atualizadoEmFormatado()}`;
      }
    }
    return texto;
  });
}
