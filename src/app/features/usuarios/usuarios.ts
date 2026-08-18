import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CadastroUsuario } from './cadastro/cadastro-usuario';
import { DefinirSenha } from './senha/definir-senha';

type Aba = 'cadastro' | 'senha';

@Component({
  selector: 'app-usuarios',
  imports: [CadastroUsuario, DefinirSenha],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Usuarios {
  aba = signal<Aba>('cadastro');
}
