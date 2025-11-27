/**
 * 笔记本列表管理 Hook
 * 负责扫描根目录下的子文件夹，并将其作为可用的笔记本
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DirectoryHandle } from '../directoryAccessor/types'
import { LocalDirectoryAccessor } from '../directoryAccessor/LocalDirectoryAccessor'
import {
  HANDLE_STORE_KEYS,
  loadDirectoryHandle,
  saveDirectoryHandle,
  verifyDirectoryHandlePermissions,
} from '../../utils/fsHandleStorage'

export interface NotebookInfo {
  name: string
  directoryHandle: DirectoryHandle
  originalHandle?: FileSystemDirectoryHandle // 原始句柄，用于创建 LocalDirectoryAccessor
}

export interface UseNotebookListManagerReturn {
  notebooks: NotebookInfo[]
  rootDirectoryHandle: DirectoryHandle | null
  rootOriginalHandle: FileSystemDirectoryHandle | null
  isLoading: boolean
  loadError: string | null
  setLoadError: (error: string | null) => void
  selectRootDirectory: () => Promise<void>
  refreshNotebooks: () => Promise<void>
  getNotebookDirectoryHandle: (notebookName: string) => DirectoryHandle | null
}

/**
 * 扫描根目录，找出所有子目录作为笔记本
 */
async function scanNotebooks(
  rootHandle: DirectoryHandle,
  originalRootHandle?: FileSystemDirectoryHandle | null,
): Promise<NotebookInfo[]> {
  const notebooks: NotebookInfo[] = []

  for await (const [name, entry] of rootHandle.entries()) {
    // 只处理目录
    if ('getFile' in entry) continue

    try {
      const subDirectoryHandle = entry as DirectoryHandle
        // 如果是本地目录，尝试获取原始句柄
        let originalHandle: FileSystemDirectoryHandle | undefined
        if (originalRootHandle) {
          try {
            originalHandle = await originalRootHandle.getDirectoryHandle(name)
          } catch (error) {
            console.warn(`Failed to get original handle for ${name}:`, error)
          }
        }
        
        notebooks.push({
          name,
          directoryHandle: subDirectoryHandle,
          originalHandle,
        })
    } catch (error) {
      console.warn(`Failed to scan subdirectory ${name}:`, error)
    }
  }

  // 按名称排序
  return notebooks.sort((a, b) => a.name.localeCompare(b.name))
}

export function useNotebookListManager(): UseNotebookListManagerReturn {
  const [notebooks, setNotebooks] = useState<NotebookInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const rootDirectoryHandleRef = useRef<DirectoryHandle | null>(null)
  const rootOriginalHandleRef = useRef<FileSystemDirectoryHandle | null>(null)

  const refreshNotebooks = useCallback(async () => {
    const rootHandle = rootDirectoryHandleRef.current
    const originalHandle = rootOriginalHandleRef.current
    if (!rootHandle) {
      setNotebooks([])
      return
    }

    try {
      setIsLoading(true)
      setLoadError(null)
      const scannedNotebooks = await scanNotebooks(rootHandle, originalHandle)
      setNotebooks(scannedNotebooks)
    } catch (error) {
      console.error('Failed to scan notebooks:', error)
      setLoadError(
        error instanceof Error ? error.message : '扫描笔记本失败',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const selectRootDirectory = useCallback(async () => {
    if (!window.showDirectoryPicker) {
      setLoadError(
        '当前浏览器暂不支持选择文件夹，请使用最新的 Chromium/Edge 浏览器。',
      )
      return
    }

    try {
      setIsLoading(true)
      setLoadError(null)
      const handle = await window.showDirectoryPicker()
      rootOriginalHandleRef.current = handle
      await saveDirectoryHandle(HANDLE_STORE_KEYS.notebookRootDirectory, handle)
      // 创建包装的 DirectoryHandle
      const accessor = new LocalDirectoryAccessor(handle)
      const wrappedHandle = await accessor.getDirectoryHandle()
      rootDirectoryHandleRef.current = wrappedHandle
      await refreshNotebooks()
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return
      setLoadError('选择根目录失败，请确认权限后重试。')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [refreshNotebooks])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let cancelled = false

    const restoreRootDirectoryHandle = async () => {
      try {
        const storedHandle = await loadDirectoryHandle(HANDLE_STORE_KEYS.notebookRootDirectory)
        if (!storedHandle) {
          return
        }

        const hasPermission = await verifyDirectoryHandlePermissions(storedHandle)
        if (!hasPermission || cancelled) {
          return
        }

        rootOriginalHandleRef.current = storedHandle
        const accessor = new LocalDirectoryAccessor(storedHandle)
        const wrappedHandle = await accessor.getDirectoryHandle()
        rootDirectoryHandleRef.current = wrappedHandle
        if (!cancelled) {
          await refreshNotebooks()
        }
      } catch (error) {
        console.warn('[useNotebookListManager] Failed to restore root directory:', error)
      }
    }

    restoreRootDirectoryHandle()

    return () => {
      cancelled = true
    }
  }, [refreshNotebooks])

  const getNotebookDirectoryHandle = useCallback(
    (notebookName: string): DirectoryHandle | null => {
      const notebook = notebooks.find((nb) => nb.name === notebookName)
      return notebook?.directoryHandle ?? null
    },
    [notebooks],
  )

  return {
    notebooks,
    rootDirectoryHandle: rootDirectoryHandleRef.current,
    rootOriginalHandle: rootOriginalHandleRef.current,
    isLoading,
    loadError,
    setLoadError,
    selectRootDirectory,
    refreshNotebooks,
    getNotebookDirectoryHandle,
  }
}

