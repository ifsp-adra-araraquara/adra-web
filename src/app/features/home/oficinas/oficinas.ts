import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { OficinaRequestDTO } from '../../../shared/models/oficina/OficinaRequestDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { OficinaResumoDTO } from '../../../shared/models/oficina/OficinaResumoDTO';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Modal } from '../../../shared/components/modal/modal';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { Badge } from '../../../shared/components/badge/badge';
import { ActionMenu, ActionMenuItem } from '../../../shared/components/action-menu/action-menu';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { HistoricoOficineiros } from '../../../shared/components/historico-oficineiros/historico-oficineiros';
import { corDaOficina, textoHorario } from './oficina-card.util';

const MAX_HORARIOS = 3;

@Component({
  selector: 'app-oficinas',
  standalone: true,
  imports: [HistoricoOficineiros, ActionMenu, Badge, Icon, CommonModule, FormsModule, Select, Modal, Input, Button],
  templateUrl: './oficinas.html',
  styleUrl: './oficinas.css',
})
export class Oficinas implements OnInit {
  private http = inject(HttpClient);

  private readonly apiOficinas = `${environment.apiUrl}/api/oficinas`;
  private readonly apiUsuarios = `${environment.apiUrl}/api/usuarios`;

  oficinas = signal<OficinaResponseDTO[]>([]);
  carregando = signal(false);
  erroListar = signal<string | null>(null);

  /** Opções do select de oficineiro responsável, usado tanto no cadastro quanto na edição. */
  oficineiroOptions = signal<SelectOption<number>[]>([]);

  /** id -> nome, pra exibir o nome do oficineiro responsável no card (o back só manda o id). */
  nomesOficineiros = computed(() => new Map(this.oficineiroOptions().map((o) => [o.value, o.label])));

  /**
   * Números das turmas por oficina (GET /resumo, uma chamada para todas).
   * Separado da listagem: se falhar, os cards aparecem sem esses números.
   */
  private resumoPorOficina = signal(new Map<number, OficinaResumoDTO>());

  /** Tudo que o card desenha, já formatado. */
  cards = computed(() => {
    const resumos = this.resumoPorOficina();
    const nomes = this.nomesOficineiros();
    return this.oficinas().map((oficina) => {
      const resumo = resumos.get(oficina.oficinaId);
      const horarios = (resumo?.horarios ?? []).map(textoHorario).filter(Boolean);
      return {
        oficina,
        cor: corDaOficina(oficina.oficinaId),
        oficineiro: nomes.get(oficina.oficineiroResponsavelId ?? -1) ?? 'Sem oficineiro',
        // Turmas com agendas diferentes: uma linha por agenda, até 3.
        horarios: horarios.slice(0, MAX_HORARIOS),
        outrosHorarios: Math.max(horarios.length - MAX_HORARIOS, 0),
        turmasAtivas: resumo?.turmasAtivas ?? 0,
        alunos: resumo?.alunos ?? 0,
        capacidade: resumo?.capacidade ?? 0,
      };
    });
  });

  filtroNome = '';
  filtroStatus: 'todas' | 'ativas' | 'inativas' = 'ativas';

  filtroStatusOptions: SelectOption<'todas' | 'ativas' | 'inativas'>[] = [
    { value: 'ativas', label: 'Ativas' },
    { value: 'inativas', label: 'Inativas' },
    { value: 'todas', label: 'Todas' }
  ];
  
  private debounceTimerListagem?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregarOficinas();
    this.carregarResumo();
    this.carregarOficineirosParaSelect();
  }

  private carregarResumo(): void {
    this.http.get<OficinaResumoDTO[]>(`${this.apiOficinas}/resumo`).subscribe({
      next: (lista) => this.resumoPorOficina.set(new Map(lista.map((r) => [r.oficinaId, r]))),
      error: (erro) => console.error('Erro ao carregar o resumo das oficinas:', erro),
    });
  }

  private carregarOficineirosParaSelect(): void {
    this.http.get<UsuarioResponse[]>(`${this.apiUsuarios}/oficineiros`).subscribe({
      next: (lista) => {
        this.oficineiroOptions.set(lista.map((u) => ({ value: u.usuarioId, label: u.nomeCompleto })));
      },
      error: (erro) => console.error('Erro ao carregar oficineiros para seleção:', erro),
    });
  }

  onFiltroNomeChange(valor: string): void {
    this.filtroNome = valor;
    clearTimeout(this.debounceTimerListagem);
    this.debounceTimerListagem = setTimeout(() => this.carregarOficinas(), 400);
  }

  onFiltroStatusChange(valor: 'todas' | 'ativas' | 'inativas'): void {
    this.filtroStatus = valor;
    this.carregarOficinas();
  }

  carregarOficinas(): void {
    this.carregando.set(true);
    this.erroListar.set(null);

    let params = new HttpParams();

    if (this.filtroNome.trim()) {
      params = params.set('nome', this.filtroNome.trim());
    }

    if (this.filtroStatus === 'ativas') {
      params = params.set('ativo', 'true');
    } else if (this.filtroStatus === 'inativas') {
      params = params.set('ativo', 'false');
    }

    this.http.get<OficinaResponseDTO[]>(this.apiOficinas, { params }).subscribe({
      next: (lista) => {
        this.oficinas.set(lista);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar oficinas:', erro);
        this.erroListar.set('Não foi possível carregar as oficinas.');
        this.carregando.set(false);
      },
    });
  }

  /* ============================================================
   * MODAL: NOVA OFICINA (US-13)
   * ============================================================ */
  mostrarModalForm = signal(false);
  salvando = signal(false);
  erroSalvar = signal<string | null>(null);

  // CA de FE: alerta NAO BLOQUEANTE de duplicidade por nome.
  // Nunca impede o submit - apenas avisa.
  alertaDuplicidade = signal(false);
  private debounceTimerDuplicidade?: ReturnType<typeof setTimeout>;

  formOficina: OficinaRequestDTO = this.oficinaVazia();

  private oficinaVazia(): OficinaRequestDTO {
    return {
      nomeOficina: '',
      oficineiroResponsavelId: null,
      local: '',
    };
  }

  abrirModalNovaOficina(): void {
    this.formOficina = this.oficinaVazia();
    this.erroSalvar.set(null);
    this.alertaDuplicidade.set(false);
    this.modoEdicao.set(false);
    this.oficinaSendoEditada.set(null);
    this.mostrarModalForm.set(true);
  }

  fecharModalForm(): void {
    this.mostrarModalForm.set(false);
    this.modoEdicao.set(false);
    this.oficinaSendoEditada.set(null);
  }

  atualizarCampoOficina(campo: keyof OficinaRequestDTO, valor: string | number | null): void {
    this.formOficina = { ...this.formOficina, [campo]: valor };

    if (campo === 'nomeOficina') {
      this.dispararChecagemDuplicidade(valor as string);
    }

    // Mesmo ajuste feito em Turmas: limpa o erro assim que o usuário mexe
    // em algum campo, pra não ficar uma mensagem de validação "presa" na
    // tela depois que ele já corrigiu o que faltava.
    if (this.erroSalvar()) {
      this.erroSalvar.set(null);
    }
  }

  /**
   * Debounce de 400ms para não bater na API a cada tecla; se a checagem
   * falhar (rede, 403 etc.) o alerta simplesmente não aparece - isso
   * nunca bloqueia o cadastro, é só um aviso a mais.
   */
  private dispararChecagemDuplicidade(nome: string): void {
    clearTimeout(this.debounceTimerDuplicidade);

    if (!nome.trim()) {
      this.alertaDuplicidade.set(false);
      return;
    }

    this.debounceTimerDuplicidade = setTimeout(async () => {
      try {
        const resultado = await firstValueFrom(
          this.http.get<{ possivelDuplicidade: boolean }>(
            `${this.apiOficinas}/verificar-duplicidade`,
            { params: new HttpParams().set('nome', nome.trim()) },
          ),
        );
        this.alertaDuplicidade.set(resultado.possivelDuplicidade);
      } catch {
        this.alertaDuplicidade.set(false);
      }
    }, 400);
  }

  async salvarOficina(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    if (!this.formOficina.nomeOficina.trim()) {
      this.erroSalvar.set('Informe o nome da oficina.');
      return;
    }

    if (this.formOficina.oficineiroResponsavelId == null) {
      this.erroSalvar.set('Selecione o oficineiro responsável.');
      return;
    }

    this.salvando.set(true);
    this.erroSalvar.set(null);

    try {
      if (this.modoEdicao() && this.oficinaSendoEditada()) {
        // Modo edição: PUT
        await firstValueFrom(
          this.http.put<OficinaResponseDTO>(
            `${this.apiOficinas}/${this.oficinaSendoEditada()!.oficinaId}`,
            this.formOficina
          )
        );
      } else {
        // Modo novo: POST
        await firstValueFrom(
          this.http.post<OficinaResponseDTO>(this.apiOficinas, this.formOficina)
        );
      }

      this.salvando.set(false);
      this.fecharModalForm();
      this.carregarOficinas();
    } catch (erro: any) {
      console.error('Erro ao salvar oficina:', erro);
      this.erroSalvar.set(
        mensagemErro(erro, 'Não foi possível salvar a oficina. Verifique os dados e tente novamente.'),
      );
      this.salvando.set(false);
    }
  }

  /* ============================================================
   * MODAL: EDITAR OFICINA (US-14)
   * ============================================================ */
  modoEdicao = signal(false);
  /** Itens do menu ">" do card — mesmo padrão de Assistidos/Responsáveis/Usuários. */
  acoesOficina(oficina: OficinaResponseDTO): ActionMenuItem[] {
    return oficina.ativo
      ? [
          { id: 'editar', label: 'Editar', icon: 'edit' },
          { id: 'inativar', label: 'Inativar', icon: 'power', danger: true },
        ]
      : [{ id: 'reativar', label: 'Reativar', icon: 'rotate-ccw' }];
  }

  executarAcaoOficina(acao: string, oficina: OficinaResponseDTO): void {
    if (acao === 'editar') {
      this.abrirModalEdicao(oficina);
    } else if (acao === 'inativar') {
      this.abrirConfirmacaoInativacao(oficina);
    } else if (acao === 'reativar' && !this.reativando()) {
      this.abrirConfirmacaoReativacao(oficina);
    }
  }

  oficinaSendoEditada = signal<OficinaResponseDTO | null>(null);

  abrirModalEdicao(oficina: OficinaResponseDTO): void {
    this.modoEdicao.set(true);
    this.oficinaSendoEditada.set(oficina);
    this.formOficina = {
      nomeOficina: oficina.nomeOficina,
      oficineiroResponsavelId: oficina.oficineiroResponsavelId ?? null,
      local: oficina.local ?? '',
    };
    this.erroSalvar.set(null);
    this.alertaDuplicidade.set(false);
    this.mostrarModalForm.set(true);
  }

  /* ============================================================
   * MODAL: CONFIRMAÇÃO DE INATIVAÇÃO (US-14)
   * ============================================================ */
  mostrarConfirmacaoInativacao = signal(false);
  oficinaSendoInativada = signal<OficinaResponseDTO | null>(null);
  inativando = signal(false);
  erroInativar = signal<string | null>(null);

  abrirConfirmacaoInativacao(oficina: OficinaResponseDTO): void {
    this.oficinaSendoInativada.set(oficina);
    this.erroInativar.set(null);
    this.mostrarConfirmacaoInativacao.set(true);
  }

  fecharConfirmacaoInativacao(): void {
    this.mostrarConfirmacaoInativacao.set(false);
    this.oficinaSendoInativada.set(null);
  }

  async confirmarInativacao(): Promise<void> {
    if (this.inativando() || !this.oficinaSendoInativada()) {
      return;
    }

    this.inativando.set(true);
    this.erroInativar.set(null);

    try {
      await firstValueFrom(
        this.http.patch<OficinaResponseDTO>(
          `${this.apiOficinas}/${this.oficinaSendoInativada()!.oficinaId}/inativar`,
          {}
        )
      );

      this.inativando.set(false);
      this.fecharConfirmacaoInativacao();
      this.carregarOficinas();
    } catch (erro: any) {
      console.error('Erro ao inativar oficina:', erro);
      this.erroInativar.set(
        mensagemErro(erro, 'Não foi possível inativar a oficina. Tente novamente.')
      );
      this.inativando.set(false);
    }
  }

  /* ============================================================
   * MODAL: CONFIRMAÇÃO DE REATIVAÇÃO (US-14)
   * ============================================================ */
  mostrarConfirmacaoReativacao = signal(false);
  oficinaSendoReativada = signal<OficinaResponseDTO | null>(null);
  reativando = signal(false);
  erroReativar = signal<string | null>(null);

  abrirConfirmacaoReativacao(oficina: OficinaResponseDTO): void {
    this.oficinaSendoReativada.set(oficina);
    this.erroReativar.set(null);
    this.mostrarConfirmacaoReativacao.set(true);
  }

  fecharConfirmacaoReativacao(): void {
    this.mostrarConfirmacaoReativacao.set(false);
    this.oficinaSendoReativada.set(null);
  }

  async confirmarReativacao(): Promise<void> {
    if (this.reativando() || !this.oficinaSendoReativada()) {
      return;
    }

    this.reativando.set(true);
    this.erroReativar.set(null);

    try {
      await firstValueFrom(
        this.http.patch<OficinaResponseDTO>(
          `${this.apiOficinas}/${this.oficinaSendoReativada()!.oficinaId}/reativar`,
          {}
        )
      );

      this.reativando.set(false);
      this.fecharConfirmacaoReativacao();
      this.carregarOficinas();
    } catch (erro: any) {
      console.error('Erro ao reativar oficina:', erro);
      this.erroReativar.set(
        mensagemErro(erro, 'Não foi possível reativar a oficina. Tente novamente.')
      );
      this.reativando.set(false);
    }
  }
}
