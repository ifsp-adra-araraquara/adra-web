import { Component } from '@angular/core';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-dash-socio',
  standalone: true,
  imports: [StatCard, Badge, Button],
  templateUrl: './dash-socio.html'
})
export class DashSocio {
  chamadas = [
    { oficina: 'Esporte',       turma: 'Turma B · Tarde',  hora: '14:00', inscritos: 20, status: 'Pendente',  acao: 'Registrar' },
    { oficina: 'Teatro',        turma: 'Turma A · Tarde',  hora: '15:00', inscritos: 12, status: 'Pendente',  acao: 'Registrar' },
    { oficina: 'Informática',   turma: 'Turma C · Tarde',  hora: '16:00', inscritos: 16, status: 'Pendente',  acao: 'Registrar' },
    { oficina: 'Música',        turma: 'Turma A · Manhã',  hora: '09:00', inscritos: 18, status: 'Concluída', acao: 'Ver' },
  ];
}