import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { MensagensApiService } from '../../../../core/services/mensagens-api.service';
import { StatusConexao, QrCode } from '../../../../core/models/mensagem.model';

@Component({
  selector: 'app-whatsapp-conexao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-conexao.component.html',
  styleUrl: './whatsapp-conexao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsappConexaoComponent implements OnInit, OnDestroy {
  @Input() instanceName: string = 'groom';

  private readonly apiService = inject(MensagensApiService);
  private pollingSub?: Subscription;

  readonly statusConexao = signal<StatusConexao | null>(null);
  readonly qrCode = signal<QrCode | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly carregandoQrCode = signal<boolean>(false);
  readonly mensagemAcao = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarStatus(true);
    this.iniciarPollingStatus();
  }

  ngOnDestroy(): void {
    this.pararPolling();
  }

  private iniciarPollingStatus(): void {
    // Polling a cada 2.5 segundos para atualizar status automaticamente sem F5 ao escanear o QR Code
    this.pollingSub = interval(2500).subscribe(() => {
      this.carregarStatus(false);
    });
  }

  private pararPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  /**
   * Consulta o status atual da instância na Evolution API.
   */
  carregarStatus(mostrarLoading: boolean = true): void {
    if (mostrarLoading) {
      this.carregando.set(true);
    }

    this.apiService.obterStatusWhatsApp(this.instanceName).subscribe({
      next: (status) => {
        this.statusConexao.set(status);

        // Se acabou de conectar, remove o QR Code ativo da tela
        if (status.conectado && this.qrCode()) {
          this.qrCode.set(null);
          this.mensagemAcao.set('WhatsApp conectado com sucesso!');
        }

        if (mostrarLoading) {
          this.carregando.set(false);
        }
      },
      error: (err) => {
        console.error('Erro ao consultar status do WhatsApp:', err);
        if (mostrarLoading) {
          this.statusConexao.set({
            estado: 'close',
            instancia: this.instanceName,
            conectado: false,
            mensagem: 'Não foi possível se comunicar com o backend ou Evolution API.',
            managerUrl: 'http://localhost:8089'
          });
          this.carregando.set(false);
        }
      }
    });
  }

  /**
   * Solicita a geração ou atualização do QR Code na tela.
   */
  gerarQrCode(): void {
    this.carregandoQrCode.set(true);
    this.mensagemAcao.set(null);
    this.apiService.obterQrCodeWhatsApp(this.instanceName).subscribe({
      next: (res) => {
        this.qrCode.set(res);
        this.carregandoQrCode.set(false);
        this.carregarStatus(false);
      },
      error: (err) => {
        console.error('Erro ao solicitar QR Code:', err);
        this.carregandoQrCode.set(false);
        this.mensagemAcao.set('Falha ao obter o QR Code. Certifique-se que a Evolution API v2 está ativa.');
      }
    });
  }

  /**
   * Desconecta a sessão do WhatsApp.
   */
  desconectar(): void {
    if (!confirm('Deseja realmente desconectar esta sessão do WhatsApp?')) {
      return;
    }

    this.carregando.set(true);
    this.apiService.desconectarWhatsApp(this.instanceName).subscribe({
      next: (res) => {
        this.mensagemAcao.set(res.mensagem);
        this.qrCode.set(null);
        this.carregarStatus(true);
      },
      error: (err) => {
        console.error('Erro ao desconectar:', err);
        this.carregando.set(false);
        this.mensagemAcao.set('Não foi possível desconectar a instância.');
      }
    });
  }
}
