import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatReais, getStockMovementLabel } from '../lib/api'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card, CardHeader, CardBody, CardFooter } from '../components/Card'
import { Badge, StatusBadge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { Table, Pagination } from '../components/Table'
import { Dropdown } from '../components/Dropdown'
import { Skeleton, SkeletonCard } from '../components/Skeleton'

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

interface StockMovement {
  id: string
  product: { id: string; name: string }
  type: string
  qty: number
  balanceAfter: number
  order?: { id: string; code: number; dayKey: string }
  reason: string
  user: { name: string }
  createdAt: string
}

export const Stock = () => {
  const { hasRole } = useAuth()
  const { success, error: showError } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'adjust' | 'history'>('adjust')
  const [formData, setFormData] = useState({
    qty: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const loadProducts = useCallback(async () => {
    try {
      const data = await api.get<Product[]>('/products?includeInactive=true')
      const stockProducts = data.filter(p => p.trackStock)
      setProducts(stockProducts)
      if (stockProducts.length > 0 && !selectedProduct) {
        setSelectedProduct(stockProducts[0].id)
      }
    } catch (err: any) {
      showError('Erro ao carregar produtos', err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedProduct, showError])

  const loadMovements = useCallback(async () => {
    if (!selectedProduct) return
    try {
      const data = await api.get<StockMovement[]>(`/stock/product/${selectedProduct}?limit=${pageSize * page}`)
      setMovements(data)
      setTotalPages(Math.ceil(data.length / pageSize) || 1)
    } catch (err: any) {
      showError('Erro ao carregar movimentações', err.message)
    }
  }, [selectedProduct, page, pageSize, showError])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    loadMovements()
  }, [loadMovements, selectedProduct])

  const handleAdjustStock = async () => {
    if (!formData.qty || !formData.reason.trim()) {
      showError('Dados incompletos', 'Informe a quantidade e o motivo')
      return
    }
    if (!selectedProduct) return
    setSubmitting(true)
    try {
      await api.patch(`/products/${selectedProduct}/stock`, {
        qty: parseInt(formData.qty),
        reason: formData.reason.trim(),
      })
      success('Estoque ajustado', `${formData.qty > 0 ? '+' : ''}${formData.qty} unidades`)
      setFormData({ qty: '', reason: '' })
      setModalOpen(false)
      loadProducts()
      loadMovements()
    } catch (err: any) {
      showError('Erro ao ajustar estoque', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openAdjustModal = (productId: string) => {
    setSelectedProduct(productId)
    setModalMode('adjust')
    setFormData({ qty: '', reason: '' })
    setModalOpen(true)
  }

  const openHistoryModal = (productId: string) => {
    setSelectedProduct(productId)
    setModalMode('history')
    loadMovements()
    setModalOpen(true)
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)

  const columns = [
    { key: 'name', header: 'Produto', render: (p: Product) => (
      <div>
        <div style={{ fontWeight: 'var(--font-medium)' }}>{p.name}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {p.category} • {p.unit}
        </div>
      </div>
    )},
    { key: 'stock', header: 'Estoque', render: (p: Product) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-lg)', color: p.availableQty <= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {p.availableQty}
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}> / {p.stockQty}</span>
        {p.reservedQty > 0 && (
          <Badge variant="warning" size="sm">{p.reservedQty} reservados</Badge>
        )}
        <Badge variant={p.active ? 'success' : 'danger'} size="sm">{p.active ? 'Ativo' : 'Inativo'}</Badge>
      </div>
    )},
    { key: 'price', header: 'Preço', render: (p: Product) => formatReais(p.priceCents) },
    { key: 'actions', header: 'Ações', render: (p: Product) => (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="outline" size="sm" onClick={() => openAdjustModal(p.id)} disabled={!p.active}>
          Ajustar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openHistoryModal(p.id)}>
          Histórico
        </Button>
      </div>
    )},
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="page-subtitle">Controle de quantidade, ajustes e histórico de movimentações</p>
        </div>
      </div>

      {/* Resumo */}
      <Card className="mb-6">
        <CardBody style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Produtos Controlados</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{products.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Total em Estoque</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>
              {products.reduce((s, p) => s + p.stockQty, 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Disponível para Venda</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>
              {products.reduce((s, p) => s + p.availableQty, 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Reservados</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-warning)' }}>
              {products.reduce((s, p) => s + p.reservedQty, 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Com Estoque Baixo (≤5)</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-danger)' }}>
              {products.filter(p => p.active && p.availableQty <= 5 && p.availableQty > 0).length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Esgotados</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-danger)' }}>
              {products.filter(p => p.active && p.availableQty <= 0).length}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardHeader>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Produtos com Controle de Estoque</h3>
        </CardHeader>
        <CardBody padding="none">
          {loading ? (
            <div style={{ padding: 'var(--space-8)' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} lines={2} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Nenhum produto com controle de estoque</h3>
              <p>Ative a opção "Controla Estoque" no cadastro do produto</p>
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={products}
                keyExtractor={p => p.id}
                striped
                hoverable
              />
            </>
          )}
        </CardBody>
      </Card>

      {/* Modal Ajuste/Histórico */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'adjust' ? `Ajustar Estoque: ${selectedProductData?.name}` : `Histórico: ${selectedProductData?.name}`}
        size={modalMode === 'history' ? 'lg' : 'md'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Fechar
            </Button>
            {modalMode === 'adjust' && (
              <Button variant="primary" onClick={handleAdjustStock} loading={submitting} disabled={submitting}>
                {submitting ? 'Salvando...' : 'Aplicar Ajuste'}
              </Button>
            )}
          </>
        }
      >
        {modalMode === 'adjust' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {selectedProductData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Em Estoque</div>
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-xl)', color: 'var(--color-primary)' }}>{selectedProductData.stockQty}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Reservados</div>
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-xl)', color: 'var(--color-warning)' }}>{selectedProductData.reservedQty}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Disponível</div>
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-xl)', color: 'var(--color-success)' }}>{selectedProductData.availableQty}</div>
                </div>
              </div>
            )}
            <Input
              label="Quantidade (use negativo para reduzir)"
              type="number"
              step="1"
              value={formData.qty}
              onChange={e => setFormData(prev => ({ ...prev, qty: e.target.value }))}
              placeholder="Ex: 10 ou -5"
              required
            />
            <Input
              label="Motivo *"
              type="text"
              value={formData.reason}
              onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Ex: Reposição, Perda, Ajuste de inventário"
              required
            />
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <strong>Exemplos:</strong>
              <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <li>Entrada: <code>10</code> - Reposição de compra</li>
                <li>Saída manual: <code>-3</code> - Perda/quebra</li>
                <li>Ajuste: <code>5</code> - Diferença de inventário</li>
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {movements.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Nenhuma movimentação registrada</p>
            ) : (
              <Table
                columns={[
                  { key: 'type', header: 'Tipo', render: (m: StockMovement) => (
                    <Badge variant="primary" size="sm">{getStockMovementLabel(m.type)}</Badge>
                  )},
                  { key: 'qty', header: 'Qtd', render: (m: StockMovement) => (
                    <span style={{ color: ['entrada'].includes(m.type) ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'var(--font-medium)' }}>
                      {m.type === 'entrada' ? '+' : ''}{m.qty}
                    </span>
                  )},
                  { key: 'balanceAfter', header: 'Saldo', render: (m: StockMovement) => <strong>{m.balanceAfter}</strong> },
                  { key: 'reason', header: 'Motivo', render: (m: StockMovement) => m.reason || '—' },
                  { key: 'order', header: 'Pedido', render: (m: StockMovement) => m.order ? `#${m.order.dayKey}-${m.order.code}` : '—' },
                  { key: 'user', header: 'Usuário', render: (m: StockMovement) => m.user?.name || '—' },
                  { key: 'createdAt', header: 'Data/Hora', render: (m: StockMovement) => new Date(m.createdAt).toLocaleString('pt-BR') },
                ]}
                data={movements}
                keyExtractor={m => m.id}
                striped
                hoverable
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}