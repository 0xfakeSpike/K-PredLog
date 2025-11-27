const DB_NAME = 'k-predlog-fs-handles'
const STORE_NAME = 'directoryHandles'

export const HANDLE_STORE_KEYS = {
  klineDataDirectory: 'kline-data-directory',
  notebookRootDirectory: 'notebook-root-directory',
} as const

function canUseIndexedDB(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDB()) {
      reject(new Error('IndexedDB is not supported in this environment'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

function runTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, mode)
      const store = transaction.objectStore(STORE_NAME)
      const request = runner(store)

      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    } catch (error) {
      reject(error)
    }
  })
}

export async function saveDirectoryHandle(
  key: string,
  handle: FileSystemDirectoryHandle | null,
): Promise<void> {
  if (!canUseIndexedDB()) {
    return
  }

  const db = await openDatabase()
  if (!handle) {
    await runTransaction(db, 'readwrite', (store) => store.delete(key))
    return
  }

  await runTransaction(db, 'readwrite', (store) => store.put(handle, key))
}

export async function loadDirectoryHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  if (!canUseIndexedDB()) {
    return null
  }

  const db = await openDatabase()
  const handle = await runTransaction<FileSystemDirectoryHandle | undefined>(
    db,
    'readonly',
    (store) => store.get(key),
  )
  return handle ?? null
}

type PermissionMode = 'read' | 'readwrite'
type PermissionCapableHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: { mode?: PermissionMode }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: PermissionMode }) => Promise<PermissionState>
}

export async function verifyDirectoryHandlePermissions(
  handle: FileSystemDirectoryHandle,
  mode: PermissionMode = 'readwrite',
): Promise<boolean> {
  const permissionHandle = handle as PermissionCapableHandle
  const queryPermission = permissionHandle.queryPermission?.bind(permissionHandle)
  const requestPermission = permissionHandle.requestPermission?.bind(permissionHandle)

  if (!queryPermission || !requestPermission) {
    return true
  }

  const status = await queryPermission({ mode })
  if (status === 'granted') {
    return true
  }
  if (status === 'denied') {
    return false
  }
  const requested = await requestPermission({ mode })
  return requested === 'granted'
}

