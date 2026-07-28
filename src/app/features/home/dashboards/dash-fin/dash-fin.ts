import { Component } from '@angular/core';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-dash-fin',
  standalone: true,
  imports: [StatCard],
  templateUrl: './dash-fin.html'
})
export class DashFin {
  exportacoes = [
    { arquivo: 'prestacao_contas_mai2025', periodo: 'Maio/2025',    projeto: 'Crescer Brincando', formato: 'PDF',  data: '02/06/2025' },
    { arquivo: 'assistidos_consolidado',   periodo: 'Abr–Mai/2025', projeto: 'Todos',              formato: 'XLSX', data: '28/05/2025' },
    { arquivo: 'frequencia_abr2025',       periodo: 'Abril/2025',   projeto: 'Mais Futuro',        formato: 'XLSX', data: '05/05/2025' },
  ];
}