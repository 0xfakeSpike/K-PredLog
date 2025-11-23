import { useMemo, type ReactNode } from 'react'
import type { NoteName } from '../note/types'
import { NotesContext } from './NotesContext'
import { useNoteListManager } from '../hooks/useNoteListManager'
import { useNoteManager } from '../hooks/useNoteManager'

/**
 * NotesProvider 组件
 * 
 * 职责分离：
 * 1. useNoteListManager - 管理笔记列表（新增、删除、选择、搜索、文件夹操作）
 * 2. useNoteManager - 管理单个笔记的读写更新删除（包括脏标记和自动保存）
 * 
 * 注意：useNoteConfigManager 不再在这里使用，配置相关的组件应该直接使用该 hook
 */
export function NotesProvider({ children }: { children: ReactNode }) {
  // 1. 笔记列表管理
  const listManager = useNoteListManager()

  // 2. 单个笔记管理（需要访问列表的 updateNote 和 notes）
  const noteManager = useNoteManager(
    listManager.allNotes,
    listManager.updateNote,
    listManager.getDirectoryHandle,
    undefined, // 不直接设置 loading，通过 listManager
    listManager.setLoadError,
  )

  // 包装 selectNote 以在切换时自动保存之前的脏笔记
  const selectNote = (name: NoteName) => {
    const prevName = listManager.activeNoteName
    if (prevName && prevName !== name) {
      noteManager.flushDirtyNote(prevName)
    }
    listManager.selectNote(name)
  }

  // 加载文件夹
  const enhancedLoadNotes = async (handle: FileSystemDirectoryHandle) => {
    await listManager.loadNotesFromDirectoryHandle(handle)
  }

  // 选择笔记文件夹
  const selectNotesFolder = async () => {
    if (!window.showDirectoryPicker) {
      listManager.setLoadError(
        '当前浏览器暂不支持选择文件夹，请使用最新的 Chromium/Edge 浏览器。',
      )
      return
    }
    try {
      listManager.setLoadError(null)
      const handle = await window.showDirectoryPicker()
      await enhancedLoadNotes(handle)
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return
      listManager.setLoadError('读取文件夹失败，请确认权限后重试。')
      console.error(error)
    }
  }

  // 创建新笔记本
  const createNotebook = async () => {
    if (!window.showDirectoryPicker) {
      listManager.setLoadError(
        '当前浏览器暂不支持创建文件夹，请使用最新的 Chromium/Edge 浏览器。',
      )
      return
    }

    try {
      listManager.setLoadError(null)
      const parentHandle = await window.showDirectoryPicker()
      const folderName = window.prompt('请输入新笔记本的名称：')
      if (!folderName || !folderName.trim()) {
        return
      }
      const newFolderHandle = await parentHandle.getDirectoryHandle(
        folderName.trim(),
        {
          create: true,
        },
      )
      await enhancedLoadNotes(newFolderHandle)
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return
      listManager.setLoadError('创建笔记本失败，请确认权限后重试。')
      console.error(error)
    }
  }

  // 计算 activeNote
  const activeNote = useMemo(() => {
    if (!listManager.activeNoteName) return null
    return (
      listManager.allNotes.find(
        (note) => note.name === listManager.activeNoteName,
      ) ?? null
    )
  }, [listManager.allNotes, listManager.activeNoteName])

  // 包装 deleteNote 以清除脏标记
  const deleteNote = (name: NoteName) => {
    listManager.deleteNote(name)
    noteManager.clearDirtyNote(name)
  }

  // 包装 renameNote 以清除脏标记
  const renameNote = async (oldName: NoteName, newName: NoteName): Promise<void> => {
    noteManager.clearDirtyNote(oldName)
    await listManager.renameNote(oldName, newName)
  }

  const value = useMemo(() => {
    const directoryHandle = listManager.getDirectoryHandle()
    console.log('[NotesProvider] useMemo - directoryHandle:', directoryHandle?.name || 'null')
    return {
      notes: listManager.notes,
      activeNoteName: listManager.activeNoteName,
      activeNote,
      searchTerm: listManager.searchTerm,
      setSearchTerm: listManager.setSearchTerm,
      createNote: listManager.createNote,
      selectNote,
      updateNote: noteManager.updateNote,
      deleteNote,
      selectNotesFolder,
      createNotebook,
      isLoading: listManager.isLoading,
      sourceFolderName: listManager.sourceFolderName,
      directoryHandle,
      loadError: listManager.loadError,
      setLoadError: listManager.setLoadError,
      saveNoteToFolder: noteManager.saveNoteToFolder,
      renameNote,
    }
  }, [
    listManager,
    noteManager,
    activeNote,
    deleteNote,
    selectNote,
    selectNotesFolder,
    createNotebook,
    renameNote,
  ])

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

