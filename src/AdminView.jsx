import React, { useState } from 'react'
import { TEMI_DISPONIBILI, DEFAULT_DICHIARAZIONI } from './data.js'

export default function AdminView({ dichiarazioni, setDichiarazioni }) {
  const [nuova, setNuova] = useState({
    firmatario: 'assessore',
    nome: 'Stefano Rosselli, Assessore alla Cultura',
    temi: [],
    testo: '',
  })
  const [success, setSuccess] = useState('')

  const assessoreDich = dichiarazioni.filter(d => d.firmatario === 'assessore')
  const sindacoDich = dichiarazioni.filter(d => d.firmatario === 'sindaco')

  const elimina = (id) => {
    setDichiarazioni(prev => prev.filter(d => d.id !== id))
  }

  const toggleTema = (tema) => {
    setNuova(n => ({
      ...n,
      temi: n.temi.includes(tema) ? n.temi.filter(t => t !== tema) : [...n.temi, tema]
    }))
  }

  const aggiungi = () => {
    if (!nuova.testo.trim()) return
    const newId = Math.max(...dichiarazioni.map(d => d.id), 0) + 1
    setDichiarazioni(prev => [...prev, { ...nuova, id: newId }])
    setNuova({ firmatario: 'assessore', nome: 'Stefano Rosselli, Assessore alla Cultura', temi: [], testo: '' })
    setSuccess('Dichiarazione aggiunta.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const ripristina = () => {
    if (confirm('Ripristinare tutte le dichiarazioni predefinite? Quelle aggiunte verranno perse.')) {
      setDichiarazioni(DEFAULT_DICHIARAZIONI)
      setSuccess('Dichiarazioni ripristinate.')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const nomeAuto = (firmatario) =>
    firmatario === 'assessore'
      ? 'Stefano Rosselli, Assessore alla Cultura'
      : 'Alessandro Guastalli, Sindaco di Suzzara'

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, marginBottom: 4 }}>
            Gestione dichiarazioni
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-light)' }}>
            L'app seleziona automaticamente la dichiarazione più pertinente al tema del comunicato.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={ripristina}>Ripristina predefinite</button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* Assessore */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2>Dichiarazioni Assessore Rosselli</h2>
              <span className="step-label">{assessoreDich.length}</span>
            </div>
            <div className="card-body">
              {assessoreDich.length === 0 && (
                <p className="admin-note">Nessuna dichiarazione. Aggiungine una sotto.</p>
              )}
              {assessoreDich.map(d => (
                <DichiarazioneCard key={d.id} d={d} onElimina={elimina} />
              ))}
            </div>
          </div>
        </div>

        {/* Sindaco */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2>Dichiarazioni Sindaco Guastalli</h2>
              <span className="step-label">{sindacoDich.length}</span>
            </div>
            <div className="card-body">
              {sindacoDich.length === 0 && (
                <p className="admin-note">Nessuna dichiarazione. Aggiungine una sotto.</p>
              )}
              {sindacoDich.map(d => (
                <DichiarazioneCard key={d.id} d={d} onElimina={elimina} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form nuova dichiarazione */}
      <div className="card" style={{ marginTop: 32 }}>
        <div className="card-header">
          <span className="step-label">Nuova</span>
          <h2>Aggiungi dichiarazione</h2>
        </div>
        <div className="card-body">
          <div className="field-row">
            <div className="field">
              <label>Firmatario</label>
              <select
                value={nuova.firmatario}
                onChange={e => setNuova(n => ({
                  ...n,
                  firmatario: e.target.value,
                  nome: nomeAuto(e.target.value)
                }))}
              >
                <option value="assessore">Assessore Rosselli</option>
                <option value="sindaco">Sindaco Guastalli</option>
              </select>
            </div>
            <div className="field">
              <label>Nome completo e ruolo</label>
              <input
                type="text"
                value={nuova.nome}
                onChange={e => setNuova(n => ({ ...n, nome: e.target.value }))}
              />
            </div>
          </div>

          <div className="field">
            <label>Temi pertinenti <span className="hint">— usati per selezionare automaticamente la dichiarazione</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {TEMI_DISPONIBILI.map(t => (
                <button
                  key={t}
                  className="btn btn-sm"
                  style={{
                    background: nuova.temi.includes(t) ? 'var(--accent)' : 'var(--paper-warm)',
                    color: nuova.temi.includes(t) ? 'white' : 'var(--ink-mid)',
                    border: `1px solid ${nuova.temi.includes(t) ? 'var(--accent)' : 'var(--border)'}`,
                    padding: '5px 12px',
                  }}
                  onClick={() => toggleTema(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Testo della dichiarazione <span className="hint">— senza virgolette, le aggiungerà l'app</span></label>
            <textarea
              rows={4}
              placeholder="Inserisci il testo della dichiarazione così come deve apparire nel comunicato..."
              value={nuova.testo}
              onChange={e => setNuova(n => ({ ...n, testo: e.target.value }))}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={aggiungi}
            disabled={!nuova.testo.trim()}
          >
            + Aggiungi dichiarazione
          </button>
        </div>
      </div>
    </div>
  )
}

function DichiarazioneCard({ d, onElimina }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="dichiarazione-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <blockquote style={{ fontSize: 14, lineHeight: 1.5, borderLeft: '2px solid var(--accent)', paddingLeft: 10, fontFamily: 'var(--font-serif)', flex: 1 }}>
          «{expanded ? d.testo : d.testo.slice(0, 100) + (d.testo.length > 100 ? '…' : '')}»
        </blockquote>
        <button
          className="btn btn-sm btn-outline"
          style={{ marginLeft: 12, flexShrink: 0, color: 'var(--accent)', borderColor: 'var(--accent)' }}
          onClick={() => onElimina(d.id)}
        >
          ×
        </button>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {d.temi.map(t => <span key={t} className="tag">{t}</span>)}
        {d.testo.length > 100 && (
          <button
            style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--ink-light)', cursor: 'pointer', padding: 0 }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Mostra meno' : 'Leggi tutto'}
          </button>
        )}
      </div>
    </div>
  )
}
