'use client'

import { Check, ChevronDown, X } from 'lucide-react'
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
  placeholder = 'e.g. Koramangala, Bandra West…',
  hasError = false,
  disabled = false,
}: LocalityComboboxProps) {
  const inputId = useId()
  const listboxId = useId()

  const [inputValue, setInputValue] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep input display in sync when the parent resets/changes the value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const filtered = filterLocalities(localities, inputValue)
  // Cap dropdown to 8 items to keep it scannable
  const suggestions = filtered.slice(0, 8)

  function openDropdown() {
    setIsOpen(true)
    setActiveIndex(-1)
  }

  function closeDropdown() {
    setIsOpen(false)
    setActiveIndex(-1)
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
    // If user is typing, clear the stored selection so the parent knows it's uncommitted
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
        setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectOption(suggestions[activeIndex])
        }
        break
      case 'Escape':
        closeDropdown()
        // Restore last committed value
        setInputValue(value)
        break
      case 'Tab':
        // On tab, auto-select the top result if the user typed something recognisable
        if (suggestions.length === 1 && suggestions[0]) {
          selectOption(suggestions[0])
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

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
        // Restore committed value on outside click
        setInputValue(value)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  const isCommitted = value !== '' && inputValue === value
  const showDropdown = isOpen && suggestions.length > 0 && !disabled

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
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none"
        />

        {/* Clear button — shown when there is any text */}
        {inputValue && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            aria-label="Clear locality"
            className="text-muted-foreground hover:text-foreground mr-1 rounded p-1.5 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Chevron — visual affordance */}
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
            'absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto',
            'border-border rounded-xl border bg-white py-1 shadow-lg',
          )}
        >
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
                  // prevent input blur before click registers
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

          {/* "Not in list?" escape hatch */}
          {inputValue.trim().length >= 2 &&
            !suggestions.some((s) => s.name.toLowerCase() === inputValue.toLowerCase()) && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault()
                  // Accept the custom typed value as-is, no pincode auto-fill
                  onChange({ name: inputValue.trim(), pincode: '', city: '' })
                  closeDropdown()
                  inputRef.current?.blur()
                }}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
                className={cn(
                  'border-border text-muted-foreground flex cursor-pointer items-center gap-2 border-t px-4 py-2.5 text-sm',
                  activeIndex === suggestions.length && 'bg-muted',
                )}
              >
                <span>
                  Use &ldquo;<strong className="text-foreground">{inputValue.trim()}</strong>&rdquo;
                  as locality
                </span>
              </li>
            )}
        </ul>
      )}
    </div>
  )
}
