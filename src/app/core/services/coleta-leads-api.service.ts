import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CampanhaColeta,
  CriarCampanhaColetaRequest,
  CriarCampanhaColetaResponse,
  FiltrosLeads,
  LeadColetado,
  PresetColeta,
  SalvarPresetColetaRequest
} from '../models/coleta-leads.model';

@Injectable({
  providedIn: 'root'
})
export class ColetaLeadsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/coleta-leads`;

  /**
   * Lista os presets de coleta salvos (RN-018).
   */
  listarPresets(): Observable<PresetColeta[]> {
    return this.http.get<PresetColeta[]>(`${this.baseUrl}/presets`);
  }

  /**
   * Cria um preset com a combinação atual de nichos × cidades (RN-018).
   * Nome duplicado → 409; nome ausente → 400 (ERR-020).
   */
  criarPreset(request: SalvarPresetColetaRequest): Observable<PresetColeta> {
    return this.http.post<PresetColeta>(`${this.baseUrl}/presets`, request);
  }

  /**
   * Atualiza um preset existente (RN-018).
   */
  atualizarPreset(id: string, request: SalvarPresetColetaRequest): Observable<PresetColeta> {
    return this.http.put<PresetColeta>(`${this.baseUrl}/presets/${encodeURIComponent(id)}`, request);
  }

  /**
   * Exclui um preset (RN-018).
   */
  excluirPreset(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/presets/${encodeURIComponent(id)}`);
  }

  /**
   * Inicia uma campanha de coleta ad-hoc ou a partir de um preset (RN-017).
   * Responde 202 com campanhaId — execução assíncrona monitorada por polling.
   */
  criarCampanha(request: CriarCampanhaColetaRequest): Observable<CriarCampanhaColetaResponse> {
    return this.http.post<CriarCampanhaColetaResponse>(`${this.baseUrl}/campanhas`, request);
  }

  /**
   * Lista o histórico de campanhas com status e contadores (RN-017/019).
   */
  listarCampanhas(): Observable<CampanhaColeta[]> {
    return this.http.get<CampanhaColeta[]>(`${this.baseUrl}/campanhas`);
  }

  /**
   * Exclui a campanha e os leads coletados por ela (fora do escopo original —
   * solicitação do stakeholder; CR futuro). 409 → campanha Em Andamento
   * não pode ser excluída; 404 → inexistente.
   */
  excluirCampanha(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/campanhas/${encodeURIComponent(id)}`);
  }

  /**
   * Lista leads coletados com filtros combináveis case-insensitive (RN-022) — sem paginação.
   */
  listarLeads(filtros: FiltrosLeads): Observable<LeadColetado[]> {
    return this.http.get<LeadColetado[]>(`${this.baseUrl}/leads`, { params: this.montarParams(filtros) });
  }

  /**
   * Exporta os leads dos filtros ativos em vCard (RN-025). Download via blob com
   * observe: 'response' para ler o header de contagem X-Leads-Exportados (ERR-063).
   */
  exportarVcf(filtros: FiltrosLeads): Observable<HttpResponse<Blob>> {
    const params = this.montarParams({ nicho: filtros.nicho, cidade: filtros.cidade });
    return this.http.get(`${this.baseUrl}/exportar-vcf`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  private montarParams(filtros: FiltrosLeads): HttpParams {
    let params = new HttpParams();
    if (filtros.nicho && filtros.nicho.trim()) {
      params = params.set('nicho', filtros.nicho.trim());
    }
    if (filtros.cidade && filtros.cidade.trim()) {
      params = params.set('cidade', filtros.cidade.trim());
    }
    if (filtros.campanhaId && filtros.campanhaId.trim()) {
      params = params.set('campanhaId', filtros.campanhaId.trim());
    }
    return params;
  }
}
