import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponsavelService } from '../../../core/responsavel.service';
import { ResponsavelResponseDTO } from '../../../shared/models/responsavel/ResponsavelResponseDTO';
import { ResponsavelForm } from './form/responsavel-form';

@Component({
  selector: 'app-responsaveis',
  imports: [CommonModule, ResponsavelForm],
  templateUrl: './responsaveis.html',
  styleUrl: './responsaveis.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Responsaveis implements OnInit {
  private responsavelService = inject(ResponsavelService);

  responsaveis = signal<ResponsavelResponseDTO[]>([]);
  carregando = signal(false);

  mostrarModal = signal(false);
  responsavelSelecionado = signal<ResponsavelResponseDTO | null>(null);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.responsavelService.listar().subscribe({
      next: (lista) => {
        this.responsaveis.set(lista);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar responsáveis:', erro);
        this.carregando.set(false);
      },
    });
  }

  get dataMaxima(): string {
    return new Date().toISOString().split('T')[0];
  }

  abrirNovo(): void {
    this.responsavelSelecionado.set(null);
    this.mostrarModal.set(true);
  }

  abrirEdicao(responsavel: ResponsavelResponseDTO): void {
    this.responsavelSelecionado.set(responsavel);
    this.mostrarModal.set(true);
  }

  aoSalvar(): void {
    this.mostrarModal.set(false);
    this.responsavelSelecionado.set(null);
    this.carregar();
  }

  aoCancelar(): void {
    this.mostrarModal.set(false);
    this.responsavelSelecionado.set(null);
  }
}