import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { Badge } from '../../shared/components/badge/badge';
import { Modal } from '../../shared/components/modal/modal';
import { Table, TableColumn } from '../../shared/components/table/table';
import { StatusAula } from '../../shared/enum/StatusAula';
import { SituacaoAula } from '../../shared/enum/SituacaoAula';
import { StatusPresenca } from '../../shared/enum/StatusPresenca';

interface OficinaExemplo {
  oficinaId: number;
  nomeOficina: string;
  oficineiroResponsavel: string;
  ativo: boolean;
}

/** Amostra de status de aula, no mesmo formato que será usado na US-64. */
const AMOSTRA_STATUS_AULA = [
  { valor: StatusAula.PLANEJADA, descricao: 'Agendada' },
  { valor: StatusAula.REALIZADA, descricao: 'Realizada' },
  { valor: StatusAula.CANCELADA, descricao: 'Cancelada' },
  { valor: StatusAula.ADIADA, descricao: 'Remarcada' },
];

const AMOSTRA_OUTROS_STATUS = [
  { valor: true, descricao: 'Ativo (booleano)' },
  { valor: false, descricao: 'Inativo (booleano)' },
  { valor: SituacaoAula.PENDENTE, descricao: 'Situação de aula pendente' },
  { valor: SituacaoAula.DISPONIVEL, descricao: 'Situação de aula disponível' },
  { valor: StatusPresenca.PRESENTE, descricao: 'Presença: presente' },
  { valor: StatusPresenca.FALTA, descricao: 'Presença: falta' },
  { valor: StatusPresenca.FALTA_JUSTIFICADA, descricao: 'Presença: falta justificada' },
];

const NOMES_OFICINEIROS = [
  'Maria Silva',
  'João Pereira',
  'Ana Souza',
  'Carlos Lima',
  'Beatriz Costa',
  'Rafael Alves',
];

function gerarOficinasExemplo(): OficinaExemplo[] {
  const nomes = [
    'Oficina de Violão',
    'Oficina de Teatro',
    'Oficina de Dança',
    'Oficina de Artesanato',
    'Oficina de Informática',
    'Oficina de Culinária',
    'Oficina de Reforço Escolar',
    'Oficina de Capoeira',
    'Oficina de Pintura',
    'Oficina de Futebol',
    'Oficina de Robótica',
    'Oficina de Costura',
  ];

  return nomes.map((nomeOficina, indice) => ({
    oficinaId: indice + 1,
    nomeOficina,
    oficineiroResponsavel: NOMES_OFICINEIROS[indice % NOMES_OFICINEIROS.length],
    ativo: indice % 4 !== 0,
  }));
}

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [Badge, Modal, Table],
  templateUrl: './showcase.html',
  styleUrl: './showcase.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Showcase {
  protected readonly amostraStatusAula = AMOSTRA_STATUS_AULA;
  protected readonly amostraOutrosStatus = AMOSTRA_OUTROS_STATUS;

  protected readonly oficinas = signal<OficinaExemplo[]>(gerarOficinasExemplo());

  protected readonly colunasOficinas: TableColumn<OficinaExemplo>[] = [
    { key: 'nomeOficina', header: 'Nome da oficina', sortable: true },
    { key: 'oficineiroResponsavel', header: 'Oficineiro responsável', sortable: true },
    { key: 'ativo', header: 'Status', type: 'badge', align: 'left', width: '140px' },
  ];

  protected readonly modalSimplesAberto = signal(false);
  protected readonly modalConfirmacaoAberto = signal(false);
  protected readonly oficinaSelecionada = signal<OficinaExemplo | null>(null);

  protected abrirConfirmacaoInativacao(oficina: OficinaExemplo): void {
    this.oficinaSelecionada.set(oficina);
    this.modalConfirmacaoAberto.set(true);
  }

  protected confirmarAlteracaoStatus(): void {
    const selecionada = this.oficinaSelecionada();
    if (!selecionada) {
      return;
    }

    this.oficinas.set(
      this.oficinas().map((oficina) =>
        oficina.oficinaId === selecionada.oficinaId ? { ...oficina, ativo: !oficina.ativo } : oficina,
      ),
    );
    this.modalConfirmacaoAberto.set(false);
  }
}
