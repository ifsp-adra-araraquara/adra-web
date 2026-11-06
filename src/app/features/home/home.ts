import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Role } from '../../shared/enum/role.enum';
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
export class Home {
  auth = inject(AuthService);

  readonly podeGerenciar = computed(() => this.auth.currentProfile() === Role.COORD);
  /** "Coordenador ADRA" → "Coordenador": saudação curta no cabeçalho. */
}
