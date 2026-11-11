import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, formatCurrency, formatReais, formatDateTime, getStatusLabel } from '../lib/api'
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

interface CashSummary {
  shift: { number: number; status: string }
  initialCashCents: number
  cashReceivedCents: number
  cashRefundedCents: number
  reforcosCents: number
  retiradasCents: number
  pixCents: number
  cardCents: number
  cardDebitCents: number
  cardCreditCents: number
  totalSalesCents: number
  expectedCashCents: number
  countedCashCents: number
  differenceCents: number
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
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null)
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

  // Busca o resumo real do caixa (dinheiro, Pix, cartão, esperado e diferença).
  const loadCashSummary = useCallback(async (shiftId: string) => {
    try {
      const summary = await api.get<CashSummary>(`/reports/cash/${shiftId}`)
      setCashSummary(summary)
      setFormData(prev => prev.countedCashCents
        ? prev
        : { ...prev, countedCashCents: String(summary.expectedCashCents) })
    } catch (err: any) {
      showError('Erro ao carregar resumo do caixa', err.message)
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
        initialCash: parseFloat(formData.initialCashCents), // agora envia Reais
        productIds,
      })
      success('Turno aberto', `Fundo inicial: ${formatReais(parseFloat(formData.initialCashCents))}`)
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
        countedCash: parseFloat(formData.countedCashCents), // agora envia Reais
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
    setCashSummary(null)
    setFormData({
      initialCashCents: '',
      countedCashCents: shift.countedCashCents !== undefined ? String(shift.countedCashCents) : '',
      closingNotes: shift.closingNotes || '',
    })
    loadCashMovements(shift.id)
    loadCashSummary(shift.id)
    setModalOpen(true)
  }

  // Valores usados no fechamento: o resumo da API é a fonte da verdade; se
  // ainda não carregou, cai no valor persistido no turno.
  const expectedCash = cashSummary?.expectedCashCents ?? selectedShift?.expectedCashCents ?? 0
  const countedCash = parseFloat(formData.countedCashCents || '0')
  const projectedDifference = countedCash - expectedCash

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
    { key: 'initialCashCents', header: 'Fundo Inicial', render: (s: Shift) => formatReais(s.initialCashCents) },
    { key: 'differenceCents', header: 'Diferença', render: (s: Shift) => 
      s.differenceCents !== undefined ? (
        <span style={{ color: s.differenceCents >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'var(--font-semibold)' }}>
          {s.differenceCents >= 0 ? '+' : ''}{formatReais(s.differenceCents)}
        </span>
      ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
    },
    { key: 'actions', header: 'Ações', render: (s: Shift) => (
      <Dropdown
        trigger={<button className="btn btn-ghost btn-sm" style={{ padding: 'var(--space-1) var(--space-2)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>}
        items={[
          { label: 'Ver detalhes', onClick: () => openShiftDetail(s), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> },
          { label: 'Movimentações de caixa', onClick: () => openShiftDetail(s), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
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
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-lg)' }}>{formatReais(currentShift.initialCashCents)}</div>
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
        title={
          modalMode === 'open'
            ? 'Abrir Novo Turno'
            : selectedShift?.status === 'aberto'
              ? `Fechar Turno #${selectedShift?.number}`
              : `Turno #${selectedShift?.number}`
        }
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setSelectedShift(null); }} disabled={submitting}>
              {modalMode === 'open' || selectedShift?.status === 'aberto' ? 'Cancelar' : 'Fechar'}
            </Button>
            {modalMode === 'open' && (
              <Button variant="primary" onClick={handleOpenShift} loading={submitting} disabled={submitting}>
                {submitting ? 'Abrindo...' : 'Abrir Turno'}
              </Button>
            )}
            {modalMode === 'close' && selectedShift?.status === 'aberto' && (
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
              label="Fundo Inicial (R$)"
              type="number"
              min="0"
              step="0.01"
              value={formData.initialCashCents}
              onChange={e => setFormData(prev => ({ ...prev, initialCashCents: e.target.value }))}
              placeholder="Ex: 100.00"
              required
              hint="Valor em Reais que estará no caixa no início do turno"
            />
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
              <strong>Produtos que serão ativados:</strong> Todos os produtos ativos serão disponibilizados automaticamente.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Fundo Inicial</span><br/><strong>{formatReais(selectedShift?.initialCashCents || 0)}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Esperado em Dinheiro</span><br/><strong>{formatReais(expectedCash)}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Recebimentos Pix</span><br/><strong>{formatReais(cashSummary?.pixCents ?? 0)}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Recebimentos Cartão</span><br/><strong>{formatReais(cashSummary?.cardCents ?? 0)}</strong></div>
              </div>
              {cashSummary && (
                <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Cartão: débito {formatReais(cashSummary.cardDebitCents)} · crédito {formatReais(cashSummary.cardCreditCents)}
                </div>
              )}
            </div>
            {selectedShift?.status === 'aberto' ? (
              <>
                <Input
                  label="Dinheiro Contado (R$)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.countedCashCents}
                  onChange={e => setFormData(prev => ({ ...prev, countedCashCents: e.target.value }))}
                  placeholder="Ex: 150.00"
                  required
                  hint="Conte o dinheiro físico no caixa e informe o total em Reais"
                />
                <Input
                  label="Observações (opcional)"
                  type="text"
                  value={formData.closingNotes}
                  onChange={e => setFormData(prev => ({ ...prev, closingNotes: e.target.value }))}
                  placeholder="Diferenças, problemas, etc."
                />
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
                  <strong>Diferença projetada:</strong>{' '}
                  <span style={{ color: projectedDifference >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'var(--font-bold)' }}>
                    {projectedDifference >= 0 ? '+' : ''}{formatReais(projectedDifference)}
                  </span>
                </div>
              </>
            ) : (
              selectedShift && (
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', display: 'grid', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Dinheiro contado</span>
                    <strong>{formatReais(selectedShift.countedCashCents ?? 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Diferença</span>
                    <strong style={{ color: (selectedShift.differenceCents ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {(selectedShift.differenceCents ?? 0) >= 0 ? '+' : ''}{formatReais(selectedShift.differenceCents ?? 0)}
                    </strong>
                  </div>
                  {selectedShift.closingNotes && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Observações: </span>
                      {selectedShift.closingNotes}
                    </div>
                  )}
                </div>
              )
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