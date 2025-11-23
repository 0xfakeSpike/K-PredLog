/**
 * File System Access API 类型定义
 * 
 * 这是对浏览器 File System Access API 的类型补丁。
 * 由于 TypeScript 的 DOM lib 可能尚未完全支持此 API，
 * 因此在此补充类型定义。
 * 
 * 注意：这是浏览器 API 的类型定义，不是项目维护的代码。
 * 如果 TypeScript 官方支持了此 API，应优先使用官方类型定义。
 */

interface FileSystemHandle {
  kind: 'file' | 'directory'
  name: string
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file'
  getFile(): Promise<File>
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory'
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
}

interface Window {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
}

