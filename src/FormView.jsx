import React, { useState, useRef } from 'react'
import { SYSTEM_PROMPT } from './data.js'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'

const TIPI_EVENTO = [
  { value: 'inaugurazione_mostra', label: 'Inaugurazione mostra' },
  { value: 'chiusura_mostra', label: 'Chiusura / finissage mostra' },
  { value: 'rassegna_incontri', label: 'Rassegna / ciclo di incontri' },
  { value: 'conferenza_stampa', label: 'Conferenza stampa' },
  { value: 'premio_candidature', label: 'Premio — lancio o risultati candidature' },
  { value: 'collezione_permanente', label: 'Collezione permanente' },
  { value: 'evento_speciale', label: 'Evento speciale' },
]

function testoInParagrafi(testo) {
  return testo.split('\n').map(r => r.trim()).filter(r => r.length > 0)
}

async function generaDocx(testo, nomefile) {
  const righe = testoInParagrafi(testo)
  const paragrafi = righe.map((riga, i) => {
    const isTitolo = i === 0 && riga.toUpperCase() === riga
    const isScheda = riga.startsWith('Sede:') || riga.startsWith('Dove:') ||
      riga.startsWith('Quando:') || riga.startsWith('Orari:') ||
      riga.startsWith('Periodo') || riga.startsWith('Info') ||
      riga.startsWith('Web:') || riga.startsWith('Social') ||
      riga.match(/^Via /) || riga.match(/galleriapremio@/) ||
      riga.match(/premiosuzzara\.it/) || riga.startsWith('*')

    if (isTitolo) {
      return new Paragraph({
        spacing: { before: 0, after: 280 },
        children: [new TextRun({ text: riga, bold: true, size: 24, font: 'Arial' })]
      })
    }
    if (isScheda) {
      return new Paragraph({
        spacing: { before: 0, after: 100 },
        children: [new TextRun({ text: riga.replace(/^\*+|\*+$/g, '').trim(), italics: true, size: 22, font: 'Arial', color: '444444' })]
      })
    }
    return new Paragraph({
      spacing: { before: 0, after: 200 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: riga, size: 24, font: 'Arial' })]
    })
  })

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: paragrafi
    }]
  })

  const buffer = await Packer.toBlob(doc)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(buffer)
  a.download = `${nomefile}.docx`
  a.click()
}

export default function FormView() {
  const [form, setForm] = useState({
    tipo: 'inaugurazione_mostra',
    titolo: '',
    artista: '',
    data_evento: '',
    ora: '',
    periodo: '',
    luogo: 'Museo Galleria del Premio Suzzara, via Don Bosco 2/A, Suzzara (MN)',
    dettagli: '',
    tono: 'formale',
    dichAssessore: false,
    dichSindaco: false,
  })
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [edited, setEdited] = useState(false)
  const outputRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const buildPromptUtente = () => {
    const tipo = TIPI_EVENTO.find(t => t.value === form.tipo)?.label || form.tipo
    let prompt = `Scrivi un comunicato stampa per la Galleria del Premio Suzzara.\n\n`
    prompt += `TIPO DI EVENTO: ${tipo}\n`
    prompt += `TITOLO / NOME: ${form.titolo}\n`
    if (form.artista) prompt += `ARTISTA / OSPITE: ${form.artista}\n`
    if (form.data_evento) prompt += `DATA EVENTO / INAUGURAZIONE: ${form.data_evento}${form.ora ? ` alle ore ${form.ora}` : ''}\n`
    if (form.periodo) prompt += `PERIODO APERTURA: ${form.periodo}\n`
    if (form.luogo) prompt += `LUOGO: ${form.luogo}\n`
    prompt += `DETTAGLI E INFORMAZIONI CHIAVE:\n${form.dettagli}\n\n`
    prompt += `TONO: ${form.tono === 'formale' ? 'istituzionale e formale' : 'caldo e narrativo'}\n\n`

    if (form.dichAssessore || form.dichSindaco) {
      prompt += `DICHIARAZIONI DA GENERARE (crea dichiarazioni originali, specifiche per questo evento):\n`
      if (form.dichAssessore) prompt += `- Dichiarazione di Stefano Rosselli, Assessore alla Cultura\n`
      if (form.dichSindaco) prompt += `- Dichiarazione di Alessandro Guastalli, Sindaco di Suzzara\n`
      prompt += `Inseriscile dopo lo sviluppo del testo, nell'ordine indicato.\n`
    } else {
      prompt += `Non includere dichiarazioni di assessori o sindaci.\n`
    }

    return prompt
  }

  const genera = async () => {
    if (!form.titolo.trim() || !form.dettagli.trim()) {
      setError("Compila almeno il titolo e i dettagli dell'evento.")
      return
    }
    setError('')
    setLoading(true)
    setOutput('')
    setEdited(false)

    try {
      const res = await fetch('/api/genera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildPromptUtente() }]
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Errore del server: ${res.status}`)
      }

      const data = await res.json()
      const testo = data.content?.find(b => b.type === 'text')?.text || ''
      setOutput(testo)
    } catch (e) {
      setError(`Errore durante la generazione: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copiaTesto = () => {
    const testo = outputRef.current?.innerText || output
    navigator.clipboard.writeText(testo).catch(() => {})
  }

  const nomefile = `comunicato_${form.titolo.replace(/\s+/g, '_').toLowerCase() || 'suzzara'}`

  const scaricaDocx = () => {
    const testo = outputRef.current?.innerText || output
    generaDocx(testo, nomefile)
  }

  return (
    <div className="app-main">
      {/* COLONNA SINISTRA: FORM */}
      <div>
        <div className="card">
          <div className="card-header">
            <span className="step-label">Passo 1</span>
            <h2>Informazioni sull'evento</h2>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="field">
              <label>Tipo di comunicato</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPI_EVENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Titolo / nome dell'evento <span className="hint">— come appare nel programma</span></label>
              <input
                type="text"
                placeholder='es. "Piccolo mondo antico. Favole visive da due collezioni"'
                value={form.titolo}
                onChange={e => set('titolo', e.target.value)}
              />
            </div>

            <div className="field">
              <label>Artista o ospite principale <span className="hint">— lascia vuoto se non applicabile</span></label>
              <input
                type="text"
                placeholder="es. Alberto Ravaioli"
                value={form.artista}
                onChange={e => set('artista', e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Data inaugurazione / evento</label>
                <input type="date" value={form.data_evento} onChange={e => set('data_evento', e.target.value)} />
              </div>
              <div className="field">
                <label>Orario</label>
                <input type="text" placeholder="es. 16.30" value={form.ora} onChange={e => set('ora', e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Periodo apertura <span className="hint">— se è una mostra</span></label>
              <input
                type="text"
                placeholder="es. 21 marzo – 18 aprile 2026"
                value={form.periodo}
                onChange={e => set('periodo', e.target.value)}
              />
            </div>

            <div className="field">
              <label>Luogo</label>
              <select value={form.luogo} onChange={e => set('luogo', e.target.value)}>
                <option value="Museo Galleria del Premio Suzzara, via Don Bosco 2/A, Suzzara (MN)">Museo Galleria del Premio Suzzara</option>
                <option value="Piazzalunga Cultura, viale S. Zonta 6/a, Suzzara (MN)">Piazzalunga Cultura</option>
                <option value='Scuola di Arti e Mestieri "F. Bertazzoni", via Bertazzoni 1, Suzzara (MN)'>Scuola di Arti e Mestieri "F. Bertazzoni"</option>
              </select>
            </div>

            <div className="field">
              <label>
                Dettagli principali
                <span className="hint"> — scrivi quello che sai, anche in modo disordinato</span>
              </label>
              <textarea
                rows={5}
                placeholder="Descrivi l'evento: cosa si vede, chi partecipa, perché è importante, eventuali dati di rilievo, curiosità storiche, collaborazioni..."
                value={form.dettagli}
                onChange={e => set('dettagli', e.target.value)}
              />
              <div className="chars-count">{form.dettagli.length} caratteri</div>
            </div>

            <hr />

            <div className="field">
              <label>Tono del comunicato</label>
              <select value={form.tono} onChange={e => set('tono', e.target.value)}>
                <option value="formale">Istituzionale / formale</option>
                <option value="narrativo">Caldo / narrativo</option>
              </select>
            </div>

            <div className="field">
              <label>Dichiarazioni da includere</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0, fontSize: 14, fontWeight: 400, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.dichAssessore}
                    onChange={e => set('dichAssessore', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  Aggiungi dichiarazione dell'Assessore alla Cultura
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0, fontSize: 14, fontWeight: 400, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.dichSindaco}
                    onChange={e => set('dichSindaco', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  Aggiungi dichiarazione del Sindaco
                </label>
              </div>
            </div>

            <hr />

            <button
              className="btn btn-primary btn-full"
              onClick={genera}
              disabled={loading}
            >
              {loading ? '⏳ Generazione in corso...' : '✦ Genera comunicato'}
            </button>
          </div>
        </div>
      </div>

      {/* COLONNA DESTRA: OUTPUT */}
      <div>
        <div className="card" style={{ position: 'sticky', top: 24 }}>
          <div className="output-header" style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2>Comunicato generato</h2>
            {output && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={copiaTesto}>Copia</button>
                <button className="btn btn-success btn-sm" onClick={scaricaDocx}>↓ Scarica .docx</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="spinner-wrap">
              <div className="spinner" />
              <div className="spinner-text">Redazione in corso…</div>
            </div>
          ) : output ? (
            <>
              <div
                ref={outputRef}
                className="output-area"
                contentEditable
                suppressContentEditableWarning
                onInput={() => setEdited(true)}
                style={{ margin: 0, borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border)' }}
              >
                {output}
              </div>
              <div className="footer-actions">
                {edited && <span style={{ fontSize: 12, color: 'var(--ink-light)', alignSelf: 'center' }}>✎ Modificato manualmente</span>}
                <button className="btn btn-outline btn-sm" onClick={copiaTesto} style={{ marginLeft: 'auto' }}>Copia testo</button>
                <button className="btn btn-success btn-sm" onClick={scaricaDocx}>↓ Scarica .docx</button>
              </div>
            </>
          ) : (
            <div className="output-area" style={{ border: 'none' }}>
              <span className="output-placeholder">
                Il comunicato apparirà qui dopo la generazione.{'\n\n'}
                Compila il modulo a sinistra e premi «Genera comunicato».
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
