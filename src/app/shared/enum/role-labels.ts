// src/app/core/role-labels.ts
import { Role } from './role.enum';

export const ROLE_LABELS: Record<Role, string> = {
  [Role.COORD]:      'Coordenador',
  [Role.ASSISTENTE]: 'Assistente Social',
  [Role.EDUCADOR]:   'Educador Social',
  [Role.OFICINEIRO]: 'Oficineiro',
};

export const PERFIL_OPTIONS = Object.values(Role).map(value => ({ value, label: ROLE_LABELS[value] }));