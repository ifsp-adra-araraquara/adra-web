import { Component } from '@angular/core';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-dash-clinico',
  standalone: true,
  imports: [StatCard],
  templateUrl: './dash-clinico.html'
})
export class DashClinico {
  atendimentos = [
    { texto: 'Atendimento — Marina Souza',    quando: 'Hoje, 11:00 · sessão de acompanhamento' },
    { texto: 'Atendimento — Pedro Henrique',  quando: 'Ontem, 14:30 · avaliação inicial' },
    { texto: 'Encaminhamento recebido de Neurologia — Ana Lima', quando: '2 dias atrás' },
  ];
}