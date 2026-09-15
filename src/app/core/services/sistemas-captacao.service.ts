import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SistemaItem {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  status: 'Ativo' | 'Inativo' | 'Em Manutenção';
  url: string;
  icone: string;
  dataIntegracao: string;
  createdAtUtc?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SistemasCaptacaoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/SistemasCaptacao`;

  getAll(): Observable<SistemaItem[]> {
    return this.http.get<SistemaItem[]>(this.apiUrl);
  }

  getById(id: string): Observable<SistemaItem> {
    return this.http.get<SistemaItem>(`${this.apiUrl}/${id}`);
  }

  create(sistema: Partial<SistemaItem>): Observable<SistemaItem> {
    return this.http.post<SistemaItem>(this.apiUrl, sistema);
  }

  update(id: string, sistema: Partial<SistemaItem>): Observable<SistemaItem> {
    return this.http.put<SistemaItem>(`${this.apiUrl}/${id}`, sistema);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
