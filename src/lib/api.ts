const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Importante para cookies httpOnly
    ...options,
  }

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body)
  }

  const response = await fetch(url, config)
  
  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = isJson && data?.message ? data.message : `Erro ${response.status}`
    throw new ApiError(response.status, message, data)
  }

  return data as T
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body }),
  patch: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PATCH', body }),
  put: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PUT', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
}

export { ApiError }

// Helpers de formatação
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

// Para valores que a API agora retorna em Reais (ex: 100.00 ao invés de 10000)
export function formatReais(reais: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    em_edicao: 'Em Edição',
    aguardando_pagamento: 'Aguardando Pagamento',
    pago: 'Pago',
    em_preparo: 'Em Preparo',
    pronto: 'Pronto',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    nao_confirmado: 'Não Confirmado',
    concluida: 'Concluída',
    aberto: 'Aberto',
    fechado: 'Fechado',
  }
  return labels[status] || status
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'Pix',
    cartao: 'Cartão',
  }
  return labels[method] || method
}

export function getCardTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    debito: 'Débito',
    credito: 'Crédito',
  }
  return labels[type] || type
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    coco: 'Coco',
    'cafe-da-manha': 'Café da Manhã',
    almoco: 'Almoço',
    petiscos: 'Petiscos',
    drinks: 'Drinks',
    outros: 'Outros',
  }
  return labels[category] || category
}

export function getStockMovementLabel(type: string): string {
  const labels: Record<string, string> = {
    entrada: 'Entrada',
    reserva: 'Reserva',
    liberacao: 'Liberação',
    saida: 'Saída',
    perda: 'Perda',
    ajuste: 'Ajuste',
  }
  return labels[type] || type
}

export function getCashMovementLabel(type: string): string {
  const labels: Record<string, string> = {
    reforco: 'Reforço',
    retirada: 'Retirada',
  }
  return labels[type] || type
}