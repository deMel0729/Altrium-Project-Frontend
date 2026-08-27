import { useState } from 'react'
import { Button, Field, Modal } from './ui'
import { fromDateInput, toDateInput } from '../utils/format'

// Schema-driven create/edit dialog. One field descriptor looks like:
//   { name, label, type, options?, required?, hint?, min?, max?, placeholder?, span? }
// `type` is one of: text | email | url | tel | password | number | money |
//                   date | select | textarea | checkbox

function initialValue(field, record) {
  const existing = record ? record[field.name] : undefined
  if (field.type === 'checkbox') return existing ?? field.defaultValue ?? false
  if (field.type === 'date') return toDateInput(existing) || (field.defaultValue ?? '')
  if (existing === null || existing === undefined) return field.defaultValue ?? ''
  return String(existing)
}

function buildInitialState(fields, record) {
  return Object.fromEntries(fields.map((field) => [field.name, initialValue(field, record)]))
}

function validateField(field, value) {
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
  return field.validate ? field.validate(value) : null
}

// Turns form strings back into the shapes the C# models expect.
function serialize(fields, values) {
  const payload = {}
  for (const field of fields) {
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
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => (current[name] ? { ...current, [name]: null } : current))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    for (const field of fields) {
      const message = validateField(field, values[field.name])
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
                  <Control id={id} field={field} value={values[field.name]} onChange={setValue} />
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

function Control({ id, field, value, onChange }) {
  const common = {
    id,
    value,
    onChange: (event) => onChange(field.name, event.target.value),
    placeholder: field.placeholder,
  }

  if (field.type === 'select') {
    return (
      <select className="input input--select" {...common}>
        <option value="">{field.placeholder ?? 'Select…'}</option>
        {field.options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value
          const optionLabel = typeof option === 'string' ? option : option.label
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          )
        })}
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
