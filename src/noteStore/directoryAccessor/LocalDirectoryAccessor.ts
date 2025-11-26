/**
 * 本地目录访问器
 * 基于浏览器的 FileSystemDirectoryHandle API
 */

import type { DirectoryAccessor, DirectoryHandle, FileHandle } from './types'

/**
 * 本地文件句柄包装器
 */
class LocalFileHandle implements FileHandle {
  handle: FileSystemFileHandle

  constructor(handle: FileSystemFileHandle) {
    this.handle = handle
  }

  get name(): string {
    return this.handle.name
  }

  async getFile(): Promise<File> {
    return await this.handle.getFile()
  }

  async createWritable(): Promise<WritableStream> {
    const writable = await this.handle.createWritable()
    return writable as unknown as WritableStream
  }
}

/**
 * 本地目录句柄包装器
 */
class LocalDirectoryHandleWrapper implements DirectoryHandle {
  handle: FileSystemDirectoryHandle

  constructor(handle: FileSystemDirectoryHandle) {
    this.handle = handle
  }

  get name(): string {
    return this.handle.name
  }

  async *entries(): AsyncIterableIterator<[string, FileHandle | DirectoryHandle]> {
    for await (const [name, entry] of this.handle.entries()) {
      if (entry.kind === 'file') {
        yield [name, new LocalFileHandle(entry as FileSystemFileHandle)]
      } else if (entry.kind === 'directory') {
        yield [name, new LocalDirectoryHandleWrapper(entry as FileSystemDirectoryHandle)]
      }
    }
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle> {
    const handle = await this.handle.getFileHandle(name, options)
    return new LocalFileHandle(handle)
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle> {
    const handle = await this.handle.getDirectoryHandle(name, options)
    return new LocalDirectoryHandleWrapper(handle)
  }

  async removeEntry(name: string): Promise<void> {
    await this.handle.removeEntry(name)
  }
}

/**
 * 本地目录访问器实现
 */
export class LocalDirectoryAccessor implements DirectoryAccessor {
  readonly readOnly = false
  handle: FileSystemDirectoryHandle

  constructor(handle: FileSystemDirectoryHandle) {
    this.handle = handle
  }

  get name(): string {
    return this.handle.name
  }

  async getDirectoryHandle(): Promise<DirectoryHandle> {
    return new LocalDirectoryHandleWrapper(this.handle)
  }

  /**
   * 获取原始的 FileSystemDirectoryHandle（用于需要原始句柄的场景）
   */
  getOriginalHandle(): FileSystemDirectoryHandle {
    return this.handle
  }
}

