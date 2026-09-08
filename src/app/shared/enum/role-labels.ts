// src/app/core/role-labels.ts
import { Role } from './role.enum';

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]:      'Administrador',
  [Role.COORD]:      'Coordenador',
  [Role.SOCIO]:      'Sociopedagógico',
  [Role.PROFS]:      'Profissional de Saúde',
  [Role.FINANCEIRO]: 'Financeiro/Administrativo',
  [Role.OFICINEIRO]: 'Oficineiro',
};