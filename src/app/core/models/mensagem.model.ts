export interface Contato {
  id?: number;
  numero: string;
  nome: string;
  endereco?: string;
  site?: string;
  tipos?: string;
  nichoBuscado?: string;
  cidadeBuscada?: string;
  temWhatsApp?: boolean;
  enviado?: boolean;
  dataEnvio?: string;
}

export interface ItemImportacao {
  nome: string;
  numero: string;
  endereco?: string;
  site?: string;
  tipos?: string;
  nichoBuscado?: string;
  cidadeBuscada?: string;
  temWhatsApp?: boolean;
}

export interface ItemImportacaoEspecial {
  id?: number;
  nome: string;
  numero: string;
  endereco?: string;
  site?: string;
  tipos?: string;
  nichoBuscado?: string;
  cidadeBuscada?: string;
  enviado?: boolean;
  falhou?: boolean;
  temWhatsApp?: boolean;
  dataEnvio?: string;
  dataCriacao?: string;
}

export interface ImportarEstabelecimentosRequest {
  estabelecimentos: ItemImportacao[];
}

export interface ImportarEstabelecimentosResponse {
  totalRecebidos: number;
  novoscadastrados: number;
  duplicadosIgnorados: number;
  mensagem: string;
}

export interface EnviarMensagemRequest {
  numero: string;
  mensagem: string;
}

export interface EnviarLoteRequest {
  mensagemTemplate?: string;
  mensagensTemplates?: string[];
  contatos: Contato[];
}

export interface ResultadoItem {
  nome: string;
  numero: string;
  sucesso: boolean;
  detalhe: string;
}

export interface EnviarLoteResponse {
  total: number;
  enviadosSucesso: number;
  falhas: number;
  erros: ResultadoItem[];
}

export interface ProgressoEnvio {
  indiceAtual: number;
  totalContatos: number;
  nomeContato: string;
  numeroSanitizado: string;
  sucesso: boolean;
  mensagemLog: string;
  delayProximoSegundos: number;
  timestamp: string;
}

export interface StatusConexao {
  estado: string;
  instancia: string;
  conectado: boolean;
  mensagem: string;
  managerUrl: string;
}

export interface QrCode {
  code: string;
  base64: string;
  sucesso: boolean;
  mensagem: string;
}

export interface TemplateMensagemItem {
  id?: number;
  posicao: number;
  conteudo: string;
  dataAtualizacao?: string;
}

export interface SalvarTemplatesRequest {
  templates: TemplateMensagemItem[];
}
