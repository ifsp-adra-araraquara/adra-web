import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { AssistidoService } from '../../../../core/assistido.service';
import { AssistidoRequestDTO } from '../../../../shared/models/assistido/AssistidoRequestDTO';
import { AssistidoResponseDTO } from '../../../../shared/models/assistido/AssistidoResponseDTO';
import { ElegibilidadeDTO } from '../../../../shared/models/assistido/ElegibilidadeDTO';
import { TurmaResponseDTO } from '../../../../shared/models/turma/TurmaResponseDTO';
import { EnderecoDTO } from '../../../../shared/models/endereco/EnderecoDTO';
import { Input } from '../../../../shared/components/input/input';
import { Select, SelectOption } from '../../../../shared/components/select/select';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { Badge } from '../../../../shared/components/badge/badge';
import { TooltipDirective } from '../../../../shared/components/tooltip/tooltip';
import { FotoPerfil } from '../../../../shared/components/foto-perfil/foto-perfil';
import { UploadDocumento } from '../../../../shared/components/upload-documento/upload-documento';
import { cpfValido, formatarCpf } from '../../../../shared/validators/cpf.validator';
import { formatarMoeda, formatarTelefone } from '../../../../shared/utils/mascara.util';
import { mensagemErro } from '../../../../shared/utils/erro-http.util';
import { DadosComplementaresAssistidoForm, SEXO_OPTIONS } from '../dados-complementares/dados-complementares-assistido';
import { SocioeconomicoAssistidoForm } from '../socioeconomico/socioeconomico-assistido';
import { TermosAssistidoForm } from '../termos/termos-assistido';
import { MENSAGEM_SEM_DOCUMENTO } from '../mensagens-cadastro';
import {
  assistidoVazio,
  paraPayloadAssistido,
  paraVinculoComResponsavel,
  ResponsavelPendente,
  validarDadosComplementares,
} from '../assistido-form.util';
import { ResponsavelVinculoModal } from './responsavel-vinculo-modal';

/**
 * Cadastro de assistido em página própria (antes era um modal).
 *
 * 1. CPF primeiro: se já existe, mostra quem é e leva à ficha — não deixa
 *    cadastrar de novo. Se não existe, abre o formulário com o CPF fixo.
 * 2. Responsáveis entram por modal (ResponsavelVinculoModal), também pelo
 *    CPF: quem já tem cadastro é só vinculado.
 * 3. Tudo vai num POST só (assistido + responsáveis + foto + documento).
 */
@Component({
  selector: 'app-assistido-novo',
  imports: [
    DatePipe,
    FormsModule,
    Input,
    Select,
    Button,
    Icon,
    Badge,
    TooltipDirective,
    FotoPerfil,
    UploadDocumento,
    DadosComplementaresAssistidoForm,
    SocioeconomicoAssistidoForm,
    TermosAssistidoForm,
    ResponsavelVinculoModal,
  ],
  templateUrl: './assistido-novo.html',
  styleUrl: './assistido-novo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistidoNovo implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly assistidoService = inject(AssistidoService);

  private readonly apiAssistidos = `${environment.apiUrl}/api/assistidos`;
  private readonly apiTurmas = `${environment.apiUrl}/api/turmas`;

  readonly formatarCpf = formatarCpf;
  readonly formatarTelefone = formatarTelefone;
  readonly sexoOptions = SEXO_OPTIONS;

  /* ---------------- Etapa 1: CPF ---------------- */

  etapa = signal<'cpf' | 'formulario'>('cpf');
  cpfBusca = signal('');
  buscandoCpf = signal(false);
  erroCpf = signal<string | null>(null);
  /** Assistido que já tem esse CPF: a página mostra quem é em vez do formulário. */
  existente = signal<AssistidoResponseDTO | null>(null);

  /* ---------------- Etapa 2: formulário ---------------- */

  assistido = signal<AssistidoRequestDTO>(assistidoVazio());
  foto = signal<File | null>(null);
  documentos = signal<File[]>([]);
  responsaveis = signal<ResponsavelPendente[]>([]);
  turmas = signal<TurmaResponseDTO[]>([]);
  limiteRendaFamiliar = signal<number | null>(null);
  alertaDuplicidade = signal(false);
  tentouSalvar = signal(false);
  salvando = signal(false);
  erroSalvar = signal<string | null>(null);

  /* Modal de responsável */
  modalResponsavel = signal(false);
  /** Índice em `responsaveis` sendo editado; null = incluindo. */
  indiceEmEdicao = signal<number | null>(null);
  responsavelEmEdicao = computed(() => {
    const i = this.indiceEmEdicao();
    return i == null ? null : (this.responsaveis()[i] ?? null);
  });
  cpfsUsados = computed(() =>
    this.responsaveis()
      .filter((_, i) => i !== this.indiceEmEdicao())
      .map((r) => r.cpf),
  );

  turmaOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Sem turma' },
    ...this.turmas()
      .filter((t) => t.ativo)
      .map((t) => ({ value: t.turmaId, label: t.nomeTurma })),
  ]);

  /** Soma da renda dos responsáveis — referência para a renda familiar. */
  somaRendaResponsaveis = computed(() => {
    const rendas = this.responsaveis()
      .map((r) => r.renda)
      .filter((renda): renda is number => renda != null);
    return rendas.length ? rendas.reduce((total, renda) => total + renda, 0) : null;
  });

  /** Endereço do responsável principal — atalho "Mesmo do responsável". */
  enderecoDoPrincipal = computed<EnderecoDTO | null>(() => {
    const lista = this.responsaveis();
    return (lista.find((r) => r.responsavelPrincipal) ?? lista[0])?.endereco ?? null;
  });

  private debounceDuplicidade?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.http.get<TurmaResponseDTO[]>(this.apiTurmas).subscribe({
      next: (lista) => this.turmas.set(lista),
      error: (erro) => console.error('Erro ao carregar turmas:', erro),
    });
    this.http.get<ElegibilidadeDTO>(`${this.apiAssistidos}/elegibilidade`).subscribe({
      next: (criterios) => this.limiteRendaFamiliar.set(criterios.rendaFamiliarLimite),
      error: () => this.limiteRendaFamiliar.set(null),
    });
  }

  voltar(): void {
    this.router.navigate(['/assistidos']);
  }

  /* ---------------- CPF ---------------- */

  buscarCpf(): void {
    const cpf = this.cpfBusca();
    if (!cpfValido(cpf)) {
      this.erroCpf.set('Informe um CPF válido.');
      return;
    }
    this.buscandoCpf.set(true);
    this.erroCpf.set(null);
    this.existente.set(null);

    this.assistidoService.buscarPorCpf(cpf).subscribe({
      next: (assistido) => {
        this.buscandoCpf.set(false);
        this.existente.set(assistido);
      },
      error: (resposta: HttpErrorResponse) => {
        this.buscandoCpf.set(false);
        if (resposta.status === 404) {
          this.assistido.update((a) => ({ ...a, cpf }));
          this.etapa.set('formulario');
        } else {
          this.erroCpf.set('Não foi possível buscar o CPF. Tente novamente.');
        }
      },
    });
  }

  /** Volta para trocar o CPF; o que já foi preenchido continua. */
  trocarCpf(): void {
    this.existente.set(null);
    this.cpfBusca.set('');
    this.erroCpf.set(null);
    this.etapa.set('cpf');
  }

  abrirFicha(assistido: AssistidoResponseDTO): void {
    this.router.navigate(['/assistidos'], { queryParams: { assistidoId: assistido.assistidoId } });
  }

  /* ---------------- Formulário ---------------- */

  atualizar(campo: keyof AssistidoRequestDTO, valor: unknown): void {
    this.assistido.update((a) => ({ ...a, [campo]: valor }));
    if (campo === 'nomeCompleto' || campo === 'dataNascimento') {
      this.checarDuplicidade();
    }
  }

  /** Aviso não bloqueante: outro assistido com mesmo nome e nascimento (CA-A02.2). */
  private checarDuplicidade(): void {
    clearTimeout(this.debounceDuplicidade);
    const { nomeCompleto, dataNascimento } = this.assistido();
    const nome = nomeCompleto?.trim() ?? '';
    if (!nome || !dataNascimento) {
      this.alertaDuplicidade.set(false);
      return;
    }
    this.debounceDuplicidade = setTimeout(async () => {
      try {
        const resultado = await firstValueFrom(
          this.http.get<{ possivelDuplicidade: boolean }>(`${this.apiAssistidos}/verificar-duplicidade`, {
            params: new HttpParams().set('nomeCompleto', nome).set('dataNascimento', dataNascimento),
          }),
        );
        this.alertaDuplicidade.set(Boolean(resultado?.possivelDuplicidade));
      } catch {
        this.alertaDuplicidade.set(false);
      }
    }, 400);
  }

  /* ---------------- Responsáveis ---------------- */

  adicionarResponsavel(): void {
    this.indiceEmEdicao.set(null);
    this.modalResponsavel.set(true);
  }

  editarResponsavel(indice: number): void {
    this.indiceEmEdicao.set(indice);
    this.modalResponsavel.set(true);
  }

  removerResponsavel(indice: number): void {
    let lista = this.responsaveis().filter((_, i) => i !== indice);
    // sempre sobra um principal
    if (lista.length > 0 && !lista.some((r) => r.responsavelPrincipal)) {
      lista = lista.map((r, i) => (i === 0 ? { ...r, responsavelPrincipal: true } : r));
    }
    this.responsaveis.set(lista);
  }

  /** Volta do modal: inclui ou substitui, mantendo um único principal (o primeiro vira principal). */
  responsavelConfirmado(responsavel: ResponsavelPendente): void {
    const indice = this.indiceEmEdicao();
    const outros = this.responsaveis().filter((_, i) => i !== indice);
    const principal = responsavel.responsavelPrincipal || !outros.some((r) => r.responsavelPrincipal);
    const novo = { ...responsavel, responsavelPrincipal: principal };

    this.responsaveis.update((lista) => {
      const ajustada = responsavel.responsavelPrincipal
        ? lista.map((r) => ({ ...r, responsavelPrincipal: false }))
        : lista;
      return indice == null ? [...ajustada, novo] : ajustada.map((r, i) => (i === indice ? novo : r));
    });
    this.indiceEmEdicao.set(null);
    if (this.erroSalvar()) this.erroSalvar.set(null);
  }

  /* ---------------- Salvar ---------------- */

  private validar(): string | null {
    const a = this.assistido();
    if (this.documentos().length === 0) return MENSAGEM_SEM_DOCUMENTO;
    if (!a.nomeCompleto.trim() || !a.dataNascimento) return 'Preencha nome completo e data de nascimento.';

    const erroComplementares = validarDadosComplementares(a);
    if (erroComplementares) return erroComplementares;

    // Regra de corte só na entrada (o back faz a mesma checagem).
    const limite = this.limiteRendaFamiliar();
    if (limite != null && a.rendaFamiliar != null && a.rendaFamiliar > limite) {
      return `Renda familiar acima do limite do programa (${formatarMoeda(limite)}). A família não pode ser cadastrada.`;
    }
    if (this.responsaveis().length === 0) return 'Informe pelo menos um responsável para o assistido.';
    return null;
  }

  async salvar(): Promise<void> {
    if (this.salvando()) return;
    this.tentouSalvar.set(true);

    const erro = this.validar();
    if (erro) {
      this.erroSalvar.set(erro);
      return;
    }

    this.salvando.set(true);
    this.erroSalvar.set(null);
    const a = this.assistido();
    const payload: AssistidoRequestDTO = {
      ...paraPayloadAssistido(a),
      turmaId: a.turmaId ? Number(a.turmaId) : null,
      responsaveis: this.responsaveis().map((r) => paraVinculoComResponsavel(r)),
    };

    try {
      const criado = await firstValueFrom(this.assistidoService.cadastrar(payload, this.foto(), this.documentos()));
      this.abrirFicha(criado);
    } catch (erroHttp) {
      console.error('Erro ao salvar assistido:', erroHttp);
      this.erroSalvar.set(mensagemErro(erroHttp as HttpErrorResponse, 'Não foi possível salvar. Verifique os dados e tente novamente.'));
      this.salvando.set(false);
    }
  }
}
