import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatCurrency, formatDateTime, getStatusLabel } from '../lib/api'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card, CardHeader, CardBody, CardFooter } from '../components/Card'
import { Badge, StatusBadge } from '../components/Badge'
import { Modal, ConfirmModal } from '../components/Modal'
import { Table, Pagination } from '../components/Table'
import { Avatar } from '../components/Avatar'
import { Dropdown } from '../components/Dropdown'

interface Shift {
  id: string
  number: number
  status: string
  openedBy: { id: string; name: string; username: string }
  openedAt: string
  initialCashCents: number
  closedBy?: { id: string; name: string }
  closedAt?: string
  countedCashCents?: number
  expectedCashCents?: number
  differenceCents?: number
  closingNotes?: string
  availability: { product: { id: string; name: string }; available: boolean }[]
}

interface CashMovement {
  id: string
  type: string
  amountCents: number
  reason: string
  user: { name: string }
  createdAt: string
}

export const Shifts = () => {
  const { hasRole } = useAuth()
  const { success, error: showError } = useToast()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'open' | 'close'>('open')
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([])
  const [formData, setFormData] = useState({
    initialCashCents: '',
    countedCashCents: '',
    closingNotes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const loadShifts = useCallback(async () => {
    try {
      const data = await api.get<Shift[]>(`/shifts?page=${page}&limit=${pageSize}`)
      // A API retorna array direto, vamos simular paginação
      setShifts(data)
      setTotalPages(Math.ceil(data.length / pageSize) || 1)
    } catch (err: any) {
      showError('Erro ao carregar turnos', err.message)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, showError])

  const loadCurrentShift = useCallback(async () => {
    try {
      const shift = await api.get<Shift>('/shifts/current')
      setCurrentShift(shift)
    } catch {
      // Sem turno aberto
      setCurrentShift(null)
    }
  }, [])

  useEffect(() => {
    loadShifts()
    loadCurrentShift()
  }, [loadShifts, loadCurrentShift])

  const loadCashMovements = useCallback(async (shiftId: string) => {
    try {
      const data = await api.get<CashMovement[]>(`/cash/shift/${shiftId}`)
      setCashMovements(data)
    } catch (err: any) {
      showError('Erro ao carregar movimentações', err.message)
    }
  }, [showError])

  const handleOpenShift = async () => {
    if (!formData.initialCashCents) {
      showError('Valor inválido', 'Informe o fundo inicial')
      return
    }
    setSubmitting(true)
    try {
      const productIds = (await api.get<any[]>('/products?includeInactive=false')).map(p => p.id)
      await api.post('/shifts/open', {
        initialCashCents: parseInt(formData.initialCashCents),
        productIds,
      })
      success('Turno aberto', `Fundo inicial: ${formatCurrency(parseInt(formData.initialCashCents))}`)
      setFormData({ initialCashCents: '', countedCashCents: '', closingNotes: '' })
      setModalOpen(false)
      loadShifts()
      loadCurrentShift()
    } catch (err: any) {
      showError('Erro ao abrir turno', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseShift = async () => {
    if (!formData.countedCashCents) {
      showError('Valor inválido', 'Informe o valor contado')
      return
    }
    if (!selectedShift) return
    setConfirmCloseOpen(true)
  }

  const confirmCloseShift = async () => {
    if (!selectedShift) return
    setSubmitting(true)
    try {
      await api.post(`/shifts/${selectedShift.id}/close`, {
        countedCashCents: parseInt(formData.countedCashCents),
        closingNotes: formData.closingNotes || undefined,
      })
      success('Turno fechado', 'Fechamento realizado com sucesso')
      setFormData({ initialCashCents: '', countedCashCents: '', closingNotes: '' })
      setModalOpen(false)
      setConfirmCloseOpen(false)
      loadShifts()
      loadCurrentShift()
    } catch (err: any) {
      showError('Erro ao fechar turno', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openShiftDetail = (shift: Shift) => {
    setSelectedShift(shift)
    setModalMode('close')
    setFormData({ initialCashCents: '', countedCashCents: String(shift.expectedCashCents || 0), closingNotes: '' })
    loadCashMovements(shift.id)
    setModalOpen(true)
  }

  const columns = [
    { key: 'number', header: 'Nº', render: (s: Shift) => <strong>#{s.number}</strong> },
    { key: 'status', header: 'Status', render: (s: Shift) => <StatusBadge status={s.status} /> },
    { key: 'openedBy', header: 'Aberto por', render: (s: Shift) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Avatar name={s.openedBy.name} size="sm" />
        <div>
          <div style={{ fontWeight: 'var(--font-medium)' }}>{s.openedBy.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{s.openedBy.username}</div>
        </div>
      </div>
    )},
    { key: 'openedAt', header: 'Abertura', render: (s: Shift) => formatDateTime(s.openedAt) },
    { key: 'closedAt', header: 'Fechamento', render: (s: Shift) => s.closedAt ? formatDateTime(s.closedAt) : <span style={{ color: 'var(--color-text-muted)' }}>—</span> },
    { key: 'initialCashCents', header: 'Fundo Inicial', render: (s: Shift) => formatCurrency(s.initialCashCents) },
    { key: 'differenceCents', header: 'Diferença', render: (s: Shift) => 
      s.differenceCents !== undefined ? (
        <span style={{ color: s.differenceCents >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'var(--font-semibold)' }}>
          {s.differenceCents >= 0 ? '+' : ''}{formatCurrency(s.differenceCents)}
        </span>
      ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
    },
    { key: 'actions', header: 'Ações', render: (s: Shift) => (
      <Dropdown
        trigger={<button className="btn btn-ghost btn-sm" style={{ padding: 'var(--space-1) var(--space-2)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>}
        items={[
          { label: 'Ver detalhes', onClick: () => openShiftDetail(s), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> },
          { label: 'Movimentações de caixa', onClick: () => { setSelectedShift(s); loadCashMovements(s.id); setModalMode('close'); setFormData({ initialCashCents: '', countedCashCents: String(s.expectedCashCents || 0), closingNotes: '' }); setModalOpen(true); }, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
        ]}
      />
    )},
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestão de Turnos</h1>
          <p className="page-subtitle">Abertura, fechamento e conferência de caixa</p>
        </div>
        <div className="page-actions">
          {!currentShift && hasRole('admin', 'responsavel', 'atendente') && (
            <Button variant="primary" onClick={() => { setModalMode('open'); setFormData({ initialCashCents: '', countedCashCents: '', closingNotes: '' }); setModalOpen(true); }}>
              Abrir Turno
            </Button>
          )}
          {currentShift && hasRole('admin', 'responsavel') && (
            <Button variant="secondary" onClick={() => openShiftDetail(currentShift)}>
              Fechar Turno Atual
            </Button>
          )}
        </div>
      </div>

      {/* Turno Atual */}
      {currentShift && (
        <Card className="mb-6" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)' }}>Turno Atual #{currentShift.number}</h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Aberto por {currentShift.openedBy.name} às {new Date(currentShift.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Fundo Inicial</div>
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-lg)' }}>{formatCurrency(currentShift.initialCashCents)}</div>
                </div>
                <StatusBadge status={currentShift.status} />
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Produtos Disponíveis</div>
                <div style={{ fontWeight: 'var(--font-semibold)' }}>{currentShift.availability.filter(a => a.available).length} / {currentShift.availability.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Pedidos em Andamento</div>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>—</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Histórico de Turnos */}
      <Card>
        <CardHeader>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Histórico de Turnos</h3>
        </CardHeader>
        <CardBody padding="none">
          {loading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={shifts}
                keyExtractor={s => s.id}
                striped
                hoverable
              />
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalItems={shifts.length}
              />
            </>
          )}
        </CardBody>
      </Card>

      {/* Modal Abrir/Fechrar Turno */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedShift(null); }}
        title={modalMode === 'open' ? 'Abrir Novo Turno' : `Fechar Turno #${selectedShift?.number}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setSelectedShift(null); }} disabled={submitting}>
              Cancelar
            </Button>
            {modalMode === 'open' ? (
              <Button variant="primary" onClick={handleOpenShift} loading={submitting} disabled={submitting}>
                {submitting ? 'Abrindo...' : 'Abrir Turno'}
              </Button>
            ) : (
              <Button variant="success" onClick={handleCloseShift} loading={submitting} disabled={submitting}>
                {submitting ? 'Fechando...' : 'Fechar Turno'}
              </Button>
            )}
          </>
        }
      >
        {modalMode === 'open' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Fundo Inicial (centavos)"
              type="number"
              min="0"
              step="1"
              value={formData.initialCashCents}
              onChange={e => setFormData(prev => ({ ...prev, initialCashCents: e.target.value }))}
              placeholder="Ex: 10000 (R$ 100,00)"
              required
              hint="Valor em centavos que estará no caixa no início do turno"
            />
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
              <strong>Produtos que serão ativados:</strong> Todos os produtos ativos serão disponibilizados automaticamente.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Fundo Inicial</span><br/><strong>{formatCurrency(selectedShift?.initialCashCents || 0)}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Esperado em Dinheiro</span><br/><strong>{formatCurrency(selectedShift?.expectedCashCents || 0)}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Recebimentos Pix</span><br/><strong>{formatCurrency(0)}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Recebimentos Cartão</span><br/><strong>{formatCurrency(0)}</strong></div>
              </div>
            </div>
            <Input
              label="Dinheiro Contado (centavos)"
              type="number"
              min="0"
              step="1"
              value={formData.countedCashCents}
              onChange={e => setFormData(prev => ({ ...prev, countedCashCents: e.target.value }))}
              placeholder="Ex: 15000 (R$ 150,00)"
              required
              hint="Conte o dinheiro físico no caixa e informe o total em centavos"
            />
            <Input
              label="Observações (opcional)"
              type="text"
              value={formData.closingNotes}
              onChange={e => setFormData(prev => ({ ...prev, closingNotes: e.target.value }))}
              placeholder="Diferenças, problemas, etc."
            />
            {selectedShift && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
                <strong>Diferença projetada:</strong>{' '}
                <span style={{ color: ((parseInt(formData.countedCashCents || '0') - (selectedShift?.expectedCashCents || 0)) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'), fontWeight: 'var(--font-bold)' }}>
                  {formatCurrency(parseInt(formData.countedCashCents || '0') - (selectedShift?.expectedCashCents || 0))}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal confirmação fechar turno */}
      <ConfirmModal
        isOpen={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={confirmCloseShift}
        title="Confirmar fechamento do turno?"
        message={`O turno #${selectedShift?.number} será fechado definitivamente. Esta ação não pode ser desfeita.`}
        confirmText="Sim, fechar turno"
        cancelText="Cancelar"
        variant="success"
        loading={submitting}
      />
    </div>
  )
}