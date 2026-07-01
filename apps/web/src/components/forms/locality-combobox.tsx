'use client'

import { AlertCircle, Check, ChevronDown, PenLine, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { filterLocalities, type LocalityOption } from '@/lib/localities'
import { cn } from '@/lib/utils'

interface LocalityComboboxProps {
  localities: LocalityOption[]
  value: string
  onChange: (locality: LocalityOption | null) => void
  placeholder?: string
  hasError?: boolean
  disabled?: boolean
}

export function LocalityCombobox({
  localities,
  value,
  onChange,
  placeholder = 'Search or type your locality…',
  hasError = false,
  disabled = false,
}: LocalityComboboxProps) {
  const inputId = useId()
  const listboxId = useId()
  const escapeHatchId = `${listboxId}-option-custom`

  const [inputValue, setInputValue] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dropUp, setDropUp] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep input display in sync when parent resets/changes the value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const filtered = filterLocalities(localities, inputValue)
  const suggestions = filtered.slice(0, 8)
  const totalMatches = filtered.length

  const showEscapeHatch =
    inputValue.trim().length >= 1 &&
    !suggestions.some((s) => s.name.toLowerCase() === inputValue.trim().toLowerCase())

  // Dropdown is visible when: open AND (has suggestions OR has escape hatch) AND not disabled
  const showDropdown = isOpen && (suggestions.length > 0 || showEscapeHatch) && !disabled

  // Max navigable index includes escape hatch when visible
  const maxNavIndex = showEscapeHatch ? suggestions.length : suggestions.length - 1

  function openDropdown() {
    // Measure viewport space to decide drop direction
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setDropUp(spaceBelow < 280)
    }
    setIsOpen(true)
    setActiveIndex(-1)
  }

  function closeDropdown() {
    setIsOpen(false)
    setActiveIndex(-1)
  }

  function commitCustomValue(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    onChange({ name: trimmed, pincode: '', city: '' })
    setInputValue(trimmed)
    closeDropdown()
  }

  function selectOption(option: LocalityOption) {
    setInputValue(option.name)
    onChange(option)
    closeDropdown()
    inputRef.current?.blur()
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInputValue(raw)
    // While typing, clear committed store value
    if (raw !== value) onChange(null)
    openDropdown()
    setActiveIndex(-1)
  }

  function handleClear() {
    setInputValue('')
    onChange(null)
    inputRef.current?.focus()
    openDropdown()
  }

  // On blur: if user typed something but never committed, auto-commit as custom locality
  function handleBlur() {
    // Give mousedown on list items time to fire first
    setTimeout(() => {
      if (!value && inputValue.trim()) {
        commitCustomValue(inputValue)
      }
      closeDropdown()
    }, 150)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        openDropdown()
        return
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, maxNavIndex))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length && suggestions[activeIndex]) {
          selectOption(suggestions[activeIndex])
        } else if (activeIndex === suggestions.length && showEscapeHatch) {
          commitCustomValue(inputValue)
        } else if (inputValue.trim()) {
          // Enter with no selection — commit as custom
          commitCustomValue(inputValue)
        }
        break
      case 'Escape':
        closeDropdown()
        if (value) {
          // Restore last committed value both in display and store
          setInputValue(value)
          const match = localities.find((l) => l.name === value)
          if (match) onChange(match)
        } else {
          setInputValue('')
        }
        break
      case 'Tab':
        if (suggestions.length === 1 && suggestions[0]) {
          selectOption(suggestions[0])
        } else if (
          activeIndex >= 0 &&
          activeIndex < suggestions.length &&
          suggestions[activeIndex]
        ) {
          // Tab auto-selects highlighted item
          selectOption(suggestions[activeIndex])
        } else if (inputValue.trim() && !value) {
          // Tab away — commit what they typed
          commitCustomValue(inputValue)
        } else {
          closeDropdown()
        }
        break
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Close on outside click — but auto-commit if text is uncommitted
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!value && inputValue.trim()) {
          commitCustomValue(inputValue)
        } else if (value && inputValue !== value) {
          setInputValue(value)
        }
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inputValue])

  const isCommitted = value !== '' && inputValue === value

  // aria-activedescendant: point to escape hatch id when it's active
  const activeDescendant =
    activeIndex === suggestions.length && showEscapeHatch
      ? escapeHatchId
      : activeIndex >= 0
        ? `${listboxId}-option-${activeIndex}`
        : undefined

  return (
    <div ref={containerRef} className="relative">
      {/* Input row */}
      <div
        className={cn(
          'flex items-center rounded-lg border bg-white transition-colors',
          hasError
            ? 'border-destructive focus-within:border-destructive'
            : 'border-border focus-within:border-primary focus-within:ring-primary/20 focus-within:ring-2',
          disabled && 'opacity-50',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={openDropdown}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none"
        />

        {/* Clear button */}
        {inputValue && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            aria-label="Clear locality"
            className="text-muted-foreground hover:text-foreground mr-1 rounded p-1.5 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <ChevronDown
          className={cn(
            'text-muted-foreground mr-3 h-4 w-4 shrink-0 transition-transform',
            showDropdown && 'rotate-180',
          )}
          aria-hidden
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Locality suggestions"
          className={cn(
            'absolute left-0 right-0 z-50 max-h-60 overflow-y-auto',
            'border-border rounded-xl border bg-white py-1 shadow-lg',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {/* No curated matches message */}
          {suggestions.length === 0 && showEscapeHatch && (
            <li role="presentation" className="text-muted-foreground px-4 py-2 text-xs italic">
              No matches in our list — use the option below
            </li>
          )}

          {suggestions.map((option, idx) => {
            const isActive = idx === activeIndex
            const isSelected = isCommitted && option.name === value
            return (
              <li
                key={`${option.city}-${option.name}`}
                id={`${listboxId}-option-${idx}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectOption(option)
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm',
                  isActive && 'bg-muted',
                  isSelected && 'text-primary font-medium',
                )}
              >
                <span>
                  <span className="font-medium">{option.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{option.pincode}</span>
                </span>
                {isSelected && <Check className="text-primary h-3.5 w-3.5 shrink-0" />}
              </li>
            )
          })}

          {/* Overflow hint */}
          {totalMatches > 8 && (
            <li
              role="presentation"
              className="text-muted-foreground border-border border-t px-4 py-1.5 text-xs"
            >
              Showing 8 of {totalMatches} — type more to narrow down
            </li>
          )}

          {/* Escape hatch — keyboard reachable via ArrowDown */}
          {showEscapeHatch && (
            <li
              id={escapeHatchId}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                commitCustomValue(inputValue)
              }}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm',
                suggestions.length > 0 && 'border-border border-t',
                activeIndex === suggestions.length && 'bg-muted',
              )}
            >
              <PenLine className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <span className="text-foreground">
                Use &ldquo;<strong>{inputValue.trim()}</strong>&rdquo; as my locality
              </span>
            </li>
          )}
        </ul>
      )}

      {/* Helper shown when dropdown is closed and no value is committed */}
      {!isOpen && !value && !disabled && (
        <p className="text-muted-foreground mt-1 text-xs">
          Can&apos;t find your area? Just type it and press Enter.
        </p>
      )}
    </div>
  )
}
