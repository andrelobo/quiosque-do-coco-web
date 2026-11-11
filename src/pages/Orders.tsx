import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatReais, formatDateTime, getStatusLabel, getPaymentMethodLabel } from '../lib/api'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card, CardHeader, CardBody, CardFooter } from '../components/Card'
import { Badge, StatusBadge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { Table, Pagination } from '../components/Table'
import { Tabs, TabPanel } from '../components/Tabs'
import { Dropdown } from '../components/Dropdown'

interface Order {
  id: string
  code: number
  dayKey: string
  shift: { id: string; number: number } | string
  items: { name: string; qty: number; unitPriceCents: number; note?: string }[]
  totalCents: number
  status: string
  pickupName?: string
  createdBy: { name: string }
  createdAt: string
  paidAt?: string
  deliveredAt?: string
}

const PAYMENT_METHODS = [
  { id: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { id: 'pix', label: 'Pix', icon: '📱' },
  { id: 'cartao', label: 'Cartão', icon: '💳' },
]

// A API pode devolver o turno como id (string) ou populado ({ id, number }).
const getShiftId = (order: Order) => (typeof order.shift === 'string' ? order.shift : order.shift.id)
const getShiftNumber = (order: Order) => (typeof order.shift === 'string' ? null : order.shift.number)

const STATUS_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'em_edicao', label: 'Em Edição' },
  { id: 'aguardando_pagamento', label: 'Aguardando Pagamento' },
  { id: 'pago', label: 'Pago' },
  { id: 'em_preparo', label: 'Em Preparo' },
  { id: 'pronto', label: 'Pronto' },
  { id: 'entregue', label: 'Entregue' },
  { id: 'cancelado', label: 'Cancelados' },
]

export const Orders = () => {
  const { hasRole } = useAuth()
  const { success, error: showError } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderPayments, setOrderPayments] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>('dinheiro')
  const [cashReceived, setCashReceived] = useState('')
  const [cardType, setCardType] = useState<'debito' | 'credito'>('debito')
  const [pixReference, setPixReference] = useState('')

  const loadOrders = useCallback(async () => {
    try {
      const status = activeTab !== 'all' ? activeTab : undefined
      // A API responde paginado: { data, total, page, limit, totalPages }.
      const res = await api.get<any>(`/orders?status=${status || ''}&page=${page}&limit=${pageSize}&search=${searchTerm}`)
      const list: Order[] = Array.isArray(res) ? res : (res?.data ?? [])
      setOrders(list)
      setTotalPages(Array.isArray(res) ? Math.ceil(list.length / pageSize) || 1 : (res?.totalPages || 1))
    } catch (err: any) {
      showError('Erro ao carregar pedidos', err.message)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, pageSize, showError])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const loadOrderDetails = useCallback(async (orderId: string) => {
    try {
      const order = await api.get<Order>(`/orders/${orderId}`)
      const payments = await api.get<any[]>(`/payments/order/${orderId}`)
      setSelectedOrder(order)
      setOrderPayments(payments)
      setModalOpen(true)
    } catch (err: any) {
      showError('Erro ao carregar detalhes', err.message)
    }
  }, [showError])

  // Confirma o pagamento de um pedido aguardando pagamento. Se já existe
  // pagamento pendente/confirmado, reaproveita; senão abre o modal para
  // registrar a forma de pagamento (pedidos enviados sem pagamento).
  const handleConfirmPayment = async (order: Order) => {
    setActionLoading(order.id)
    try {
      const payments = await api.get<any[]>(`/payments/order/${order.id}`)
      const pending = payments.find(p => p.status === 'pendente')
      if (pending) {
        await api.patch(`/payments/${pending.id}/confirm`, {})
      } else if (payments.some(p => p.status === 'confirmado')) {
        // Pagamento já confirmado, mas o pedido não foi liberado: idempotente.
        await api.post(`/orders/${order.id}/confirm-payment`, {})
      } else {
        setPaymentOrder(order)
        setPaymentMethod('dinheiro')
        setCashReceived(String(order.totalCents))
        setCardType('debito')
        setPixReference('')
        setPaymentModalOpen(true)
        return
      }

      success('Pagamento confirmado', `Pedido #${order.dayKey}-${order.code}`)
      loadOrders()
      if (selectedOrder?.id === order.id) loadOrderDetails(order.id)
    } catch (err: any) {
      showError('Erro ao confirmar pagamento', err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const closePaymentModal = () => {
    if (submitting) return
    setPaymentModalOpen(false)
    setPaymentOrder(null)
    setPixReference('')
  }

  const submitPayment = async () => {
    if (!paymentOrder) return
    const amount = paymentOrder.totalCents
    const received = parseFloat(cashReceived)

    if (paymentMethod === 'dinheiro' && (!Number.isFinite(received) || received < amount)) {
      showError('Valor recebido insuficiente', `Informe ao menos ${formatReais(amount)}`)
      return
    }

    setSubmitting(true)
    try {
      const payment = await api.post<any>('/payments', {
        orderId: paymentOrder.id,
        shiftId: getShiftId(paymentOrder),
        method: paymentMethod,
        amount,
        received: paymentMethod === 'dinheiro' ? received : undefined,
        cardType: paymentMethod === 'cartao' ? cardType : undefined,
        reference: paymentMethod === 'pix' && pixReference.trim() ? pixReference.trim() : undefined,
      })

      await api.patch(`/payments/${payment.id}/confirm`, {})

      success('Pagamento confirmado', `Pedido #${paymentOrder.dayKey}-${paymentOrder.code}`)
      setPaymentModalOpen(false)
      setPaymentOrder(null)
      setPixReference('')
      loadOrders()
      if (selectedOrder?.id === paymentOrder.id) loadOrderDetails(paymentOrder.id)
    } catch (err: any) {
      showError('Erro ao confirmar pagamento', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (orderId: string, action: string) => {
    setActionLoading(orderId)
    try {
      let endpoint = ''
      let successMsg = ''
      
      switch (action) {
        case 'submit':
          endpoint = `/orders/${orderId}/submit`
          successMsg = 'Pedido enviado para pagamento'
          break
        case 'prep':
          endpoint = `/orders/${orderId}/prep`
          successMsg = 'Preparo iniciado'
          break
        case 'ready':
          endpoint = `/orders/${orderId}/ready`
          successMsg = 'Marcado como pronto'
          break
        case 'deliver':
          endpoint = `/orders/${orderId}/deliver`
          successMsg = 'Pedido entregue'
          break
        case 'cancel':
          const reason = prompt('Motivo do cancelamento:')
          if (!reason) return
          endpoint = `/orders/${orderId}/cancel`
          successMsg = 'Pedido cancelado'
          await api.post(endpoint, { reason })
          break
      }
      
      if (endpoint && action !== 'cancel') {
        await api.post(endpoint, {})
      }
      
      success(successMsg, `Pedido #${orderId}`)
      loadOrders()
      if (selectedOrder?.id === orderId) {
        loadOrderDetails(orderId)
      }
    } catch (err: any) {
      showError('Erro ao executar ação', err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredOrders = orders.filter(o => 
    searchTerm === '' || 
    o.code.toString().includes(searchTerm) ||
    o.dayKey.includes(searchTerm) ||
    o.pickupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const columns = [
    { key: 'code', header: 'Pedido', render: (o: Order) => (
      <div>
        <strong>#{o.dayKey}-{o.code}</strong>
        {o.pickupName && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{o.pickupName}</div>}
      </div>
    )},
    { key: 'items', header: 'Itens', render: (o: Order) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {o.items.slice(0, 3).map((item, idx) => (
          <div key={idx} style={{ fontSize: 'var(--text-sm)' }}>
            {item.name} × {item.qty}
          </div>
        ))}
        {o.items.length > 3 && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            +{o.items.length - 3} mais
          </div>
        )}
      </div>
    )},
    { key: 'total', header: 'Total', render: (o: Order) => <strong>{formatReais(o.totalCents)}</strong> },
    { key: 'status', header: 'Status', render: (o: Order) => <StatusBadge status={o.status} /> },
    { key: 'shift', header: 'Turno', render: (o: Order) => <Badge variant="primary" size="sm">{getShiftNumber(o) ? `#${getShiftNumber(o)}` : '—'}</Badge> },
    { key: 'createdBy', header: 'Atendente', render: (o: Order) => o.createdBy?.name || '—' },
    { key: 'createdAt', header: 'Criado em', render: (o: Order) => formatDateTime(o.createdAt) },
    { key: 'actions', header: 'Ações', render: (o: Order) => (
      <Dropdown
        trigger={<button className="btn btn-ghost btn-sm" style={{ padding: 'var(--space-1) var(--space-2)' }} disabled={actionLoading === o.id}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>}
        items={[
          { label: 'Ver detalhes', onClick: () => loadOrderDetails(o.id), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> },
          { label: 'Enviar p/ pagamento', onClick: () => handleAction(o.id, 'submit'), disabled: o.status !== 'em_edicao' || actionLoading === o.id, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
          { label: 'Confirmar pagamento', onClick: () => handleConfirmPayment(o), disabled: o.status !== 'aguardando_pagamento' || actionLoading === o.id, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
          { label: 'Iniciar preparo', onClick: () => handleAction(o.id, 'prep'), disabled: o.status !== 'pago' || actionLoading === o.id, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" /><path d="M12 6v6l4 2" /></svg> },
          { label: 'Marcar pronto', onClick: () => handleAction(o.id, 'ready'), disabled: o.status !== 'em_preparo' || actionLoading === o.id, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> },
          { label: 'Entregar', onClick: () => handleAction(o.id, 'deliver'), disabled: !['pago', 'em_preparo', 'pronto'].includes(o.status) || actionLoading === o.id, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg> },
          { label: 'Cancelar', onClick: () => handleAction(o.id, 'cancel'), disabled: ['entregue', 'cancelado'].includes(o.status) || actionLoading === o.id, danger: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> },
        ]}
      />
    )},
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pedidos</h1>
          <p className="page-subtitle">Acompanhamento e gestão de todos os pedidos</p>
        </div>
      </div>

      {/* Filtros e Abas */}
      <Card className="mb-6">
        <CardBody>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center' }}>
            <Tabs tabs={STATUS_TABS} activeTab={activeTab} onChange={setActiveTab} />
            
            <Input
              placeholder="Buscar pedido, cliente, item..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              leftIcon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
              style={{ flex: 1, minWidth: '250px' }}
            />
          </div>
        </CardBody>
      </Card>

      {/* Tabela */}
      <Card>
        <CardBody padding="none">
          {loading ? (
            <div style={{ padding: 'var(--space-8)' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Nenhum pedido encontrado</h3>
              <p>Tente alterar os filtros ou a busca</p>
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={filteredOrders}
                keyExtractor={o => o.id}
                striped
                hoverable
              />
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalItems={filteredOrders.length}
              />
            </>
          )}
        </CardBody>
      </Card>

      {/* Modal Detalhes do Pedido */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedOrder(null); setOrderPayments([]); }}
        title={`Pedido #${selectedOrder?.dayKey}-${selectedOrder?.code}`}
        size="xl"
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Header do pedido */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>#{selectedOrder.dayKey}-{selectedOrder.code}</h3>
                  <StatusBadge status={selectedOrder.status} />
                  {selectedOrder.pickupName && (
                    <Badge variant="primary" size="sm">{selectedOrder.pickupName}</Badge>
                  )}
                </div>
                <div style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                  Turno {getShiftNumber(selectedOrder) ? `#${getShiftNumber(selectedOrder)}` : '—'} • {selectedOrder.createdBy?.name} • {formatDateTime(selectedOrder.createdAt)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Total</div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>
                  {formatReais(selectedOrder.totalCents)}
                </div>
              </div>
            </div>

            {/* Itens */}
            <Card>
              <CardHeader>
                <h4>Itens do Pedido ({selectedOrder.items.length})</h4>
              </CardHeader>
              <CardBody padding="none">
                <Table
                  columns={[
                    { key: 'name', header: 'Produto', render: (i: any) => (
                      <div>
                        <div style={{ fontWeight: 'var(--font-medium)' }}>{i.name}</div>
                        {i.note && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{i.note}</div>}
                      </div>
                    )},
                    { key: 'qty', header: 'Qtd', render: (i: any) => <span style={{ fontWeight: 'var(--font-medium)' }}>{i.qty}</span> },
                    { key: 'unitPrice', header: 'Preço Unit.', render: (i: any) => formatReais(i.unitPriceCents) },
                    { key: 'total', header: 'Total', render: (i: any) => <strong>{formatReais(i.unitPriceCents * i.qty)}</strong> },
                  ]}
                  data={selectedOrder.items}
                  keyExtractor={(_, i) => String(i)}
                  striped
                />
              </CardBody>
            </Card>

            {/* Pagamentos */}
            {orderPayments.length > 0 && (
              <Card>
                <CardHeader>
                  <h4>Pagamentos ({orderPayments.length})</h4>
                </CardHeader>
                <CardBody padding="none">
                  <Table
                    columns={[
                      { key: 'method', header: 'Modalidade', render: (p: any) => (
                        <Badge variant="primary" size="sm">
                          {getPaymentMethodLabel(p.method)}
                          {p.cardType && ` (${p.cardType})`}
                        </Badge>
                      )},
                      { key: 'amountCents', header: 'Valor', render: (p: any) => <strong>{formatReais(p.amountCents)}</strong> },
                      { key: 'receivedCents', header: 'Recebido', render: (p: any) => p.method === 'dinheiro' ? formatReais(p.receivedCents) : '—' },
                      { key: 'changeCents', header: 'Troco', render: (p: any) => p.method === 'dinheiro' && p.changeCents > 0 ? formatReais(p.changeCents) : '—' },
                      { key: 'status', header: 'Status', render: (p: any) => <StatusBadge status={p.status} /> },
                      { key: 'reference', header: 'Referência', render: (p: any) => p.reference || '—' },
                    ]}
                    data={orderPayments}
                    keyExtractor={p => p.id}
                    striped
                  />
                </CardBody>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <h4>Histórico</h4>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <TimelineEvent time={selectedOrder.createdAt} label="Pedido criado" user={selectedOrder.createdBy?.name} />
                  {selectedOrder.paidAt && <TimelineEvent time={selectedOrder.paidAt} label="Pagamento confirmado" icon="💰" />}
                  {selectedOrder.status === 'em_preparo' && <TimelineEvent time={selectedOrder.updatedAt} label="Preparo iniciado" icon="👨‍🍳" />}
                  {selectedOrder.status === 'pronto' && <TimelineEvent time={selectedOrder.updatedAt} label="Marcado como pronto" icon="✅" />}
                  {selectedOrder.deliveredAt && <TimelineEvent time={selectedOrder.deliveredAt} label="Entregue" icon="📦" />}
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </Modal>

      {/* Modal para registrar pagamento de pedido enviado sem pagamento */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={closePaymentModal}
        title={paymentOrder ? `Registrar pagamento • #${paymentOrder.dayKey}-${paymentOrder.code}` : 'Registrar pagamento'}
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={closePaymentModal} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="success" onClick={submitPayment} loading={submitting}>
              Confirmar pagamento
            </Button>
          </div>
        }
      >
        {paymentOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total do pedido</span>
              <strong style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)' }}>
                {formatReais(paymentOrder.totalCents)}
              </strong>
            </div>

            <div>
              <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>
                Forma de pagamento
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                {PAYMENT_METHODS.map(method => (
                  <Button
                    key={method.id}
                    type="button"
                    variant={paymentMethod === method.id ? 'primary' : 'outline'}
                    onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                    disabled={submitting}
                  >
                    <span aria-hidden="true">{method.icon}</span> {method.label}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === 'dinheiro' && (
              <Input
                label="Valor recebido"
                type="number"
                step="0.01"
                min={paymentOrder.totalCents}
                value={cashReceived}
                onChange={e => setCashReceived(e.target.value)}
                hint={`Troco: ${formatReais(Math.max(0, (parseFloat(cashReceived) || 0) - paymentOrder.totalCents))}`}
              />
            )}

            {paymentMethod === 'pix' && (
              <Input
                label="Referência/Comprovante (opcional)"
                type="text"
                value={pixReference}
                onChange={e => setPixReference(e.target.value)}
                placeholder="ID da transação ou observação"
              />
            )}

            {paymentMethod === 'cartao' && (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="orderCardType"
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
                    name="orderCardType"
                    value="credito"
                    checked={cardType === 'credito'}
                    onChange={() => setCardType('credito')}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontWeight: 'var(--font-medium)' }}>Crédito</span>
                </label>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function TimelineEvent({ time, label, user, icon }: { time: string; label: string; user?: string; icon?: string }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 'var(--text-sm)' }}>
        {icon || '📝'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'var(--font-medium)' }}>{label}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {formatDateTime(time)}{user ? ` • ${user}` : ''}
        </div>
      </div>
    </div>
  )
}