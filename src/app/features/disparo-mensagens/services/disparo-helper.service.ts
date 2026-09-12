import { Injectable } from '@angular/core';

@Injectable()
export class DisparoHelperService {
  /**
   * Retorna a classe CSS correspondente para a badge baseada no status de sucesso.
   */
  obterClasseBadge(sucesso: boolean): string {
    if (sucesso) {
      return 'tm-badge-success';
    }
    return 'tm-badge-danger';
  }

  /**
   * Formata o número de telefone no formato internacional legível (ex: +55 (11) 99999-8888).
   */
  formatarTelefone(numero: string): string {
    if (!numero) {
      return '';
    }
    const numLimpo = numero.replace(/\D/g, '');
    if (numLimpo.length === 13) {
      return `+${numLimpo.substring(0, 2)} (${numLimpo.substring(2, 4)}) ${numLimpo.substring(4, 9)}-${numLimpo.substring(9)}`;
    }
    return numero;
  }
}
