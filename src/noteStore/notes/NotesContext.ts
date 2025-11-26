import { createContext } from 'react'
import type { Note, NoteName } from '../note/types'
import type { DirectoryHandle } from '../directoryAccessor/types'

/**
 * 笔记管理 Context 的类型定义
 * 由 NotesProvider 维护，通过 useNotesContext 访问
 */
export type NotesContextShape = {
  // 笔记数据
  notes: Note[]
  activeNoteName: NoteName | null
  activeNote: Note | null
  
  // 笔记操作
  createNote: () => void
  selectNote: (name: NoteName) => void
  updateNote: (name: NoteName, patch: Partial<Note>) => void
  deleteNote: (name: NoteName) => void
  saveNoteToFolder: (name: NoteName, options?: { silent?: boolean }) => Promise<void>
  renameNote: (oldName: NoteName, newName: NoteName) => Promise<void>
  
  // 搜索
  searchTerm: string
  setSearchTerm: (term: string) => void
  
  // 文件夹管理
  selectNotesFolder: () => Promise<void>
  selectGitHubRepository: () => Promise<void>
  createNotebook: () => Promise<void>
  sourceFolderName: string | null
  directoryHandle: DirectoryHandle | null
  isLoading: boolean
  loadError: string | null
  setLoadError: (error: string | null) => void
  
  // K 线数据目录管理
  selectKlineDataDirectory: () => Promise<void>
  klineDataDirectoryName: string | null
}

export const NotesContext = createContext<NotesContextShape | undefined>(
  undefined,
)

