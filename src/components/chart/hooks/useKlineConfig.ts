import { useCallback, useState } from 'react'

export interface NoteConfig {
  source: string
  symbol: string
}

const STORAGE_KEY = 'k-predlog-note-config'

const DEFAULT_NOTE_CONFIG: NoteConfig = {
  source: 'binance',
  symbol: 'BTC',
}

function loadInitialConfig(): NoteConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTE_CONFIG
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_NOTE_CONFIG
    }
    const parsed = JSON.parse(raw) as Partial<NoteConfig> | null
    if (parsed && typeof parsed.source === 'string' && typeof parsed.symbol === 'string') {
      return {
        source: parsed.source,
        symbol: parsed.symbol,
      }
    }
    return DEFAULT_NOTE_CONFIG
  } catch (error) {
    console.warn('[useKlineConfig] Failed to load config:', error)
    return DEFAULT_NOTE_CONFIG
  }
}

function persistConfig(config: NoteConfig) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('[useKlineConfig] Failed to persist config:', error)
  }
}

export function useKlineConfig() {
  const [noteConfig, setNoteConfig] = useState<NoteConfig>(loadInitialConfig)

  const updateNoteConfig = useCallback((updates: Partial<NoteConfig>) => {
    setNoteConfig((prev) => {
      const next = {
        ...prev,
        ...updates,
      }
      persistConfig(next)
      window.dispatchEvent(new CustomEvent('noteConfigUpdated'))
      return next
    })
  }, [])

  return {
    noteConfig,
    updateNoteConfig,
  }
}

