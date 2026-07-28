import { Component } from '@angular/core';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-dash-coord',
  standalone: true,
  imports: [StatCard],
  templateUrl: './dash-coord.html'
})
export class DashCoord {
  oficinasFrequencia = [
    { nome: 'Reforço Escolar', inscritos: 22, freq: 91, classe: 'f-good' },
    { nome: 'Música',          inscritos: 18, freq: 86, classe: 'f-good' },
    { nome: 'Informática',     inscritos: 16, freq: 80, classe: 'f-good' },
    { nome: 'Esporte',         inscritos: 20, freq: 74, classe: 'f-mid'  },
    { nome: 'Teatro',          inscritos: 12, freq: 63, classe: 'f-low'  },
  ];

  atividades = [
    { icone: 'ico-coral', texto: 'Nova ocorrência registrada — Teatro', quando: 'Hoje, 14:20 · por Coordenação' },
    { icone: 'ico-green', texto: 'Chamada de Reforço Escolar concluída', quando: 'Hoje, 10:05 · 21/22 presentes' },
    { icone: 'ico-blue',  texto: 'Novo assistido cadastrado — Lucas Ferreira', quando: 'Ontem, 16:40' },
    { icone: 'ico-teal',  texto: 'Semanário de Música atualizado', quando: 'Ontem, 09:15' },
  ];

  barrasFrequencia = [
    { label: 'Música',     valor: 86 },
    { label: 'Esporte',    valor: 74 },
    { label: 'Reforço',    valor: 91 },
    { label: 'Teatro',     valor: 63 },
    { label: 'Informát.',  valor: 80 },
  ];
}