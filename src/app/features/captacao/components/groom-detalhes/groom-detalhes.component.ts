import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { DisparoMensagensComponent } from '../../../disparo-mensagens/components/disparo-mensagens/disparo-mensagens.component';
import { WhatsappConexaoComponent } from '../../../whatsapp-conexao/components/whatsapp-conexao/whatsapp-conexao.component';

@Component({
  selector: 'app-groom-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    DisparoMensagensComponent,
    WhatsappConexaoComponent
  ],
  templateUrl: './groom-detalhes.component.html',
  styleUrl: './groom-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroomDetalhesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly sistemaId = signal<string>('groom');

  readonly sistemaNome = computed(() => this.sistemaId() === 'abobora' ? 'Abóbora' : 'Groom');
  readonly sistemaUrl = computed(() => this.sistemaId() === 'abobora' ? 'https://abobora.techminds.net.br' : 'https://groom.techminds.net.br/sg-auth-x7k9p');
  readonly sistemaIcone = computed(() => this.sistemaId() === 'abobora' ? 'fas fa-seedling' : 'fas fa-cut');
  readonly sistemaCategoria = computed(() => this.sistemaId() === 'abobora' ? 'Captação & Automação' : 'Gestão de Agendamentos & Barbearias');

  // Controle dos blocos colapsáveis (accordions)
  readonly disparoExpanded = signal<boolean>(false);
  readonly whatsappExpanded = signal<boolean>(false);

  ngOnInit(): void {
    const paramId = this.route.snapshot.params['id'];
    if (paramId) {
      this.sistemaId.set(paramId.toLowerCase());
    }
  }

  toggleDisparo(): void {
    this.disparoExpanded.update(v => !v);
  }

  toggleWhatsapp(): void {
    this.whatsappExpanded.update(v => !v);
  }

  voltar(): void {
    this.router.navigate(['/captacao']);
  }

  acessarSistema(): void {
    window.open(this.sistemaUrl(), '_blank');
  }
}
