import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { Role } from '../../shared/enum/role.enum';
import { TurmaResponseDTO } from '../../shared/models/turma/TurmaResponseDTO';
import { OficinaResponseDTO } from '../../shared/models/oficina/OficinaResponseDTO';
import { CalendarioAulas } from './calendario-aulas/calendario-aulas';

/**
 * Tela inicial — hoje "Dashboard" (rótulo "Calendário" via override no
 * sidebar, Fase 4). Antes mostrava DashCoord/DashSocio, dois componentes
 * 100% com dados mockados (nenhuma chamada de API); foram retirados em vez
 * de mantidos fingindo dado real. O calendário (mesmo `CalendarioAulas` já
 * usado em Turmas) virou o conteúdo de fato — é o "coração" do app agora.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CalendarioAulas],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly podeGerenciar = computed(() => this.auth.currentProfile() === Role.COORD);

  readonly turmas = signal<TurmaResponseDTO[]>([]);
  readonly oficinas = signal<OficinaResponseDTO[]>([]);

  ngOnInit(): void {
    this.carregarTurmasEOficinas();
  }

  private async carregarTurmasEOficinas(): Promise<void> {
    try {
      const [turmas, oficinas] = await Promise.all([
        firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${this.api}/api/turmas`)),
        firstValueFrom(this.http.get<OficinaResponseDTO[]>(`${this.api}/api/oficinas`)),
      ]);
      this.turmas.set(turmas);
      this.oficinas.set(oficinas);
    } catch (erro) {
      console.error('Erro ao carregar turmas/oficinas da tela inicial:', erro);
    }
  }
}
