import { createContext } from 'react'
import type { NoteConfig } from './index'
import type { DirectoryHandle } from '../directoryAccessor/types'

/**
 * 笔记配置 Context 的类型定义
 * 由 NoteConfigProvider 维护，通过 useNoteConfigContext 访问
 */
export type NoteConfigContextShape = {
  noteConfig: NoteConfig | null
  directoryHandle: DirectoryHandle | null
  loadConfig: (directoryHandle: DirectoryHandle) => Promise<void>
  updateNoteConfig: (
    updates: Partial<NoteConfig>,
    directoryHandle: DirectoryHandle,
  ) => Promise<void>
}

export const NoteConfigContext = createContext<NoteConfigContextShape | undefined>(
  undefined,
)

