import { useContext } from 'react'
import { NoteConfigContext } from '../noteConfig/NoteConfigContext'

export function useNoteConfigContext() {
  const ctx = useContext(NoteConfigContext)
  if (!ctx) {
    throw new Error('useNoteConfigContext must be used within NoteConfigProvider')
  }
  return ctx
}

