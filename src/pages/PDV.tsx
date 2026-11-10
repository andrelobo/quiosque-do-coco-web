import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatCurrency, formatReais, getCategoryLabel } from '../lib/api'
import { Button } from '../components/Button'
import { Badge, StatusBadge } from '../components/Badge'
import { Modal, ConfirmModal } from '../components/Modal'
import { Input } from '../components/Input'
import { Avatar } from '../components/Avatar'
import { Dropdown } from '../components/Dropdown'

interface Product {
  id: string
  name: string
  category: string
  priceCents: number
  unit: string
  active: boolean
  requiresPrep: boolean
  trackStock: boolean
  stockQty: number
  reservedQty: number
  availableQty: number
}

interface ShiftAvailability {
  product: string
  available: boolean
}

interface Shift {
  id: string
  number: number
  status: string
  openedBy: string
  openedAt: string
  initialCashCents: number
  availability: ShiftAvailability[]
}

interface OrderItem {
  product: string
  name: string
  unitPriceCents: number
  qty: number
  note?: string
  trackStock: boolean
  requiresPrep: boolean
}

interface Order {
  id: string
  code: number
  dayKey: string
  shift: string
  items: OrderItem[]
  totalCents: number
  status: string
  pickupName?: string
  createdBy: string
  paidAt?: string
  deliveredAt?: string
}

interface Payment {
  id: string
  order: string
  shift: string
  method: string
  cardType?: string
  amountCents: number
  receivedCents: number
  changeCents: number
  status: string
  reference?: string
}

const CATEGORY_ICONS: Record<string, string> = {
  coco: '🥥',
  'cafe-da-manha': '☕',
  almoco: '🍱',
  petiscos: '🍟',
  drinks: '🥤',
  outros: '📦',
}

const PAYMENT_METHODS = [
  { id: 'dinheiro', label: 'Dinheiro', icon: '💵', hint: 'Calcula troco automaticamente' },
  { id: 'pix', label: 'Pix', icon: '📱', hint: 'Confirmação manual do recebimento' },
  { id: 'cartao', label: 'Cartão', icon: '💳', hint: 'Débito ou crédito - confirmação manual' },
]

export const PDV = () => {
  const { user, hasRole } = useAuth()
  const { success, error: showError, warning } = useToast()
  const navigate = useNavigate()
  
  const [shift, setShift] = useState<Shift | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [pickupName, setPickupName] = useState('')
  const [orderStatus, setOrderStatus] = useState<'editing' | 'awaiting_payment' | 'paid'>('editing')
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [cashReceived, setCashReceived] = useState('')
  const [cardType, setCardType] = useState<'debito' | 'credito'>('debito')
  const [pixReference, setPixReference] = useState('')
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  // Carregar turno atual e produtos
  const loadData = useCallback(async () => {
    try {
      const [shiftData, productsData] = await Promise.all([
        api.get<Shift>('/shifts/current'),
        api.get<Product[]>('/products?includeInactive=false'),
      ])
      setShift(shiftData)
      setProducts(productsData)
    } catch (err: any) {
      if (err.status === 404) {
        // Nenhum turno aberto
        setShift(null)
        const productsData = await api.get<Product[]>('/products?includeInactive=false')
        setProducts(productsData)
      } else {
        showError('Erro ao carregar dados', err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtrar produtos disponíveis
  const availableProducts = useMemo(() => {
    if (!shift) return []
    
    const availableProductIds = new Set(
      shift.availability
        .filter(a => a.available)
        .map(a => a.product)
    )

    return products.filter(p => {
      if (!availableProductIds.has(p.id)) return false
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
  }, [products, shift, selectedCategory, searchTerm])

  // Categorias disponíveis
  const categories = useMemo(() => {
    const cats = new Set(availableProducts.map(p => p.category))
    return Array.from(cats).sort()
  }, [availableProducts])

  // Cálculos do pedido
  const subtotal = orderItems.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0)
  const change = selectedPayment === 'dinheiro' && cashReceived 
    ? Math.max(0, parseFloat(cashReceived) - subtotal) 
    : 0
  const canSubmit = orderItems.length > 0 && orderStatus === 'editing' && !!selectedPayment
  const canPay = orderItems.length > 0 && orderStatus === 'awaiting_payment' && !!currentOrderId

  // Adicionar produto ao pedido
  const addProduct = (product: Product) => {
    if (orderStatus !== 'editing') return
    
    setOrderItems(prev => {
      const existing = prev.find(i => i.product === product.id)
      if (existing) {
        if (product.trackStock && existing.qty >= product.availableQty) {
          warning('Estoque insuficiente', `Apenas ${product.availableQty} unidades disponíveis`)
          return prev
        }
        return prev.map(i => i.product === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        product: product.id,
        name: product.name,
        unitPriceCents: product.priceCents,
        qty: 1,
        trackStock: product.trackStock,
        requiresPrep: product.requiresPrep,
      }]
    })
  }

  // Atualizar quantidade
  const updateQty = (productId: string, delta: number) => {
    setOrderItems(prev => {
      const item = prev.find(i => i.product === productId)
      if (!item) return prev
      const newQty = item.qty + delta
      if (newQty <= 0) return prev.filter(i => i.product !== productId)
      if (item.trackStock) {
        const product = products.find(p => p.id === productId)
        if (product && newQty > product.availableQty) {
          warning('Estoque insuficiente', `Apenas ${product.availableQty} unidades disponíveis`)
          return prev
        }
      }
      return prev.map(i => i.product === productId ? { ...i, qty: newQty } : i)
    })
  }

  // Remover item
  const removeItem = (productId: string) => {
    setOrderItems(prev => prev.filter(i => i.product !== productId))
  }

  // Limpa o pedido em andamento (após pagamento ou cancelamento)
  const resetOrder = () => {
    setOrderItems([])
    setPickupName('')
    setOrderStatus('editing')
    setSelectedPayment(null)
    setCashReceived('')
    setPixReference('')
    setCardType('debito')
    setCurrentOrderId(null)
    setPaymentModalOpen(false)
  }

  // Enviar para pagamento: cria o pedido e reserva o estoque
  const submitForPayment = async () => {
    if (!shift || orderItems.length === 0 || !selectedPayment) return
    setSubmitting(true)
    try {
      const order = await api.post<Order>('/orders', {
        shiftId: shift.id,
        items: orderItems.map(i => ({
          productId: i.product,
          qty: i.qty,
          note: i.note,
        })),
        pickupName: pickupName || undefined,
      })
      setCurrentOrderId(order.id)
      // Reserva o estoque e muda o pedido para "aguardando pagamento".
      await api.post(`/orders/${order.id}/submit`, {})
      success('Pedido enviado', 'Aguardando confirmação de pagamento')
      setOrderStatus('awaiting_payment')
    } catch (err: any) {
      showError('Erro ao enviar pedido', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Confirmar pagamento do pedido já criado/reservado
  const confirmPayment = async () => {
    if (!shift || !selectedPayment || orderItems.length === 0 || !currentOrderId) return
    setSubmitting(true)
    try {
      const received = selectedPayment === 'dinheiro' && cashReceived
        ? parseFloat(cashReceived)
        : subtotal

      await api.post('/payments', {
        orderId: currentOrderId,
        shiftId: shift.id,
        method: selectedPayment,
        amount: subtotal,
        received,
        cardType: selectedPayment === 'cartao' ? cardType : undefined,
        reference: selectedPayment === 'pix' ? pixReference : undefined,
      })

      // Confirmar pagamento (libera o pedido para preparo/entrega)
      const payments = await api.get<Payment[]>(`/payments/order/${currentOrderId}`)
      const pendingPayment = payments.find(p => p.status === 'pendente')
      if (!pendingPayment) throw new Error('Pagamento pendente não encontrado')
      await api.patch(`/payments/${pendingPayment.id}/confirm`, {})

      success('Pagamento confirmado', 'Pedido liberado para preparo/entrega')
      resetOrder()

      // Recarregar turno
      loadData()
    } catch (err: any) {
      showError('Erro ao confirmar pagamento', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Cancelar pedido
  const cancelOrder = () => {
    setConfirmCancelOpen(true)
  }

  // Voltar para edição: cancela o pedido já reservado e libera o estoque
  const backToEditing = async () => {
    if (!currentOrderId) {
      setOrderStatus('editing')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/orders/${currentOrderId}/cancel`, {
        reason: 'Operador voltou para editar o pedido',
      })
      resetOrder()
    } catch (err: any) {
      showError('Erro ao voltar para edição', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmCancel = async () => {
    setSubmitting(true)
    const orderId = currentOrderId
    try {
      if (orderId) {
        await api.post(`/orders/${orderId}/cancel`, {
          reason: 'Cancelado pelo operador antes do pagamento',
        })
      }
      resetOrder()
      setConfirmCancelOpen(false)
      success('Pedido cancelado', orderId ? 'Reserva de estoque liberada' : 'Itens removidos')
    } catch (err: any) {
      showError('Erro ao cancelar', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Abrir turno
  const openShift = async () => {
    const initialCash = prompt('Valor do fundo inicial (R$):', '100.00')
    if (!initialCash) return
    
    const productIds = products.filter(p => p.active).map(p => p.id)
    try {
      await api.post('/shifts/open', {
        initialCash: parseFloat(initialCash), // agora envia Reais
        productIds,
      })
      success('Turno aberto', `Fundo inicial: ${formatReais(parseFloat(initialCash))}`)
      loadData()
    } catch (err: any) {
      showError('Erro ao abrir turno', err.message)
    }
  }

  if (loading) {
    return (
      <div className="pdv-layout">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div className="spinner spinner-lg" />
        </div>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="pdv-layout">
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
          <div className="card p-8" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🥥</div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Nenhum turno aberto</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              Abra um turno para começar a atender
            </p>
            <Button variant="primary" size="lg" onClick={openShift}>
              Abrir Turno
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pdv-layout">
      {/* Lado esquerdo - Produtos */}
      <div className="pdv-products">
        {/* Header do PDV */}
        <div className="card p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>Turno #{shift.number}</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Aberto por {shift.openedBy} às {new Date(shift.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="badge badge-primary">Fundo: {formatReais(shift.initialCashCents)}</span>
            {hasRole('admin', 'responsavel') && (
              <Button variant="ghost" size="sm" onClick={openShift}>
                Novo Turno
              </Button>
            )}
          </div>
        </div>

        {/* Categorias */}
        <div className="pdv-categories" role="tablist" aria-label="Categorias de produtos">
          <button
            className={`pdv-category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
            role="tab"
            aria-selected={selectedCategory === 'all'}
          >
            <span>📋</span> Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`pdv-category-btn ${cat} ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
              role="tab"
              aria-selected={selectedCategory === cat}
            >
              <span>{CATEGORY_ICONS[cat] || '📦'}</span> {getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Busca */}
        <Input
          placeholder="Buscar produto..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          leftIcon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
          className="mb-3"
        />

        {/* Grid de produtos */}
        <div className="pdv-product-grid" role="list" aria-label="Produtos disponíveis">
          {availableProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
              <p>Nenhum produto disponível</p>
              {selectedCategory !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory('all')} style={{ marginTop: 'var(--space-3)' }}>
                  Ver todas as categorias
                </Button>
              )}
            </div>
          ) : (
            availableProducts.map(product => (
              <button
                key={product.id}
                className={`pdv-product-card ${!product.active || (product.trackStock && product.availableQty <= 0) ? 'unavailable' : ''}`}
                onClick={() => addProduct(product)}
                disabled={!product.active || (product.trackStock && product.availableQty <= 0) || orderStatus !== 'editing'}
                role="listitem"
                aria-label={`${product.name} - ${formatReais(product.priceCents)}${product.trackStock ? ` (${product.availableQty} disp.)` : ''}`}
              >
                <div className="pdv-product-icon" aria-hidden="true">
                  {CATEGORY_ICONS[product.category] || '📦'}
                </div>
                <div className="pdv-product-name">{product.name}</div>
                <div className="pdv-product-price">{formatReais(product.priceCents)}</div>
                {product.trackStock && (
                  <span className="pdv-product-badge badge badge-neutral">
                    {product.availableQty} disp.
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Lado direito - Painel do Pedido */}
      <div className="pdv-order-panel">
        <div className="pdv-order-header">
          <h3 className="pdv-order-title">Pedido #{orderItems.length > 0 ? 'Novo' : '—'}</h3>
          <StatusBadge status={orderStatus === 'editing' ? 'em_edicao' : orderStatus === 'awaiting_payment' ? 'aguardando_pagamento' : 'pago'} />
        </div>

        <div className="pdv-order-items">
          {orderItems.length === 0 ? (
            <div className="pdv-order-empty">
              <div className="pdv-order-empty-icon">🛒</div>
              <p>Nenhum item no pedido</p>
              <p style={{ fontSize: 'var(--text-sm)' }}>Selecione produtos ao lado</p>
            </div>
          ) : (
            orderItems.map((item, index) => {
              const product = products.find(p => p.id === item.product)
              const available = product?.availableQty ?? 0
              return (
                <div key={item.product} className="pdv-order-item">
                  <div className="pdv-order-item-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span className="pdv-order-item-name">{item.name}</span>
                      {item.trackStock && (
                        <Badge variant="neutral" size="sm">{available} disp.</Badge>
                      )}
                    </div>
                    {item.note && <div className="pdv-order-item-note">{item.note}</div>}
                    <Input
                      type="text"
                      placeholder="Observação (ex: sem gelo)"
                      value={item.note || ''}
                      onChange={e => setOrderItems(prev => prev.map((i, idx) => idx === index ? { ...i, note: e.target.value } : i))}
                      style={{ marginTop: 'var(--space-2)', width: '100%' }}
                    />
                  </div>
                  <div className="pdv-order-item-controls">
                    <button className="pdv-qty-btn" onClick={() => updateQty(item.product, -1)} disabled={item.qty <= 1} aria-label="Diminuir quantidade">−</button>
                    <span className="pdv-qty-value">{item.qty}</span>
                    <button className="pdv-qty-btn" onClick={() => updateQty(item.product, 1)} disabled={item.trackStock && available <= item.qty} aria-label="Aumentar quantidade">+</button>
                  </div>
                  <div className="pdv-order-item-price">{formatReais(item.unitPriceCents * item.qty)}</div>
                  <button className="pdv-order-item-remove" onClick={() => removeItem(item.product)} aria-label="Remover item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Resumo */}
        <div className="pdv-order-summary">
          <div className="pdv-summary-row">
            <span>Subtotal ({orderItems.reduce((s, i) => s + i.qty, 0)} itens)</span>
            <span>{formatReais(subtotal)}</span>
          </div>
          <div className="pdv-summary-row total">
            <span>Total</span>
            <span>{formatReais(subtotal)}</span>
          </div>
        </div>

        {/* Formas de pagamento */}
        {orderItems.length > 0 && (
          <>
            <div className="pdv-payment-methods">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontWeight: 'var(--font-semibold)' }}>Forma de Pagamento</span>
                <span className="badge badge-outline badge-sm">{orderStatus === 'awaiting_payment' ? 'Aguardando' : 'Selecione'}</span>
              </div>
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  className={`pdv-payment-btn ${selectedPayment === method.id ? 'active' : ''} ${orderStatus !== 'editing' && selectedPayment !== method.id ? 'unavailable' : ''}`}
                  onClick={() => orderStatus === 'editing' && setSelectedPayment(method.id)}
                  disabled={orderStatus !== 'editing' && selectedPayment !== method.id}
                >
                  <span className="pdv-payment-icon" aria-hidden="true">{method.icon}</span>
                  <div>
                    <div className="pdv-payment-label">{method.label}</div>
                    <div className="pdv-payment-hint">{method.hint}</div>
                  </div>
                  {selectedPayment === method.id && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Detalhes do pagamento selecionado */}
            {selectedPayment === 'dinheiro' && (
              <div className="pdv-payment-methods" style={{ borderTop: 'none' }}>
                <Input
                  label="Valor Recebido"
                  type="number"
                  step="0.01"
                  min={subtotal}
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  placeholder="Ex: 20.00"
                  hint={`Troco: ${formatReais(change)}`}
                />
              </div>
            )}

            {selectedPayment === 'pix' && (
              <div className="pdv-payment-methods" style={{ borderTop: 'none' }}>
                <Input
                  label="Referência/Comprovante (opcional)"
                  type="text"
                  value={pixReference}
                  onChange={e => setPixReference(e.target.value)}
                  placeholder="ID da transação ou observação"
                />
              </div>
            )}

            {selectedPayment === 'cartao' && (
              <div className="pdv-payment-methods" style={{ borderTop: 'none' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="cardType"
                      value="debito"
                      checked={cardType === 'debito'}
                      onChange={() => setCardType('debito')}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontWeight: 'var(--font-medium)' }}>Débito</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="cardType"
                      value="credito"
                      checked={cardType === 'credito'}
                      onChange={() => setCardType('credito')}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontWeight: 'var(--font-medium)' }}>Crédito</span>
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {/* Ações */}
        <div className="pdv-order-actions">
          {orderStatus === 'editing' ? (
            <>
              <Button variant="ghost" onClick={cancelOrder} disabled={submitting || orderItems.length === 0}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                size="lg"
                onClick={submitForPayment} 
                disabled={submitting || !canSubmit}
                className="pdv-action-btn primary"
              >
                {submitting ? 'Enviando...' : `Pagar ${formatReais(subtotal)}`}
              </Button>
            </>
          ) : orderStatus === 'awaiting_payment' ? (
            <>
              <Button variant="ghost" onClick={backToEditing} disabled={submitting}>
                Voltar
              </Button>
              <Button 
                variant="success" 
                size="lg"
                onClick={confirmPayment} 
                disabled={submitting || !canPay || !selectedPayment}
                className="pdv-action-btn primary"
              >
                {submitting ? 'Confirmando...' : 'Confirmar Pagamento'}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" onClick={resetOrder} className="pdv-action-btn primary">
              Novo Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Modal de confirmação de cancelamento */}
      <ConfirmModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={confirmCancel}
        title="Cancelar pedido?"
        message="Todos os itens serão removidos. Esta ação não pode ser desfeita."
        confirmText="Sim, cancelar"
        cancelText="Manter pedido"
        variant="danger"
        loading={submitting}
      />
    </div>
  )
}