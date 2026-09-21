import { Component, ChangeDetectionStrategy, input, model, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalvarPresetColetaRequest } from '../../../../../core/models/coleta-leads.model';

/**
 * Modal de criação/edição de preset de coleta (RN-018).
 * Recebe nome/nichos/cidades iniciais via input, permite editar os chips e
 * emite o request pronto para o service.
 */
@Component({
  selector: 'app-preset-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preset-modal.component.html',
  styleUrl: './preset-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PresetModalComponent implements OnInit {
  readonly modo = input.required<'criar' | 'editar'>();
  readonly nomeInicial = input<string>('');
  readonly nichosIniciais = input<string[]>([]);
  readonly cidadesIniciais = input<string[]>([]);

  readonly salvo = output<SalvarPresetColetaRequest>();
  readonly cancelado = output<void>();

  readonly aberto = model<boolean>(true);

  readonly nome = signal<string>('');
  readonly nichos = signal<string[]>([]);
  readonly cidades = signal<string[]>([]);
  readonly novoNicho = signal<string>('');
  readonly novaCidade = signal<string>('');
  readonly erroNome = signal<string | null>(null);

  ngOnInit(): void {
    this.nome.set(this.nomeInicial());
    this.nichos.set([...this.nichosIniciais()]);
    this.cidades.set([...this.cidadesIniciais()]);
  }

  adicionarNicho(valor: string): void {
    this.adicionarValor(this.nichos, valor, this.novoNicho);
  }

  removerNicho(valor: string): void {
    this.nichos.update(lista => lista.filter(n => n !== valor));
  }

  adicionarCidade(valor: string): void {
    this.adicionarValor(this.cidades, valor, this.novaCidade);
  }

  removerCidade(valor: string): void {
    this.cidades.update(lista => lista.filter(c => c !== valor));
  }

  confirmar(): void {
    const nomeTrim = this.nome().trim();
    if (!nomeTrim) {
      this.erroNome.set('Informe o nome do preset.');
      return;
    }
    this.erroNome.set(null);
    this.salvo.emit({ nome: nomeTrim, nichos: [...this.nichos()], cidades: [...this.cidades()] });
  }

  fechar(): void {
    this.cancelado.emit();
  }

  private adicionarValor(lista: ReturnType<typeof signal<string[]>>, valor: string, campo: ReturnType<typeof signal<string>>): void {
    const trim = valor.trim();
    if (!trim) {
      return;
    }
    lista.update(atual => (atual.some(v => v.toLowerCase() === trim.toLowerCase()) ? atual : [...atual, trim]));
    campo.set('');
  }
}
