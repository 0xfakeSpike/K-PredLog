/**
 * 目录访问器抽象接口
 * 用于统一本地目录和 GitHub 仓库的访问方式
 */

/**
 * 文件句柄接口
 */
export interface FileHandle {
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<WritableStream>
}

/**
 * 目录句柄接口
 */
export interface DirectoryHandle {
  name: string
  entries(): AsyncIterableIterator<[string, FileHandle | DirectoryHandle]>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>
  removeEntry(name: string): Promise<void>
}

/**
 * 目录访问器接口
 * 提供统一的目录访问抽象
 */
export interface DirectoryAccessor {
  /**
   * 目录名称
   */
  readonly name: string

  /**
   * 是否为只读模式（GitHub 仓库通常是只读的）
   */
  readonly readOnly: boolean

  /**
   * 获取目录句柄
   */
  getDirectoryHandle(): Promise<DirectoryHandle>

  /**
   * 释放资源（如果需要）
   */
  dispose?(): Promise<void>
}


