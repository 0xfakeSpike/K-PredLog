import { createContext } from 'react'
import type { NoteConfig } from './index'

/**
 * 笔记配置 Context 的类型定义
 * 由 NoteConfigProvider 维护，通过 useNoteConfigContext 访问
 */
export type NoteConfigContextShape = {
  noteConfig: NoteConfig | null
  directoryHandle: FileSystemDirectoryHandle | null
  loadConfig: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>
  updateNoteConfig: (
    updates: Partial<NoteConfig>,
    directoryHandle: FileSystemDirectoryHandle,
  ) => Promise<void>
}

export const NoteConfigContext = createContext<NoteConfigContextShape | undefined>(
  undefined,
)

