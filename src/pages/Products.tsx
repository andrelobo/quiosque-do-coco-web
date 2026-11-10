import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatCurrency, getCategoryLabel, getStatusLabel } from '../lib/api'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card, CardHeader, CardBody, CardFooter } from '../components/Card'
import { Badge, StatusBadge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { Table, Pagination } from '../components/Table'
import { Dropdown } from '../components/Dropdown'
import { Skeleton } from '../components/Skeleton'

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
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'coco', label: 'Coco' },
  { value: 'cafe-da-manha', label: 'Café da Manhã' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'petiscos', label: 'Petiscos' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'outros', label: 'Outros' },
]

export const Products = () => {
  const { hasRole } = useAuth()
  const { success, error: showError } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'coco',
    priceCents: '',
    unit: 'un',
    active: true,
    requiresPrep: false,
    trackStock: false,
    stockQty: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      const data = await api.get<Product[]>(`/products?includeInactive=true`)
      setProducts(data)
      setTotalPages(Math.ceil(data.length / pageSize) || 1)
    } catch (err: any) {
      showError('Erro ao carregar produtos', err.message)
    } finally {
      setLoading(false)
    }
  }, [pageSize, showError])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize)

  const openCreateModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      category: 'coco',
      priceCents: '',
      unit: 'un',
      active: true,
      requiresPrep: false,
      trackStock: false,
      stockQty: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      priceCents: String(product.priceCents),
      unit: product.unit,
      active: product.active,
      requiresPrep: product.requiresPrep,
      trackStock: product.trackStock,
      stockQty: String(product.stockQty),
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.priceCents) {
      showError('Dados incompletos', 'Nome e preço são obrigatórios')
      return
    }
    setSubmitting(true)
    try {
      const data = {
        name: formData.name.trim(),
        category: formData.category,
        priceCents: parseInt(formData.priceCents),
        unit: formData.unit,
        active: formData.active,
        requiresPrep: formData.requiresPrep,
        trackStock: formData.trackStock,
        stockQty: formData.trackStock ? parseInt(formData.stockQty || '0') : 0,
      }

      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, data)
        success('Produto atualizado', formData.name)
      } else {
        await api.post('/products', data)
        success('Produto criado', formData.name)
      }
      setModalOpen(false)
      loadProducts()
    } catch (err: any) {
      showError('Erro ao salvar', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = (id: string) => {
    setProductToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const executeDelete = async () => {
    if (!productToDelete) return
    setSubmitting(true)
    try {
      await api.patch(`/products/${productToDelete}`, { active: false })
      success('Produto desativado', 'O produto foi marcado como inativo')
      setDeleteConfirmOpen(false)
      setProductToDelete(null)
      loadProducts()
    } catch (err: any) {
      showError('Erro ao desativar', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (product: Product) => {
    setSubmitting(true)
    try {
      await api.patch(`/products/${product.id}`, { active: !product.active })
      success(product.active ? 'Produto desativado' : 'Produto ativado', product.name)
      loadProducts()
    } catch (err: any) {
      showError('Erro ao alterar status', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStockChange = async (product: Product, delta: number) => {
    const newQty = Math.max(0, product.stockQty + delta)
    setSubmitting(true)
    try {
      await api.patch(`/products/${product.id}/stock`, { qty: delta, reason: delta > 0 ? 'Reposição manual' : 'Ajuste manual' })
      success('Estoque atualizado', `${product.name}: ${newQty} ${product.unit}`)
      loadProducts()
    } catch (err: any) {
      showError('Erro ao ajustar estoque', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Produto', render: (p: Product) => (
      <div>
        <div style={{ fontWeight: 'var(--font-medium)' }}>{p.name}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {getCategoryLabel(p.category)} • {p.unit}
        </div>
      </div>
    )},
    { key: 'priceCents', header: 'Preço', render: (p: Product) => <strong>{formatCurrency(p.priceCents)}</strong> },
    { key: 'stock', header: 'Estoque', render: (p: Product) => p.trackStock ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontWeight: 'var(--font-medium)' }}>
          {p.availableQty} / {p.stockQty}
        </span>
        {p.reservedQty > 0 && (
          <Badge variant="warning" size="sm">{p.reservedQty} reservados</Badge>
        )}
      </div>
    ) : (
      <span style={{ color: 'var(--color-text-muted)' }}>Não controlado</span>
    )},
    { key: 'requiresPrep', header: 'Preparo', render: (p: Product) => (
      <Badge variant={p.requiresPrep ? 'primary' : 'neutral'} size="sm">
        {p.requiresPrep ? 'Sim' : 'Não'}
      </Badge>
    )},
    { key: 'status', header: 'Status', render: (p: Product) => (
      <StatusBadge status={p.active ? 'ativo' : 'inativo'} />
    )},
    { key: 'actions', header: 'Ações', render: (p: Product) => (
      <Dropdown
        trigger={<button className="btn btn-ghost btn-sm" style={{ padding: 'var(--space-1) var(--space-2)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>}
        items={[
          { label: 'Editar', onClick: () => openEditModal(p), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> },
          { label: p.active ? 'Desativar' : 'Ativar', onClick: () => toggleActive(p), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" /><path d="M12 6v6l4 2" /></svg> },
          { label: p.trackStock ? 'Ajustar Estoque' : 'Ver Movimentações', onClick: () => { /* TODO */ }, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg> },
          { label: 'Desativar permanentemente', onClick: () => confirmDelete(p.id), danger: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg> },
        ]}
      />
    )},
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-subtitle">Cadastro, preços, estoque e disponibilidade</p>
        </div>
        <div className="page-actions">
          {hasRole('admin', 'responsavel') && (
            <Button variant="primary" onClick={openCreateModal}>
              Novo Produto
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardBody style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            leftIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            style={{ minWidth: '250px', flex: 1 }}
          />
          <Select
            options={[{ value: 'all', label: 'Todas as categorias' }, ...CATEGORIES]}
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            style={{ minWidth: '200px' }}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {filteredProducts.length} de {products.length} produtos
          </div>
        </CardBody>
      </Card>

      {/* Tabela */}
      <Card>
        <CardBody padding="none">
          {loading ? (
            <div style={{ padding: 'var(--space-8)' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} lines={2} />
              ))}
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={paginatedProducts}
                keyExtractor={p => p.id}
                striped
                hoverable
              />
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalItems={filteredProducts.length}
              />
            </>
          )}
        </CardBody>
      </Card>

      {/* Modal Produto */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={submitting}>
              {submitting ? 'Salvando...' : editingProduct ? 'Atualizar' : 'Criar'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
          <Input
            label="Nome *"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Coco Gelado Grande"
            required
          />
          <Select
            label="Categoria *"
            options={CATEGORIES}
            value={formData.category}
            onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
          />
          <Input
            label="Preço (centavos) *"
            type="number"
            min="0"
            step="1"
            value={formData.priceCents}
            onChange={e => setFormData(prev => ({ ...prev, priceCents: e.target.value }))}
            placeholder="Ex: 800 (R$ 8,00)"
            required
          />
          <Input
            label="Unidade"
            value={formData.unit}
            onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
            placeholder="un, porção, etc."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 'var(--font-medium)' }}>Ativo</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.requiresPrep}
                onChange={e => setFormData(prev => ({ ...prev, requiresPrep: e.target.checked }))}
                style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 'var(--font-medium)' }}>Requer Preparo</span>
            </label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.trackStock}
                onChange={e => setFormData(prev => ({ ...prev, trackStock: e.target.checked }))}
                style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 'var(--font-medium)' }}>Controla Estoque</span>
            </label>
            {formData.trackStock && (
              <Input
                label="Quantidade Inicial"
                type="number"
                min="0"
                step="1"
                value={formData.stockQty}
                onChange={e => setFormData(prev => ({ ...prev, stockQty: e.target.value }))}
                placeholder="0"
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Modal confirmação exclusão */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setProductToDelete(null); }}
        onConfirm={executeDelete}
        title="Desativar produto permanentemente?"
        message="O produto será marcado como inativo e não aparecerá mais nas vendas. Esta ação pode ser revertida editando o produto."
        confirmText="Sim, desativar"
        cancelText="Cancelar"
        variant="danger"
        loading={submitting}
      />
    </div>
  )
}