import { useMemo, useState, useEffect, type ReactNode } from 'react'
import type { NoteName } from '../note/types'
import { NotesContext } from './NotesContext'
import { useNoteListManager } from '../hooks/useNoteListManager'
import { useNoteManager } from '../hooks/useNoteManager'
import { LocalDirectoryAccessor } from '../directoryAccessor/LocalDirectoryAccessor'
import { GitHubDirectoryAccessor, parseGitHubUrl } from '../directoryAccessor/GitHubDirectoryAccessor'
import type { DirectoryAccessor } from '../directoryAccessor/types'
import { setKlineDataDirectory, getKlineDataDirectoryName } from '../../klineData/storage'

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

  // 选择 GitHub 仓库
  const selectGitHubRepository = async () => {
    try {
      listManager.setLoadError(null)
      
      // 提示用户输入 GitHub URL
      const url = window.prompt('请输入 GitHub 仓库 URL：\n例如：https://github.com/owner/repo/tree/main/path')
      if (!url || !url.trim()) {
        return
      }

      // 解析 URL
      const config = parseGitHubUrl(url.trim())
      if (!config) {
        listManager.setLoadError('GitHub URL 格式不正确，请使用格式：https://github.com/owner/repo/tree/branch/path')
        return
      }

      const accessor = new GitHubDirectoryAccessor(config)
      await loadNotesFromAccessor(accessor)
    } catch (error) {
      listManager.setLoadError(
        error instanceof Error ? error.message : '加载 GitHub 仓库失败，请检查 URL 是否正确或仓库是否为公开仓库。',
      )
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
      const accessor = new LocalDirectoryAccessor(newFolderHandle)
      await loadNotesFromAccessor(accessor)
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
      selectNotesFolder,
      selectGitHubRepository,
      createNotebook,
      isLoading: listManager.isLoading,
      sourceFolderName: listManager.sourceFolderName,
      directoryHandle,
      loadError: listManager.loadError,
      setLoadError: listManager.setLoadError,
      saveNoteToFolder: noteManager.saveNoteToFolder,
      renameNote,
      selectKlineDataDirectory,
      klineDataDirectoryName,
    }
  }, [
    listManager,
    noteManager,
    activeNote,
    deleteNote,
    selectNote,
    selectNotesFolder,
    selectGitHubRepository,
    createNotebook,
    renameNote,
    selectKlineDataDirectory,
    klineDataDirectoryName,
  ])

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

