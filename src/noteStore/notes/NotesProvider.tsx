import { useMemo, useState, useEffect, type ReactNode } from 'react'
import type { NoteName } from '../note/types'
import { NotesContext } from './NotesContext'
import { useNoteListManager } from '../hooks/useNoteListManager'
import { useNoteManager } from '../hooks/useNoteManager'
import { useNotebookListManager } from '../hooks/useNotebookListManager'
import { LocalDirectoryAccessor } from '../directoryAccessor/LocalDirectoryAccessor'
import { GitHubDirectoryAccessor, parseGitHubUrl } from '../directoryAccessor/GitHubDirectoryAccessor'
import type { DirectoryAccessor } from '../directoryAccessor/types'
import { setKlineDataDirectory, getKlineDataDirectoryName } from '../../klineData/storage'
import {
  HANDLE_STORE_KEYS,
  loadDirectoryHandle,
  saveDirectoryHandle,
  verifyDirectoryHandlePermissions,
} from '../../utils/fsHandleStorage'

/**
 * NotesProvider 组件
 * 
 * 职责分离：
 * 1. useNoteListManager - 管理笔记列表（新增、删除、选择、搜索、文件夹操作）
 * 2. useNoteManager - 管理单个笔记的读写更新删除（包括脏标记和自动保存）
 */
export function NotesProvider({ children }: { children: ReactNode }) {
  // 1. 笔记本列表管理
  const notebookListManager = useNotebookListManager()
  
  // 2. 笔记列表管理
  const listManager = useNoteListManager()
  
  // 当前选中的笔记本名称
  const [activeNotebookName, setActiveNotebookName] = useState<string | null>(null)
  
  // K 线数据目录状态
  const [klineDataDirectoryName, setKlineDataDirectoryName] = useState<string | null>(
    getKlineDataDirectoryName(),
  )
  
  // 监听 K 线目录变化（通过自定义事件）
  useEffect(() => {
    const handleKlineDirectoryChange = () => {
      setKlineDataDirectoryName(getKlineDataDirectoryName())
    }
    
    window.addEventListener('klineDataDirectoryChanged', handleKlineDirectoryChange)
    return () => {
      window.removeEventListener('klineDataDirectoryChanged', handleKlineDirectoryChange)
    }
  }, [])

  // 尝试恢复之前保存的 K 线目录
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let cancelled = false

    const restoreKlineDirectory = async () => {
      try {
        const storedHandle = await loadDirectoryHandle(HANDLE_STORE_KEYS.klineDataDirectory)
        if (!storedHandle) {
          return
        }
        const hasPermission = await verifyDirectoryHandlePermissions(storedHandle)
        if (!hasPermission || cancelled) {
          return
        }
        setKlineDataDirectory(storedHandle)
        setKlineDataDirectoryName(storedHandle.name)
      } catch (error) {
        console.warn('[NotesProvider] Failed to restore kline directory:', error)
      }
    }

    restoreKlineDirectory()

    return () => {
      cancelled = true
    }
  }, [])

  // 3. 单个笔记管理（需要访问列表的 updateNote 和 notes）
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

  // 加载笔记（通过目录访问器）
  const loadNotesFromAccessor = async (accessor: DirectoryAccessor) => {
    await listManager.loadNotesFromDirectoryAccessor(accessor)
  }

  // 选择本地笔记文件夹
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
      const accessor = new LocalDirectoryAccessor(handle)
      await loadNotesFromAccessor(accessor)
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return
      listManager.setLoadError('读取文件夹失败，请确认权限后重试。')
      console.error(error)
    }
  }

  const loadGitHubNotebook = async (url: string) => {
    try {
      listManager.setLoadError(null)
      
      const config = parseGitHubUrl(url.trim())
      if (!config) {
        listManager.setLoadError('GitHub URL 格式不正确，请使用格式：https://github.com/owner/repo/tree/branch/path')
        return
      }

      const accessor = new GitHubDirectoryAccessor(config)
      await loadNotesFromAccessor(accessor)
      setActiveNotebookName(null)
    } catch (error) {
      listManager.setLoadError(
        error instanceof Error ? error.message : '加载 GitHub 仓库失败，请检查 URL 是否正确或仓库是否为公开仓库。',
      )
      console.error(error)
    }
  }

  // 选择 GitHub 仓库
  const selectGitHubRepository = async () => {
    try {
      // 提示用户输入 GitHub URL
      const url = window.prompt('请输入 GitHub 仓库 URL：\n例如：https://github.com/owner/repo/tree/main/path')
      if (!url || !url.trim()) {
        return
      }

      await loadGitHubNotebook(url)
    } catch (error) {
      console.error(error)
    }
  }

  // 选择笔记本（加载该笔记本的笔记）
  const selectNotebook = async (notebookName: string) => {
    const notebook = notebookListManager.notebooks.find((nb) => nb.name === notebookName)
    if (!notebook) {
      listManager.setLoadError(`笔记本 ${notebookName} 不存在`)
      return
    }

    try {
      listManager.setLoadError(null)
      
      // 如果有原始句柄，使用原始句柄；否则尝试从根目录获取
      let originalHandle: FileSystemDirectoryHandle | null = null
      if (notebook.originalHandle) {
        originalHandle = notebook.originalHandle
      } else if (notebookListManager.rootOriginalHandle) {
        try {
          originalHandle = await notebookListManager.rootOriginalHandle.getDirectoryHandle(notebookName)
        } catch (error) {
          console.warn(`Failed to get original handle for notebook ${notebookName}:`, error)
        }
      }
      
      if (!originalHandle) {
        throw new Error('无法获取笔记本的目录句柄')
      }
      
      const accessor = new LocalDirectoryAccessor(originalHandle)
      await loadNotesFromAccessor(accessor)
      setActiveNotebookName(notebookName)
    } catch (error) {
      console.error('Failed to load notebook:', error)
      listManager.setLoadError('加载笔记本失败，请重试。')
    }
  }

  // 创建新笔记本
  const createNotebook = async () => {
    if (!window.showDirectoryPicker) {
      notebookListManager.setLoadError(
        '当前浏览器暂不支持创建文件夹，请使用最新的 Chromium/Edge 浏览器。',
      )
      return
    }

    try {
      notebookListManager.setLoadError(null)
      // 如果没有选择根目录，先让用户选择根目录
      if (!notebookListManager.rootDirectoryHandle) {
        await notebookListManager.selectRootDirectory()
        if (!notebookListManager.rootDirectoryHandle) {
          return
        }
      }

      const rootHandle = notebookListManager.rootDirectoryHandle as any as FileSystemDirectoryHandle
      const folderName = window.prompt('请输入新笔记本的名称：')
      if (!folderName || !folderName.trim()) {
        return
      }

      // 创建新文件夹
      await rootHandle.getDirectoryHandle(folderName.trim(), {
          create: true,
      })

      // 刷新笔记本列表
      await notebookListManager.refreshNotebooks()

      // 自动选择新创建的笔记本
      await selectNotebook(folderName.trim())
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return
      notebookListManager.setLoadError('创建笔记本失败，请确认权限后重试。')
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

  // 选择 K 线数据目录
  const selectKlineDataDirectory = async () => {
    if (!window.showDirectoryPicker) {
      listManager.setLoadError(
        '当前浏览器暂不支持选择文件夹，请使用最新的 Chromium/Edge 浏览器。',
      )
      return
    }
    try {
      listManager.setLoadError(null)
      const handle = await window.showDirectoryPicker()
      setKlineDataDirectory(handle)
      setKlineDataDirectoryName(handle.name)
      await saveDirectoryHandle(HANDLE_STORE_KEYS.klineDataDirectory, handle)
      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('klineDataDirectoryChanged'))
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return
      listManager.setLoadError('选择 K 线数据目录失败，请确认权限后重试。')
      console.error(error)
    }
  }

  const value = useMemo(() => {
    const directoryHandle = listManager.getDirectoryHandle()
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
      // 笔记本管理
      notebooks: notebookListManager.notebooks,
      activeNotebookName,
      selectNotebook,
      selectRootDirectory: notebookListManager.selectRootDirectory,
      createNotebook,
      refreshNotebooks: notebookListManager.refreshNotebooks,
      loadGitHubNotebook,
      // 向后兼容的文件夹管理
      selectNotesFolder,
      selectGitHubRepository,
      isLoading: listManager.isLoading || notebookListManager.isLoading,
      sourceFolderName: listManager.sourceFolderName,
      directoryHandle,
      loadError: listManager.loadError || notebookListManager.loadError,
      setLoadError: (error: string | null) => {
        listManager.setLoadError(error)
        notebookListManager.setLoadError(error)
      },
      saveNoteToFolder: noteManager.saveNoteToFolder,
      renameNote,
      selectKlineDataDirectory,
      klineDataDirectoryName,
    }
  }, [
    listManager,
    notebookListManager,
    noteManager,
    activeNote,
    activeNotebookName,
    deleteNote,
    selectNote,
    selectNotesFolder,
    selectGitHubRepository,
    loadGitHubNotebook,
    createNotebook,
    renameNote,
    selectKlineDataDirectory,
    klineDataDirectoryName,
  ])

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

