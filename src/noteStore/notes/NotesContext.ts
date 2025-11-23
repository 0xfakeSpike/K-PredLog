import { createContext } from 'react'
import type { Note, NoteName } from '../note/types'

/**
 * 笔记管理 Context 的类型定义
 * 由 NotesProvider 维护，通过 useNotesContext 访问
 * 
 * 这个类型定义是 React Context 必需的，用于类型检查
 * 虽然看起来"大而全"，但这是 React Context 的设计模式
 * 组件通过 useNotesContext 访问，只使用它们需要的字段
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
  createNotebook: () => Promise<void>
  sourceFolderName: string | null
  directoryHandle: FileSystemDirectoryHandle | null
  isLoading: boolean
  loadError: string | null
  setLoadError: (error: string | null) => void
}

export const NotesContext = createContext<NotesContextShape | undefined>(
  undefined,
)

