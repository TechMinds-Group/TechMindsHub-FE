import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  estabelecimento: string;
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserContext {
  id: string;
  nome: string;
  email: string;
  tenantId: string;
  role?: string;
  roles?: string[];
  roleColor?: string;
  roleIconClass?: string;
  estabelecimento?: string;
  tema?: 'dispositivo' | 'escuro' | 'claro';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  
  private readonly _currentUser = signal<UserContext | null>(null);
  public readonly currentUser = this._currentUser.asReadonly();
  
  public readonly isAdmin = computed(() => {
    const role = this._currentUser()?.role;
    const roles = this._currentUser()?.roles ?? [];
    return role === 'SuperAdmin' || role === 'Administrador' || roles.includes('SuperAdmin') || roles.includes('Administrador');
  });

  public readonly currentUserId = computed(() => this._currentUser()?.id);

  private readonly _logout$ = new Subject<void>();
  public readonly logout$ = this._logout$.asObservable();

  private readonly apiUrl = `${environment.apiUrl}/login`;
  private readonly baseApiUrl = `${environment.apiUrl}/api/account`;

  login(request: LoginRequest, rememberMe = false): Observable<any> {
    const body = { ...request, rememberMe };
    return this.http.post<any>(`${this.apiUrl}?useCookies=true&useSessionCookies=${!rememberMe}`, body, {
      withCredentials: true
    }).pipe(
      tap(() => {
        localStorage.removeItem('tenant_id');
      }),
      switchMap(() => this.getMe()),
      tap(user => {
        if (user && user.tenantId) {
          localStorage.setItem('tenant_id', user.tenantId);
        }
      })
    );
  }

  getMe(): Observable<UserContext> {
    return this.http.get<UserContext>(`${this.baseApiUrl}/me`, {
      withCredentials: true,
      headers: { 'X-Skip-Error-Toast': 'true' }
    }).pipe(
      tap(user => {
        this._currentUser.set(user);
      })
    );
  }

  checkAuth(): Observable<any> {
    return this.http.get<any>(`${this.baseApiUrl}/status`, {
      withCredentials: true,
      headers: { 'X-Skip-Error-Toast': 'true' }
    });
  }

  forceChangePassword(request: any): Observable<any> {
    return this.http.post<any>(`${this.baseApiUrl}/ForceChangePassword`, request, {
      withCredentials: true
    });
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        localStorage.removeItem('tenant_id');
        this._currentUser.set(null);
        this._logout$.next();
      })
    );
  }
}
