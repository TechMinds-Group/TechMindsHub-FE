import { Routes } from '@angular/router';
import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';

describe('AppRoutes — Coleta de Leads', () => {
  function buscarRota(caminho: string) {
    return routes.find(r => r.path === caminho);
  }

  it('deve registrar a rota /coleta com lazy load do ColetaLeadsComponent', () => {
    const rota = buscarRota('coleta');
    expect(rota).toBeDefined();
    expect(rota?.loadComponent).toBeDefined();
  });

  it('deve proteger a rota /coleta com authGuard — sem sessão redireciona ao login', () => {
    const rota = buscarRota('coleta');
    expect(rota?.canActivate).toContain(authGuard);
  });
});
