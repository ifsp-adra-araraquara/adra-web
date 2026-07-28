// src/app/core/role-labels.ts
import { Role } from './role.enum';

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]:      'Administrador',
  [Role.COORD]:      'Coordenador',
  [Role.SOCIO]:      'Sociopedagógico',
  [Role.NEURO]:      'Neurologia',
  [Role.PSICO]:      'Psicopedagoga',
  [Role.FINANCEIRO]: 'Financeiro/Administrativo',
  [Role.OFICINEIRO]: 'Oficineiro',
};