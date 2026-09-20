/**
 * Modelos de domínio do BC-6 — Captação de Leads (RN-017..025).
 * Contratos espelham API_CONTRACTS.md §9 (camelCase, enums serializados como string).
 */

/** Status de execução assíncrona de uma campanha de coleta (RN-017). */
export type StatusCampanhaColeta = 'EmAndamento' | 'Concluida' | 'Falha';

/** Preset nomeado de combinação nichos × cidades (RN-018). */
export interface PresetColeta {
  id: string;
  nome: string;
  nichos: string[];
  cidades: string[];
  dataCriacao: string;
  dataAtualizacao: string;
}

/** Request de criação/edição de preset (RN-018; nome ausente → 400 ERR-020). */
export interface SalvarPresetColetaRequest {
  nome: string;
  nichos: string[];
  cidades: string[];
}

/** Request de criação de campanha de coleta — sem presetId → ad-hoc (RN-017). */
export interface CriarCampanhaColetaRequest {
  nichos: string[];
  cidades: string[];
  presetId?: string;
}

/** Resposta 202 da criação de campanha — execução assíncrona monitorada por polling. */
export interface CriarCampanhaColetaResponse {
  campanhaId: string;
}

/** Campanha de coleta com status e contadores de acompanhamento (RN-017/019). */
export interface CampanhaColeta {
  id: string;
  nichos: string[];
  cidades: string[];
  presetColetaId: string | null;
  status: StatusCampanhaColeta;
  totalColetados: number;
  duplicadosIgnorados: number;
  erro: string | null;
  dataInicio: string;
  dataFim: string | null;
}

/** Lead coletado do Google Places — place_id único (RN-019/022). */
export interface LeadColetado {
  id: number;
  placeId: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  telefoneNormalizado: string | null;
  site: string | null;
  tipos: string | null;
  nichoBuscado: string;
  cidadeBuscada: string;
  campanhaColetaId: string;
  dataColeta: string;
}

/** Filtros combináveis da listagem de leads e da exportação VCF (RN-022/025). */
export interface FiltrosLeads {
  nicho?: string;
  cidade?: string;
  campanhaId?: string;
}

/** Configuração visual por status de campanha (badges da listagem). */
export interface StatusCampanhaConfig {
  label: string;
  badgeClass: string;
  icon: string;
}

/** Mapeamento status → badge (padrão const RECORD — AGENTS.md regra 16). */
export const STATUS_CAMPANHA_CONFIG: Record<StatusCampanhaColeta, StatusCampanhaConfig> = {
  EmAndamento: {
    label: 'Em Andamento',
    badgeClass: 'bg-warning-subtle text-warning border border-warning',
    icon: 'fas fa-sync-alt fa-spin'
  },
  Concluida: {
    label: 'Concluída',
    badgeClass: 'bg-success-subtle text-success border border-success',
    icon: 'fas fa-check-circle'
  },
  Falha: {
    label: 'Falha',
    badgeClass: 'bg-danger-subtle text-danger border border-danger',
    icon: 'fas fa-times-circle'
  }
};
