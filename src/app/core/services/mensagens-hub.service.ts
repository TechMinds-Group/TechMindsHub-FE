import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { ProgressoEnvio } from '../models/mensagem.model';

@Injectable({
  providedIn: 'root'
})
export class MensagensHubService {
  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl = `${environment.apiUrl}/hubs/mensagens`;

  readonly progressoAtual = signal<ProgressoEnvio | null>(null);
  readonly logs = signal<ProgressoEnvio[]>([]);
  readonly conectado = signal<boolean>(false);

  /**
   * Conecta ao Hub do SignalR e registra os ouvintes de eventos em tempo real.
   */
  iniciarConexao(): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    this.hubConnection
      .start()
      .then(() => {
        this.conectado.set(true);
        console.log('[SignalR] Conectado ao Hub de Mensagens');
      })
      .catch((err) => {
        this.conectado.set(false);
        console.warn('[SignalR] Falha ao conectar ao Hub:', err);
      });

    this.hubConnection.on('ReceberProgressoEnvio', (progresso: ProgressoEnvio) => {
      this.progressoAtual.set(progresso);
      this.logs.update((logsAnteriores) => [progresso, ...logsAnteriores]);
    });

    this.hubConnection.onreconnecting(() => {
      this.conectado.set(false);
    });

    this.hubConnection.onreconnected(() => {
      this.conectado.set(true);
    });

    this.hubConnection.onclose(() => {
      this.conectado.set(false);
    });
  }

  /**
   * Encerra a conexão do SignalR.
   */
  pararConexao(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.conectado.set(false);
    }
  }

  /**
   * Reseta a lista de logs do monitor.
   */
  limparLogs(): void {
    this.logs.set([]);
    this.progressoAtual.set(null);
  }
}
