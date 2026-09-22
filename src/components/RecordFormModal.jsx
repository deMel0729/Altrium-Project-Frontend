import { useState } from 'react'
import { Button, Field, Modal } from './ui'
import { fromDateInput, toDateInput } from '../utils/format'

// Schema-driven create/edit dialog. One field descriptor looks like:
//   { name, label, type, options?, required?, hint?, min?, max?, placeholder?, span? }
// `type` is one of: text | email | url | tel | password | number | money |
//                   date | select | textarea | checkbox
//
// `options` is either an array, or a function of the current form values for a
// select whose choices depend on another field - the contact list narrowing to
// the company that was picked, for example.

const optionValue = (option) => (typeof option === 'string' ? option : option.value)
const optionLabel = (option) => (typeof option === 'string' ? option : option.label)

function resolveOptions(field, values) {
  if (typeof field.options === 'function') return field.options(values) ?? []
  return field.options ?? []
}

function initialValue(field, record) {
  const fallback = typeof field.defaultValue === 'function' ? field.defaultValue(record) : field.defaultValue
  const existing = record ? record[field.name] : undefined
  if (field.type === 'checkbox') return existing ?? fallback ?? false
  if (field.type === 'date') return toDateInput(existing) || (fallback ?? '')
  if (existing === null || existing === undefined) return fallback ?? ''
  return String(existing)
}

function buildInitialState(fields, record) {
  return Object.fromEntries(fields.map((field) => [field.name, initialValue(field, record)]))
}

function validateField(field, value, values) {
  const isBlank = value === '' || value === null || value === undefined
  if (field.required && (isBlank || (field.type === 'select' && value === ''))) {
    return `${field.label} is required.`
  }
  if (isBlank) return null
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address.'
  }
  if (field.type === 'number' || field.type === 'money') {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return `${field.label} must be a number.`
    if (field.min !== undefined && numeric < field.min) return `${field.label} cannot be below ${field.min}.`
    if (field.max !== undefined && numeric > field.max) return `${field.label} cannot exceed ${field.max}.`
  }
  return field.validate ? field.validate(value, values) : null
}

// Turns form strings back into the shapes the C# models expect.
function serialize(fields, values) {
  const payload = {}
  for (const field of fields) {
    // `transient` fields steer the form only - a Lead/Deal chooser, say - and are
    // never part of the request body.
    if (field.transient) continue
    const value = values[field.name]
    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(value)
    } else if (field.type === 'number' || field.type === 'money') {
      payload[field.name] = value === '' ? null : Number(value)
    } else if (field.type === 'date') {
      payload[field.name] = fromDateInput(value)
    } else if (field.type === 'select' && field.valueType === 'number') {
      payload[field.name] = value === '' ? null : Number(value)
    } else {
      payload[field.name] = value === '' && field.nullable ? null : value
    }
    if (field.omitWhenEmpty && (value === '' || value === null)) delete payload[field.name]
  }
  return payload
}

export function RecordFormModal({ title, subtitle, fields, record, onSubmit, onClose, submitLabel }) {
  const [values, setValues] = useState(() => buildInitialState(fields, record))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const setValue = (name, value) => {
    setValues((current) => {
      const next = { ...current, [name]: value }

      // A dependent select can be left holding a value its options no longer
      // offer - pick a contact at company A, then switch to company B. Clearing
      // it here stops a mismatched id being submitted while the form still
      // displays the old selection.
      for (const field of fields) {
        if (field.name === name || typeof field.options !== 'function') continue
        const chosen = next[field.name]
        if (chosen === '' || chosen === null || chosen === undefined) continue
        const allowed = resolveOptions(field, next).map(optionValue)
        if (!allowed.some((candidate) => String(candidate) === String(chosen))) {
          next[field.name] = ''
        }
      }

      return next
    })
    setErrors((current) => (current[name] ? { ...current, [name]: null } : current))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    for (const field of fields) {
      const message = validateField(field, values[field.name], values)
      if (message) nextErrors[field.name] = message
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    setFormError(null)
    try {
      await onSubmit(serialize(fields, values))
    } catch (error) {
      setFormError(error.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      wide={fields.length > 5}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : submitLabel ?? (record ? 'Save changes' : 'Create')}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        {formError && <p className="form-error">{formError}</p>}
        {fields.map((field) => (
          <div key={field.name} className={`form-cell${field.span === 'full' ? ' form-cell--full' : ''}`}>
            {field.type === 'checkbox' ? (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(event) => setValue(field.name, event.target.checked)}
                />
                <span className="switch__track" aria-hidden="true" />
                <span className="switch__text">
                  {field.label}
                  {field.hint && <small>{field.hint}</small>}
                </span>
              </label>
            ) : (
              <Field label={field.label} hint={field.hint} error={errors[field.name]} required={field.required}>
                {(id) => (
                  <Control id={id} field={field} value={values[field.name]} values={values} onChange={setValue} />
                )}
              </Field>
            )}
          </div>
        ))}
        {/* Lets Enter submit the form without a visible duplicate button. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}

function Control({ id, field, value, values, onChange }) {
  const common = {
    id,
    value,
    onChange: (event) => onChange(field.name, event.target.value),
    placeholder: field.placeholder,
  }

  if (field.type === 'select') {
    const options = resolveOptions(field, values)
    return (
      <select className="input input--select" {...common}>
        <option value="">{field.placeholder ?? 'Select…'}</option>
        {options.map((option) => (
          <option key={optionValue(option)} value={optionValue(option)}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'textarea') {
    return <textarea className="input input--area" rows={4} {...common} />
  }

  return (
    <input
      className="input"
      type={field.type === 'money' ? 'number' : field.type}
      min={field.min}
      max={field.max}
      step={field.type === 'money' ? 1 : undefined}
      {...common}
    />
  )
}
