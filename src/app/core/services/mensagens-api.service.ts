import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnviarMensagemRequest, EnviarLoteRequest, EnviarLoteResponse, ResultadoItem, StatusConexao, QrCode, Contato, ImportarEstabelecimentosRequest, ImportarEstabelecimentosResponse, TemplateMensagemItem, SalvarTemplatesRequest } from '../models/mensagem.model';

@Injectable({
  providedIn: 'root'
})
export class MensagensApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5005/api/mensagens';
  private readonly whatsappUrl = 'http://localhost:5005/api/whatsapp';
  private readonly templatesUrl = 'http://localhost:5005/api/templates-mensagem';

  /**
   * Envia uma mensagem individual através da API backend.
   */
  enviarMensagem(request: EnviarMensagemRequest, instanceName?: string): Observable<ResultadoItem> {
    const url = instanceName ? `${this.baseUrl}/enviar?instanceName=${encodeURIComponent(instanceName)}` : `${this.baseUrl}/enviar`;
    return this.http.post<ResultadoItem>(url, request);
  }

  /**
   * Dispara o envio em lote de mensagens.
   */
  enviarLote(request: EnviarLoteRequest, instanceName?: string): Observable<EnviarLoteResponse> {
    const url = instanceName ? `${this.baseUrl}/enviar-lote?instanceName=${encodeURIComponent(instanceName)}` : `${this.baseUrl}/enviar-lote`;
    return this.http.post<EnviarLoteResponse>(url, request);
  }

  /**
   * Consulta o status da conexão da instância no WhatsApp.
   */
  obterStatusWhatsApp(instanceName?: string): Observable<StatusConexao> {
    const url = instanceName ? `${this.whatsappUrl}/status?instanceName=${encodeURIComponent(instanceName)}` : `${this.whatsappUrl}/status`;
    return this.http.get<StatusConexao>(url);
  }

  /**
   * Solicita a geração/obtenção do QR Code para conectar a instância.
   */
  obterQrCodeWhatsApp(instanceName?: string): Observable<QrCode> {
    const url = instanceName ? `${this.whatsappUrl}/qrcode?instanceName=${encodeURIComponent(instanceName)}` : `${this.whatsappUrl}/qrcode`;
    return this.http.get<QrCode>(url);
  }

  /**
   * Solicita o encerramento/desconexão da sessão do WhatsApp.
   */
  desconectarWhatsApp(instanceName?: string): Observable<{ mensagem: string }> {
    const url = instanceName ? `${this.whatsappUrl}/desconectar?instanceName=${encodeURIComponent(instanceName)}` : `${this.whatsappUrl}/desconectar`;
    return this.http.post<{ mensagem: string }>(url, {});
  }

  /**
   * Obtém a lista de estabelecimentos persistidos no banco de dados.
   */
  obterEstabelecimentos(): Observable<Contato[]> {
    return this.http.get<Contato[]>('http://localhost:5005/api/estabelecimentos');
  }

  /**
   * Envia lote de estabelecimentos extraídos da planilha para persistência com desduplicação no banco.
   */
  importarEstabelecimentos(payload: ImportarEstabelecimentosRequest): Observable<ImportarEstabelecimentosResponse> {
    return this.http.post<ImportarEstabelecimentosResponse>('http://localhost:5005/api/estabelecimentos/importar', payload);
  }

  /**
   * Remove todos os estabelecimentos cadastrados no banco de dados.
   */
  limparEstabelecimentos(): Observable<{ mensagem: string }> {
    return this.http.delete<{ mensagem: string }>('http://localhost:5005/api/estabelecimentos');
  }

  /**
   * Obtém os templates de mensagem cadastrados no banco de dados.
   */
  obterTemplates(): Observable<TemplateMensagemItem[]> {
    return this.http.get<TemplateMensagemItem[]>(this.templatesUrl);
  }

  /**
   * Salva e persiste os templates de mensagem no banco de dados.
   */
  salvarTemplates(templates: TemplateMensagemItem[]): Observable<TemplateMensagemItem[]> {
    const payload: SalvarTemplatesRequest = { templates };
    return this.http.put<TemplateMensagemItem[]>(this.templatesUrl, payload);
  }
}
