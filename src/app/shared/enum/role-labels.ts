// src/app/core/role-labels.ts
import { Role } from './role.enum';

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]:      'Administrador',
  [Role.COORD]:      'Coordenador',
  [Role.SOCIO]:      'Sociopedagógico',
  [Role.OFICINEIRO]: 'Oficineiro',
};

export const PERFIL_OPTIONS = Object.values(Role).map(value => ({ value, label: ROLE_LABELS[value] }));