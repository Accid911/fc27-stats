'use client';

import { useRef, useState } from 'react';

/**
 * Generic add/edit/delete panel.
 * fields: [{ key, label, type: 'text'|'number'|'date'|'select'|'checkbox'|'textarea'|'url', options?: [{value,label}], required?, wide? }]
 * columns: [{ key, label, render?(row) }] for the list below the form
 */
export default function CrudSection({ title, table, fields, columns, rows, api, onChanged, defaults = {}, itemName = 'item', deleteWarning = '' }) {
  const formRef = useRef(null);
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, defaults[f.key] ?? (f.type === 'checkbox' ? true : '')]));
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key] ?? (f.type === 'checkbox' ? false : '')])));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setForm(blank());
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const row = {};
      for (const f of fields) {
        let v = form[f.key];
        if (f.type === 'number') v = v === '' || v == null ? null : Number(v);
        else if (f.type === 'checkbox') v = Boolean(v);
        else v = v === '' ? null : v;
        row[f.key] = v;
      }
      if (editingId) row.id = editingId;
      await api.save(table, row);
      reset();
      await onChanged();
      formRef.current?.querySelector('input, select')?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(row) {
    if (!window.confirm(`Delete this ${itemName}? ${deleteWarning}This can't be undone.`)) return;
    setError('');
    try {
      await api.remove(table, row.id);
      if (editingId === row.id) reset();
      await onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <form className="card" onSubmit={submit} ref={formRef}>
        <div className="row" style={{ marginBottom: 14 }}>
          <h3>{editingId ? `Edit ${itemName}` : `Add ${itemName}`}</h3>
          <span className="spacer" />
          {editingId && <button type="button" className="btn secondary small" onClick={reset}>Cancel edit</button>}
        </div>
        <div className="form-grid">
          {fields.map((f) => (
            <Field key={f.key} field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
        <div style={{ marginTop: 14 }}>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : `Add ${itemName}`}</button>
        </div>
      </form>

      <div className="card pad-0" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="muted">No {title.toLowerCase()} yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} style={editingId === r.id ? { background: 'var(--surface-2)' } : undefined}>
                  {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
                  <td className="num">
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <button className="btn secondary small" onClick={() => startEdit(r)}>Edit</button>
                      <button className="btn danger small" onClick={() => remove(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function Field({ field: f, value, onChange }) {
  const common = { value: value ?? '', onChange: (e) => onChange(e.target.value), required: f.required };
  let input;
  if (f.type === 'select') {
    input = (
      <select {...common}>
        {!f.required && <option value="">—</option>}
        {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else if (f.type === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'end', paddingBottom: 8 }}>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {f.label}
      </label>
    );
  } else if (f.type === 'textarea') {
    input = <textarea rows={3} {...common} />;
  } else {
    const listId = f.suggestions ? `dl-${f.key}` : undefined;
    input = (
      <>
        <input type={f.type || 'text'} step={f.step} min={f.min} max={f.max} list={listId} autoComplete="off" {...common} />
        {listId && (
          <datalist id={listId}>
            {f.suggestions.map((o) => <option key={o} value={o} />)}
          </datalist>
        )}
      </>
    );
  }
  return (
    <label className={f.wide ? 'wide' : ''}>
      {f.label}{f.required ? ' *' : ''}
      {input}
    </label>
  );
}
