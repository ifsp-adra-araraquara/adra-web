import { Injectable, signal, computed } from '@angular/core';
import { Role } from '../shared/enum/role.enum';
import { AppModule } from '../shared/enum/module.enum';
import { DashboardType } from '../shared/enum/dashboard-type.enum';

interface PerfilConfig {
  nav: AppModule[];
  defaultPage: string;
  initials: string;
  dashType: DashboardType | null;
}

const PROFILES: Record<Role, PerfilConfig> = {

  [Role.ADMIN]: {
    nav: [AppModule.USUARIOS, AppModule.ACESSO, AppModule.NOTIFICACOES],
    defaultPage: AppModule.USUARIOS,
    initials: 'AD',
    dashType: null
  },

  [Role.COORD]: {
    nav: [
      AppModule.DASHBOARD, AppModule.ASSISTIDOS, AppModule.OFICINAS,
      AppModule.TURMAS, AppModule.CHAMADA, AppModule.DISCIPLINAR, AppModule.PRONTUARIOS
    ],
    defaultPage: AppModule.DASHBOARD,
    initials: 'CO',
    dashType: DashboardType.COORDENADOR
  },

  [Role.SOCIO]: {
    nav: [AppModule.DASHBOARD, AppModule.CHAMADA, AppModule.ASSISTIDOS],
    defaultPage: AppModule.DASHBOARD,
    initials: 'SP',
    dashType: DashboardType.SOCIOPEDAGOGICO
  },

  [Role.NEURO]: {
    nav: [AppModule.DASHBOARD, AppModule.PRONTUARIOS, AppModule.ASSISTIDOS],
    defaultPage: AppModule.DASHBOARD,
    initials: 'NE',
    dashType: DashboardType.NEUROLOGIA
  },

  [Role.PSICO]: {
    nav: [AppModule.DASHBOARD, AppModule.PRONTUARIOS, AppModule.ASSISTIDOS],
    defaultPage: AppModule.DASHBOARD,
    initials: 'PP',
    dashType: DashboardType.PSICOPEDAGOGA
  },

  [Role.FINANCEIRO]: {
    nav: [AppModule.DASHBOARD, AppModule.ASSISTIDOS, AppModule.EXPORTACAO],
    defaultPage: AppModule.DASHBOARD,
    initials: 'FA',
    dashType: DashboardType.FINANCEIRO
  },

  [Role.OFICINEIRO]: {
    nav: [AppModule.MATERIAIS, AppModule.COMUNICADOS],
    defaultPage: AppModule.MATERIAIS,
    initials: 'OF',
    dashType: DashboardType.OFICINEIRO
  }
};

const USERS: Record<Role, { name: string; role: string }> = {
  [Role.ADMIN]:      { name: 'Carlos Mendes',      role: 'Administrador do sistema' },
  [Role.COORD]:      { name: 'Juliana Alves',      role: 'Coordenação geral' },
  [Role.SOCIO]:      { name: 'Marcos Pereira',     role: 'Equipe sociopedagógica' },
  [Role.NEURO]:      { name: 'Dra. Letícia Prado', role: 'Neurologia' },
  [Role.PSICO]:      { name: 'Psic. Renata Dias',  role: 'Psicopedagogia' },
  [Role.FINANCEIRO]: { name: 'Sandra Lopes',       role: 'Financeiro / Administrativo' },
  [Role.OFICINEIRO]: { name: 'Bruno Carvalho',     role: 'Oficineiro — Música' },
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentProfile = signal<Role | null>(null);
  
  // NOVO: Controla qual módulo/página do menu está selecionado no momento
  currentModule = signal<AppModule | null>(null);

  profileConfig = computed(() => {
    const p = this.currentProfile();
    return p ? PROFILES[p] : null;
  });

  currentUser = computed(() => {
    const p = this.currentProfile();
    return p ? USERS[p] : null;
  });

  dashType = computed(() => this.profileConfig()?.dashType ?? null);

  login(perfil: Role): void {
    this.currentProfile.set(perfil);
    // Define o módulo padrão (defaultPage) do perfil ao logar
    const config = PROFILES[perfil];
    if (config) {
      this.currentModule.set(config.defaultPage as AppModule);
    }
  }

  // NOVO: Método para alterar o módulo ativo ao clicar no menu
  setModule(module: AppModule): void {
    this.currentModule.set(module);
  }

  logout(): void {
    this.currentProfile.set(null);
    this.currentModule.set(null);

  }
}