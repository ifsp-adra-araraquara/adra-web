import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DOCUMENT, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { PreCadastroService } from '../../../../core/pre-cadastro.service';
import { CategoriaArquivo } from '../../../../shared/enum/CategoriaArquivo';
import { AssistidoRequestDTO } from '../../../../shared/models/assistido/AssistidoRequestDTO';
import { PreCadastroResponseDTO, emAvaliacao } from '../../../../shared/models/precadastro/PreCadastro';
import { ComparacaoRematriculaDTO } from '../../../../shared/models/matricula/Matricula';
import { TurmaResponseDTO } from '../../../../shared/models/turma/TurmaResponseDTO';
import { VinculoFamiliarComResponsavelRequestDTO } from '../../../../shared/models/vinculoFamiliar/VinculoFamiliarComResponsavelRequestDTO';
import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { Input } from '../../../../shared/components/input/input';
import { Modal } from '../../../../shared/components/modal/modal';
import { Select, SelectOption } from '../../../../shared/components/select/select';
import { cpfValido } from '../../../../shared/validators/cpf.validator';
import { enderecoParaForm } from '../../../../shared/utils/endereco.util';
import { mensagemErro } from '../../../../shared/utils/erro-http.util';
import { hojeISO } from '../../../../shared/utils/aula.util';
import {
  assistidoVazio,
  paraPayloadAssistido,
  paraVinculoComResponsavel,
  ResponsavelPendente,
  responsavelVazio,
  validarDadosComplementares,
} from '../../assistidos/assistido-form.util';
import { DadosComplementaresAssistidoForm, SEXO_OPTIONS } from '../../assistidos/dados-complementares/dados-complementares-assistido';
import { SocioeconomicoAssistidoForm } from '../../assistidos/socioeconomico/socioeconomico-assistido';
import { TermosAssistidoForm } from '../../assistidos/termos/termos-assistido';
import { ResponsaveisPendentes } from '../../assistidos/novo/responsaveis-pendentes';
import { RespostasFamilia } from './respostas-familia';
import { ComparacaoRematricula } from './comparacao-rematricula';

const ROTULOS_ANEXO: Partial<Record<CategoriaArquivo, string>> = {
  [CategoriaArquivo.FOTO_PERFIL]: 'Foto do atendido',
  [CategoriaArquivo.DOCUMENTO_IDENTIDADE]: 'Documento do atendido',
  [CategoriaArquivo.DOCUMENTO_RESPONSAVEL]: 'Documento do responsável',
  [CategoriaArquivo.DECLARACAO_RESIDENCIA]: 'Comprovante de endereço',
};

/** Rascunho da API → responsável editável no formulário. */
function paraResponsavelPendente(v: VinculoFamiliarComResponsavelRequestDTO): ResponsavelPendente {
  return {
    ...responsavelVazio(),
    ...v,
    dataNascimento: v.dataNascimento ?? '',
    cpf: v.cpf ?? '',
    telefone: v.telefone ?? '',
    email: v.email ?? '',
    observacoes: v.observacoes ?? '',
    profissao: v.profissao ?? '',
    parentesco: v.parentesco ?? '',
    endereco: enderecoParaForm(v.endereco),
  };
}

/**
 * Avaliação de um pré-cadastro: o cadastro do atendido já vem preenchido com
 * o que a família enviou (rascunho da API) e a equipe edita o que quiser.
 * Aprovar cria o atendido; reprovar pede o motivo. Já avaliado: só leitura.
 * CPF de quem já é atendido = rematrícula: mostra o que mudou (sem alterar a
 * ficha) e abre a matrícula do ano no grupo escolhido.
 */
@Component({
  selector: 'app-avaliacao-pre-cadastro',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    Badge,
    Button,
    Icon,
    Input,
    Modal,
    Select,
    DadosComplementaresAssistidoForm,
    SocioeconomicoAssistidoForm,
    TermosAssistidoForm,
    ResponsaveisPendentes,
    RespostasFamilia,
    ComparacaoRematricula,
  ],
  templateUrl: './avaliacao-pre-cadastro.html',
  styleUrl: './avaliacao-pre-cadastro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvaliacaoPreCadastro implements OnInit {
  private readonly service = inject(PreCadastroService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly preCadastroId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly sexoOptions = SEXO_OPTIONS;

  protected readonly detalhe = signal<PreCadastroResponseDTO | null>(null);
  protected readonly assistido = signal<AssistidoRequestDTO>(assistidoVazio());
  protected readonly responsaveis = signal<ResponsavelPendente[]>([]);
  protected readonly turmas = signal<TurmaResponseDTO[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erroCarregar = signal<string | null>(null);

  protected readonly salvando = signal(false);
  protected readonly erroAcao = signal<string | null>(null);
  /** Atendido que já tem o CPF (409 ao aprovar ou aviso do detalhe). */
  protected readonly existenteId = signal<number | null>(null);

  protected readonly comparacao = signal<ComparacaoRematriculaDTO | null>(null);
  protected readonly turmaRematricula = signal<number | null>(null);
  protected readonly tentouRematricular = signal(false);

  protected readonly modalReprovar = signal(false);
  protected readonly motivo = signal('');
  protected readonly tentouReprovar = signal(false);

  protected readonly observacao = signal('');
  protected readonly salvandoObservacao = signal(false);
  protected readonly observacaoSalva = signal(false);

  /** Aviso depois de mover de ano (a inscrição continua aqui, em avaliação). */
  protected readonly movidaPara = signal<number | null>(null);

  protected readonly pendente = computed(() => this.detalhe()?.status === 'PENDENTE');
  protected readonly anoAtual = new Date().getFullYear();
  /** Inscrição para o ano seguinte: aprovada, só começa em 1º de janeiro. */
  protected readonly doProximoAno = computed(() => (this.detalhe()?.anoReferencia ?? 0) > this.anoAtual);
  protected readonly anoParaMover = computed(() => (this.emAvaliacao() ? (this.detalhe()?.anoParaMover ?? null) : null));
  protected readonly emAvaliacao = computed(() => {
    const status = this.detalhe()?.status;
    return !!status && emAvaliacao(status);
  });
  /** Formulário antigo (sem CPF): não dá para montar o cadastro, só reprovar. Quem já é atendido: rematrícula. */
  protected readonly podeAprovar = computed(() => this.emAvaliacao() && !!this.detalhe()?.cpf && !this.existenteId());
  protected readonly rematricula = computed(() => this.emAvaliacao() && !!this.existenteId());
  protected readonly podeRematricular = computed(() => this.rematricula() && this.comparacao()?.jaMatriculadoNoAno === false);
  protected readonly grupoOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Escolha o grupo' },
    ...this.turmas()
      .filter((t) => t.ativo)
      .map((t) => ({ value: t.turmaId, label: t.nomeTurma })),
  ]);
  protected readonly erroGrupo = computed(() =>
    this.tentouRematricular() && this.turmaRematricula() == null ? 'Escolha o grupo do atendido no novo ano.' : null,
  );
  protected readonly idade = computed(() => {
    const nascimento = this.detalhe()?.dataNascimento;
    if (!nascimento) return null;
    const [ano, mes, dia] = nascimento.split('-').map(Number);
    const hoje = new Date();
    const fezAniversario = hoje.getMonth() + 1 > mes || (hoje.getMonth() + 1 === mes && hoje.getDate() >= dia);
    return hoje.getFullYear() - ano - (fezAniversario ? 0 : 1);
  });
  protected readonly turmaOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Escolher depois' },
    ...this.turmas()
      .filter((t) => t.ativo)
      .map((t) => ({ value: t.turmaId, label: t.nomeTurma })),
  ]);
  protected readonly somaRendaResponsaveis = computed(() => {
    const rendas = this.responsaveis()
      .map((r) => r.renda)
      .filter((renda): renda is number => renda != null);
    return rendas.length ? rendas.reduce((total, renda) => total + renda, 0) : null;
  });
  protected readonly erroMotivo = computed(() =>
    this.tentouReprovar() && !this.motivo().trim() ? 'Informe o motivo da reprovação.' : null,
  );

  ngOnInit(): void {
    this.carregar();
  }

  protected atualizar(campo: keyof AssistidoRequestDTO, valor: unknown): void {
    this.assistido.update((a) => ({ ...a, [campo]: valor }));
  }

  protected rotuloDoAnexo(categoria: CategoriaArquivo): string {
    return ROTULOS_ANEXO[categoria] ?? 'Arquivo';
  }

  /** A janela abre antes do await: depois dele o navegador bloquearia como pop-up. */
  protected async abrirArquivo(arquivoId: number): Promise<void> {
    const janela = this.document.defaultView?.open('', '_blank');
    try {
      const { url } = await this.service.urlDoArquivo(this.preCadastroId, arquivoId);
      if (janela) janela.location.href = url;
    } catch (e) {
      janela?.close();
      this.erroAcao.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível abrir o arquivo.'));
    }
  }

  protected abrirFichaDoAtendido(assistidoId: number): void {
    this.router.navigate(['/assistidos'], { queryParams: { assistidoId } });
  }

  protected async aprovar(): Promise<void> {
    if (this.salvando()) return;
    const erro = this.validar();
    if (erro) {
      this.erroAcao.set(erro);
      return;
    }
    this.salvando.set(true);
    this.erroAcao.set(null);
    const a = this.assistido();
    const payload: AssistidoRequestDTO = {
      ...paraPayloadAssistido(a),
      observacoes: [a.observacoes, this.observacao().trim()].filter(Boolean).join('\n'),
      turmaId: a.turmaId ? Number(a.turmaId) : null,
      responsaveis: this.responsaveis().map((r) => paraVinculoComResponsavel(r)),
    };
    try {
      this.detalhe.set(await this.service.aprovar(this.preCadastroId, payload));
    } catch (e) {
      const resposta = e as HttpErrorResponse;
      this.erroAcao.set(mensagemErro(resposta, 'Não foi possível aprovar. Confira os dados e tente de novo.'));
      if (resposta.status === 409 && resposta.error?.assistidoId) {
        // CPF cadastrado enquanto a tela estava aberta: vira rematrícula.
        this.existenteId.set(resposta.error.assistidoId);
        await this.carregarRematricula().catch(() => undefined);
      }
    } finally {
      this.salvando.set(false);
    }
  }

  protected async rematricular(): Promise<void> {
    this.tentouRematricular.set(true);
    const turmaId = this.turmaRematricula();
    if (turmaId == null || this.salvando()) return;
    this.salvando.set(true);
    this.erroAcao.set(null);
    try {
      this.detalhe.set(await this.service.rematricular(this.preCadastroId, turmaId));
    } catch (e) {
      this.erroAcao.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível rematricular. Tente de novo.'));
    } finally {
      this.salvando.set(false);
    }
  }

  protected abrirReprovar(): void {
    this.motivo.set('');
    this.tentouReprovar.set(false);
    this.modalReprovar.set(true);
  }

  protected async reprovar(): Promise<void> {
    this.tentouReprovar.set(true);
    if (!this.motivo().trim() || this.salvando()) return;
    this.salvando.set(true);
    try {
      this.detalhe.set(await this.service.reprovar(this.preCadastroId, this.motivo().trim()));
      this.modalReprovar.set(false);
      this.erroAcao.set(null);
    } catch (e) {
      this.erroAcao.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível reprovar. Tente de novo.'));
      this.modalReprovar.set(false);
    } finally {
      this.salvando.set(false);
    }
  }

  protected async moverDeAno(): Promise<void> {
    const ano = this.anoParaMover();
    if (ano == null || this.salvando()) return;
    this.salvando.set(true);
    this.erroAcao.set(null);
    try {
      const detalhe = await this.service.moverParaAno(this.preCadastroId, ano);
      this.detalhe.set(detalhe);
      this.movidaPara.set(ano);
      // A ficha do próximo ano começa em 1º de janeiro; o resto do que a equipe já revisou fica.
      const inicioDoAno = `${ano}-01-01`;
      const hoje = hojeISO();
      this.assistido.update((a) => ({ ...a, dataEntrada: inicioDoAno > hoje ? inicioDoAno : hoje }));
      if (detalhe.assistidoExistenteId) {
        // Rematrícula: "já matriculado no ano" depende do ano da inscrição.
        await this.carregarRematricula();
      }
    } catch (e) {
      this.erroAcao.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível mudar o ano da inscrição. Tente de novo.'));
    } finally {
      this.salvando.set(false);
    }
  }

  protected async colocarNaListaEspera(): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erroAcao.set(null);
    try {
      this.detalhe.set(await this.service.colocarNaListaEspera(this.preCadastroId, this.observacao()));
    } catch (e) {
      this.erroAcao.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível colocar na lista de espera. Tente de novo.'));
    } finally {
      this.salvando.set(false);
    }
  }

  protected alterarObservacao(valor: string): void {
    this.observacao.set(valor);
    this.observacaoSalva.set(false);
  }

  protected async salvarObservacao(): Promise<void> {
    if (this.salvandoObservacao()) return;
    this.salvandoObservacao.set(true);
    this.erroAcao.set(null);
    try {
      await this.service.salvarObservacao(this.preCadastroId, this.observacao());
      this.observacaoSalva.set(true);
    } catch (e) {
      this.erroAcao.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível salvar a observação. Tente de novo.'));
    } finally {
      this.salvandoObservacao.set(false);
    }
  }

  /** Na aprovação só nome e CPF são obrigatórios (mais o que o cadastro do atendido já exige). */
  private validar(): string | null {
    const a = this.assistido();
    if (!a.nomeCompleto.trim()) return 'Informe o nome completo.';
    if (!cpfValido(a.cpf ?? '')) return 'Informe um CPF válido para o atendido.';
    if (this.responsaveis().length === 0) return 'Informe pelo menos um responsável.';
    return validarDadosComplementares(a);
  }

  private async carregarRematricula(): Promise<void> {
    const [comparacao, turmas] = await Promise.all([
      this.service.comparacao(this.preCadastroId),
      firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${environment.apiUrl}/api/turmas`)),
    ]);
    this.comparacao.set(comparacao);
    this.turmas.set(turmas);
    // Sem passagem automática: sugere o grupo de agora, a equipe confirma ou troca.
    const atualAtivo = turmas.some((t) => t.ativo && t.turmaId === comparacao.turmaAtualId);
    this.turmaRematricula.set(atualAtivo ? comparacao.turmaAtualId : null);
  }

  private async carregar(): Promise<void> {
    try {
      const detalhe = await this.service.buscar(this.preCadastroId);
      this.detalhe.set(detalhe);
      this.existenteId.set(detalhe.assistidoExistenteId);
      this.observacao.set(detalhe.observacao ?? '');
      if (emAvaliacao(detalhe.status) && detalhe.assistidoExistenteId) {
        await this.carregarRematricula();
      } else if (emAvaliacao(detalhe.status) && detalhe.cpf) {
        const [rascunho, turmas] = await Promise.all([
          this.service.rascunhoAssistido(this.preCadastroId),
          firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${environment.apiUrl}/api/turmas`)),
        ]);
        this.turmas.set(turmas);
        this.assistido.set({
          ...assistidoVazio(),
          ...rascunho,
          endereco: enderecoParaForm(rascunho.endereco),
          programasTransferencia: rascunho.programasTransferencia ?? [],
          responsaveis: [],
        });
        this.responsaveis.set((rascunho.responsaveis ?? []).map(paraResponsavelPendente));
      }
    } catch (e) {
      this.erroCarregar.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível abrir o pré-cadastro.'));
    } finally {
      this.carregando.set(false);
    }
  }
}
