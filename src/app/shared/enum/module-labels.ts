import { AppModule } from './module.enum';

export const MODULE_LABELS: Record<AppModule, string> = {
  [AppModule.DASHBOARD]: 'Dashboard',
  [AppModule.ASSISTIDOS]: 'Assistidos',
  [AppModule.OFICINAS]: 'Oficinas',
  [AppModule.TURMAS]: 'Turmas',
  [AppModule.CHAMADA]: 'Chamada',
  [AppModule.DISCIPLINAR]: 'Disciplinar',
  [AppModule.PRONTUARIOS]: 'Prontuários',
  [AppModule.USUARIOS]: 'Usuários',
  [AppModule.ACESSO]: 'Acesso',
  [AppModule.NOTIFICACOES]: 'Notificações',
  [AppModule.EXPORTACAO]: 'Exportação',
  [AppModule.MATERIAIS]: 'Materiais',
  [AppModule.COMUNICADOS]: 'Comunicados',
};
