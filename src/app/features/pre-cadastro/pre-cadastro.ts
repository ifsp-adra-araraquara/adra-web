import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { PreCadastroService } from '../../core/pre-cadastro.service';
import { BrandLogo } from '../../shared/components/brand-logo/brand-logo';
import { Button } from '../../shared/components/button/button';
import { Icon } from '../../shared/components/icon/icon';
import { mensagemErro } from '../../shared/utils/erro-http.util';
import { ANO_INSCRICAO } from '../../shared/utils/termos-inscricao';
import { CabecalhoEtapas } from './cabecalho-etapas';
import { CaptchaTurnstile } from './captcha-turnstile';
import { EtapaCrianca } from './etapas/etapa-crianca';
import { EtapaDocumentos } from './etapas/etapa-documentos';
import { EtapaRenda } from './etapas/etapa-renda';
import { EtapaResponsaveis } from './etapas/etapa-responsaveis';
import { EtapaRevisao } from './etapas/etapa-revisao';
import { EtapaSaudeAutorizacoes } from './etapas/etapa-saude-autorizacoes';
import { EtapaTermos } from './etapas/etapa-termos';
import { ChaveEtapa, ETAPAS, aplicarCondicionais, criarFormularioPreCadastro, paraPayload } from './pre-cadastro-form.util';

/**
 * Link público (sem login) da inscrição: substitui o Google Forms. A página
 * guarda o formulário inteiro e a etapa atual; cada etapa só desenha os seus
 * campos. Nada fica salvo no navegador (celular pode ser compartilhado).
 */
@Component({
  selector: 'app-pre-cadastro',
  imports: [
    ReactiveFormsModule,
    BrandLogo,
    Button,
    Icon,
    CabecalhoEtapas,
    CaptchaTurnstile,
    EtapaTermos,
    EtapaCrianca,
    EtapaResponsaveis,
    EtapaRenda,
    EtapaSaudeAutorizacoes,
    EtapaDocumentos,
    EtapaRevisao,
  ],
  templateUrl: './pre-cadastro.html',
  styleUrl: './pre-cadastro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'avisarAntesDeSair($event)' },
})
export class PreCadastro {
  private readonly service = inject(PreCadastroService);
  private readonly document = inject(DOCUMENT);

  protected readonly ANO = ANO_INSCRICAO;
  protected readonly etapas = ETAPAS;
  protected readonly form = criarFormularioPreCadastro(inject(FormBuilder));

  protected readonly indice = signal(0);
  protected readonly etapa = computed(() => ETAPAS[this.indice()]);
  protected readonly tentativas = signal(0);
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly protocolo = signal<number | null>(null);
  protected readonly erroEnvio = signal<string | null>(null);
  protected readonly tokenCaptcha = signal<string | null>(null);

  /** Opcionais e fora do FormGroup (são arquivos). */
  protected readonly foto = signal<File | null>(null);
  protected readonly documentosCrianca = signal<File[]>([]);
  protected readonly documentosResponsavel = signal<File[]>([]);
  protected readonly anexos = computed(() => ({
    foto: this.foto(),
    documentosCrianca: this.documentosCrianca(),
    documentosResponsavel: this.documentosResponsavel(),
  }));

  private readonly tituloEtapa = viewChild<ElementRef<HTMLElement>>('tituloEtapa');
  private readonly corpoEtapa = viewChild<ElementRef<HTMLElement>>('corpoEtapa');
  private readonly captcha = viewChild(CaptchaTurnstile);

  constructor() {
    aplicarCondicionais(this.form);
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => aplicarCondicionais(this.form));
  }

  protected avancar(): void {
    const chave = this.etapa().chave;
    if (chave === 'revisao') {
      this.enviar();
      return;
    }
    if (chave === 'documentos') {
      this.mostrarEtapa(this.indice() + 1);
      return;
    }
    const grupo = this.form.controls[chave];
    grupo.markAllAsTouched();
    this.tentativas.update((n) => n + 1);
    if (grupo.invalid) {
      this.focarPrimeiroErro();
      return;
    }
    this.mostrarEtapa(this.indice() + 1);
  }

  protected voltar(): void {
    this.mostrarEtapa(this.indice() - 1);
  }

  protected editar(chave: ChaveEtapa): void {
    this.mostrarEtapa(ETAPAS.findIndex((e) => e.chave === chave));
  }

  protected fazerOutraInscricao(): void {
    this.form.reset();
    aplicarCondicionais(this.form);
    this.foto.set(null);
    this.documentosCrianca.set([]);
    this.documentosResponsavel.set([]);
    this.enviado.set(false);
    this.protocolo.set(null);
    this.mostrarEtapa(0);
  }

  protected avisarAntesDeSair(evento: BeforeUnloadEvent): void {
    if (this.form.dirty && !this.enviado()) {
      evento.preventDefault();
    }
  }

  private async enviar(): Promise<void> {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.erroEnvio.set('Há respostas faltando. Use "Editar" na seção para completar.');
      return;
    }
    const tokenCaptcha = this.tokenCaptcha();
    if (!tokenCaptcha) {
      this.erroEnvio.set('Aguarde a verificação de segurança, no fim da página, e tente de novo.');
      this.rolarAoTopo();
      return;
    }
    this.erroEnvio.set(null);
    this.enviando.set(true);
    try {
      this.protocolo.set(await this.service.registrarPublico(paraPayload(this.form), this.anexos(), tokenCaptcha));
      this.enviado.set(true);
      this.form.markAsPristine();
      this.rolarAoTopo();
    } catch (e) {
      this.erroEnvio.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível enviar agora. Confira a internet e tente de novo.'));
      this.tokenCaptcha.set(null);
      this.captcha()?.resetar();
      this.rolarAoTopo();
    } finally {
      this.enviando.set(false);
    }
  }

  /** Troca de etapa: volta ao topo e leva o foco ao título (o leitor de tela anuncia a etapa nova). */
  private mostrarEtapa(indice: number): void {
    this.indice.set(indice);
    this.erroEnvio.set(null);
    this.tokenCaptcha.set(null);
    this.rolarAoTopo();
    setTimeout(() => this.tituloEtapa()?.nativeElement.focus());
  }

  private focarPrimeiroErro(): void {
    setTimeout(() => {
      const campo = this.corpoEtapa()?.nativeElement.querySelector<HTMLElement>(
        '[aria-invalid="true"], .campo-invalido input',
      );
      campo?.focus();
    });
  }

  private rolarAoTopo(): void {
    this.document.defaultView?.scrollTo({ top: 0 });
  }
}
