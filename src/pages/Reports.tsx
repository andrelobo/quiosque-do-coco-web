import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatCurrency, formatReais, formatDate, getStatusLabel, getPaymentMethodLabel } from '../lib/api'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { Card, CardHeader, CardBody, CardFooter } from '../components/Card'
import { Badge, StatusBadge } from '../components/Badge'
import { Table, Pagination } from '../components/Table'
import { Tabs, TabPanel } from '../components/Tabs'
import { Skeleton } from '../components/Skeleton'

interface SalesByPeriod {
  _id: { date: string; shift: number }
  orderCount: number
  itemsSold: number
  totalValue: number
}

interface SalesByProduct {
  _id: string
  name: string
  qty: number
  totalValue: number
}

interface PaymentsByMethod {
  _id: string
  count: number
  totalValue: number
}

interface CashSummary {
  shift: { number: number; status: string }
  initialCashCents: number
  cashReceivedCents: number
  cashRefundedCents: number
  reforcosCents: number
  retiradasCents: number
  expectedCashCents: number
  countedCashCents: number
  differenceCents: number
}

interface PendingOrder {
  id: string
  code: number
  dayKey: string
  items: { name: string; qty: number; unitPriceCents: number }[]
  totalCents: number
  status: string
  pickupName?: string
  createdAt: string
}

interface CancellationRefund {
  cancelledOrders: any[]
  refunds: any[]
}

interface StockReport {
  summary: Record<string, { count: number; totalQty: number }>
  balances: { product: string; currentBalance: number }[]
}

const TABS = [
  { id: 'sales-period', label: 'Vendas por Período' },
  { id: 'sales-product', label: 'Vendas por Produto' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'cash', label: 'Caixa' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'cancellations', label: 'Cancel/Devoluções' },
  { id: 'stock', label: 'Estoque' },
]

export const Reports = () => {
  const { hasRole } = useAuth()
  const { error: showError } = useToast()
  const [activeTab, setActiveTab] = useState('sales-period')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [selectedShift, setSelectedShift] = useState<string>('')
  const [shifts, setShifts] = useState<any[]>([])

  const loadShifts = useCallback(async () => {
    try {
      const shiftData = await api.get<any[]>('/shifts')
      setShifts(shiftData)
    } catch (err: any) {
      showError('Erro ao carregar turnos', err.message)
    }
  }, [showError])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      let result
      switch (activeTab) {
        case 'sales-period':
          result = await api.get<SalesByPeriod[]>(`/reports/sales/period-shift?start=${dateRange.start}&end=${dateRange.end}`)
          break
        case 'sales-product':
          result = await api.get<SalesByProduct[]>(`/reports/sales/by-product?start=${dateRange.start}&end=${dateRange.end}`)
          break
        case 'payments':
          result = await api.get<PaymentsByMethod[]>(`/reports/payments/by-method?start=${dateRange.start}&end=${dateRange.end}`)
          break
        case 'cash':
          if (!selectedShift) { setData(null); setLoading(false); return }
          result = await api.get<CashSummary>(`/reports/cash/${selectedShift}`)
          break
        case 'pending':
          result = await api.get<PendingOrder[]>(`/reports/orders/pending-delivery${selectedShift ? `?shiftId=${selectedShift}` : ''}`)
          break
        case 'cancellations':
          result = await api.get<CancellationRefund>(`/reports/cancellations-refunds?start=${dateRange.start}&end=${dateRange.end}`)
          break
        case 'stock':
          result = await api.get<StockReport>(`/reports/stock`)
          break
      }
      setData(result)
    } catch (err: any) {
      showError('Erro ao gerar relatório', err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [activeTab, dateRange, selectedShift, showError])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const renderSalesPeriod = () => {
    if (!data?.length) return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Nenhuma venda no período</p>
    
    const totalOrders = data.reduce((s: number, d: any) => s + d.orderCount, 0)
    const totalItems = data.reduce((s: number, d: any) => s + d.itemsSold, 0)
    const totalValue = data.reduce((s: number, d: any) => s + d.totalValue, 0)

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Total de Pedidos</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{totalOrders}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Itens Vendidos</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{totalItems}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Valor Total</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>{formatReais(totalValue)}</div>
            </CardBody>
          </Card>
        </div>
        <Table
          columns={[
            { key: 'date', header: 'Data', render: (d: any) => d._id.date },
            { key: 'shift', header: 'Turno', render: (d: any) => `#${d._id.shift}` },
            { key: 'orderCount', header: 'Pedidos', render: (d: any) => d.orderCount },
            { key: 'itemsSold', header: 'Itens', render: (d: any) => d.itemsSold },
            { key: 'totalValue', header: 'Valor', render: (d: any) => <strong>{formatReais(d.totalValue)}</strong> },
          ]}
          data={data}
          keyExtractor={d => `${d._id.date}-${d._id.shift}`}
          striped
        />
      </>
    )
  }

  const renderSalesProduct = () => {
    if (!data?.length) return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Nenhuma venda no período</p>
    
    const totalValue = data.reduce((s: number, d: any) => s + d.totalValue, 0)
    const totalQty = data.reduce((s: number, d: any) => s + d.qty, 0)

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Total de Itens</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{totalQty}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Valor Total</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>{formatReais(totalValue)}</div>
            </CardBody>
          </Card>
        </div>
        <Table
          columns={[
            { key: 'name', header: 'Produto', render: (d: any) => d.name },
            { key: 'qty', header: 'Qtd', render: (d: any) => d.qty },
            { key: 'totalValue', header: 'Valor Total', render: (d: any) => <strong>{formatReais(d.totalValue)}</strong> },
            { key: 'avg', header: 'Preço Médio', render: (d: any) => formatReais(Math.round(d.totalValue / d.qty)) },
          ]}
          data={data}
          keyExtractor={d => d._id}
          striped
        />
      </>
    )
  }

  const renderPayments = () => {
    if (!data?.length) return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Nenhum pagamento no período</p>
    
    const totalValue = data.reduce((s: number, d: any) => s + d.totalValue, 0)
    const totalCount = data.reduce((s: number, d: any) => s + d.count, 0)

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Transações</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{totalCount}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Valor Total</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>{formatReais(totalValue)}</div>
            </CardBody>
          </Card>
        </div>
        <Table
          columns={[
            { key: 'method', header: 'Modalidade', render: (d: any) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Badge variant="primary" size="sm">{getPaymentMethodLabel(d._id)}</Badge>
              </div>
            )},
            { key: 'count', header: 'Qtd', render: (d: any) => d.count },
            { key: 'totalValue', header: 'Valor Total', render: (d: any) => <strong>{formatReais(d.totalValue)}</strong> },
            { key: 'avg', header: 'Ticket Médio', render: (d: any) => formatReais(Math.round(d.totalValue / d.count)) },
          ]}
          data={data}
          keyExtractor={d => d._id}
          striped
        />
      </>
    )
  }

  const renderCash = () => {
    if (!data) return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Selecione um turno para ver o fechamento de caixa</p>
    
    const d = data
    const diffColor = d.differenceCents >= 0 ? 'var(--color-success)' : 'var(--color-danger)'

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <Card style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Fundo Inicial</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>{formatReais(d.initialCashCents)}</div>
            </CardBody>
          </Card>
          <Card style={{ borderLeft: '4px solid var(--color-success)' }}>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Recebimentos (Dinheiro)</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>{formatReais(d.cashReceivedCents)}</div>
            </CardBody>
          </Card>
          <Card style={{ borderLeft: '4px solid var(--color-warning)' }}>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Reforços</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-warning)' }}>{formatReais(d.reforcosCents)}</div>
            </CardBody>
          </Card>
          <Card style={{ borderLeft: '4px solid var(--color-danger)' }}>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Retiradas</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-danger)' }}>{formatReais(d.retiradasCents)}</div>
            </CardBody>
          </Card>
          <Card style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <CardBody>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Devoluções (Dinheiro)</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-accent)' }}>{formatReais(d.cashRefundedCents)}</div>
            </CardBody>
          </Card>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          <Card style={{ background: 'var(--color-bg-subtle)' }}>
            <CardBody style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Esperado em Caixa</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{formatReais(d.expectedCashCents)}</div>
            </CardBody>
          </Card>
          <Card style={{ background: 'var(--color-bg-subtle)' }}>
            <CardBody style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Contado</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{formatReais(d.countedCashCents)}</div>
            </CardBody>
          </Card>
          <Card style={{ background: d.differenceCents >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)' }}>
            <CardBody style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Diferença</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: diffColor }}>
                {d.differenceCents >= 0 ? '+' : ''}{formatReais(d.differenceCents)}
              </div>
            </CardBody>
          </Card>
        </div>
      </>
    )
  }

  const renderPending = () => {
    if (!data?.length) return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Nenhum pedido pendente de entrega</p>
    
    return (
      <Table
        columns={[
          { key: 'code', header: 'Pedido', render: (d: any) => `#${d.dayKey}-${d.code}` },
          { key: 'items', header: 'Itens', render: (d: any) => d.items.map((i: any) => `${i.name} (${i.qty})`).join(', ') },
          { key: 'totalCents', header: 'Valor', render: (d: any) => <strong>{formatReais(d.totalCents)}</strong> },
          { key: 'status', header: 'Status', render: (d: any) => <StatusBadge status={d.status} /> },
          { key: 'pickupName', header: 'Retirada', render: (d: any) => d.pickupName || <span style={{ color: 'var(--color-text-muted)' }}>—</span> },
          { key: 'createdAt', header: 'Criado em', render: (d: any) => formatDate(d.createdAt) },
        ]}
        data={data}
        keyExtractor={d => d.id}
        striped
        hoverable
      />
    )
  }

  const renderCancellations = () => {
    if (!data) return null
    const { cancelledOrders = [], refunds = [] } = data
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Card>
          <CardHeader>
            <h3>Cancelamentos ({cancelledOrders.length})</h3>
          </CardHeader>
          <CardBody padding="none">
            {cancelledOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Nenhum cancelamento no período</p>
            ) : (
              <Table
                columns={[
                  { key: 'code', header: 'Pedido', render: (d: any) => `#${d.dayKey}-${d.code}` },
                  { key: 'reason', header: 'Motivo', render: (d: any) => d.cancelReason || '—' },
                  { key: 'cancelledBy', header: 'Por', render: (d: any) => d.cancelledBy?.name || '—' },
                  { key: 'cancelledAt', header: 'Data/Hora', render: (d: any) => formatDate(d.cancelledAt) },
                ]}
                data={cancelledOrders}
                keyExtractor={d => d.id}
                striped
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3>Devoluções ({refunds.length})</h3>
          </CardHeader>
          <CardBody padding="none">
            {refunds.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Nenhuma devolução no período</p>
            ) : (
              <Table
                columns={[
                  { key: 'order', header: 'Pedido', render: (d: any) => d.order ? `#${d.order.dayKey}-${d.order.code}` : '—' },
                  { key: 'amountCents', header: 'Valor', render: (d: any) => <strong>{formatReais(d.amountCents)}</strong> },
                  { key: 'method', header: 'Modalidade', render: (d: any) => <Badge variant="primary" size="sm">{getPaymentMethodLabel(d.method)}</Badge> },
                  { key: 'status', header: 'Status', render: (d: any) => <StatusBadge status={d.status} /> },
                  { key: 'reason', header: 'Motivo', render: (d: any) => d.reason || '—' },
                  { key: 'createdAt', header: 'Data', render: (d: any) => formatDate(d.createdAt) },
                ]}
                data={refunds}
                keyExtractor={d => d.id}
                striped
              />
            )}
          </CardBody>
        </Card>
      </div>
    )
  }

  const renderStock = () => {
    if (!data) return null
    const { summary = {}, balances = [] } = data

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Card>
          <CardHeader>
            <h3>Resumo de Movimentações</h3>
          </CardHeader>
          <CardBody>
            <Table
              columns={[
                { key: 'type', header: 'Tipo', render: (d: any) => <Badge variant="primary" size="sm">{d._id}</Badge> },
                { key: 'count', header: 'Qtd Mov.', render: (d: any) => d.count },
                { key: 'totalQty', header: 'Total Unidades', render: (d: any) => d.totalQty },
              ]}
              data={Object.entries(summary).map(([k, v]) => ({ _id: k, ...v }))}
              keyExtractor={d => d._id}
              striped
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3>Saldo por Produto</h3>
          </CardHeader>
          <CardBody padding="none">
            {balances.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Nenhum produto com controle de estoque</p>
            ) : (
              <Table
                columns={[
                  { key: 'product', header: 'Produto', render: (d: any) => d.product },
                  { key: 'balance', header: 'Saldo Atual', render: (d: any) => (
                    <span style={{ fontWeight: 'var(--font-bold)', color: d.currentBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {d.currentBalance}
                    </span>
                  )},
                ]}
                data={balances}
                keyExtractor={d => d.product}
                striped
              />
            )}
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Análise de vendas, pagamentos, caixa e estoque</p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardBody>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
            <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
            
            {(activeTab !== 'stock' && activeTab !== 'cash') && (
              <>
                <Input
                  label="Data Inicial"
                  type="date"
                  value={dateRange.start}
                  onChange={e => handleDateChange('start', e.target.value)}
                  style={{ minWidth: '180px' }}
                />
                <Input
                  label="Data Final"
                  type="date"
                  value={dateRange.end}
                  onChange={e => handleDateChange('end', e.target.value)}
                  style={{ minWidth: '180px' }}
                />
              </>
            )}
            
            {(activeTab === 'cash' || activeTab === 'pending') && (
              <Select
                label="Turno"
                options={[{ value: '', label: 'Todos os turnos' }, ...shifts.map(s => ({ value: s.id, label: `Turno #${s.number} (${formatDate(s.openedAt)})` }))]}
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                style={{ minWidth: '250px' }}
              />
            )}
            
            <Button variant="primary" onClick={fetchReport} loading={loading} disabled={loading}>
              {loading ? 'Carregando...' : 'Gerar Relatório'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Conteúdo do relatório */}
      <Card>
        <CardBody>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : (
            <>
              {activeTab === 'sales-period' && renderSalesPeriod()}
              {activeTab === 'sales-product' && renderSalesProduct()}
              {activeTab === 'payments' && renderPayments()}
              {activeTab === 'cash' && renderCash()}
              {activeTab === 'pending' && renderPending()}
              {activeTab === 'cancellations' && renderCancellations()}
              {activeTab === 'stock' && renderStock()}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}