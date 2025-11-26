/**
 * GitHub 目录访问器
 * 通过 GitHub API 访问仓库中的目录
 */

import type { DirectoryAccessor, DirectoryHandle, FileHandle } from './types'

/**
 * GitHub API 配置
 */
export interface GitHubConfig {
  owner: string
  repo: string
  path: string // 仓库中的路径，例如 'notes' 或 'notebooks/my-notes'
  branch: string // 分支名称，默认为 'main'
}

/**
 * 解析 GitHub URL
 * 支持格式：
 * - https://github.com/owner/repo/tree/branch/path/to/dir
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo
 * 
 * @param url GitHub URL
 * @returns GitHubConfig 或 null（如果 URL 无效）
 */
export function parseGitHubUrl(url: string): GitHubConfig | null {
  try {
    // 移除末尾的斜杠
    const cleanUrl = url.trim().replace(/\/$/, '')
    
    // 匹配 GitHub URL 格式
    // https://github.com/owner/repo/tree/branch/path/to/dir
    // 或者 https://github.com/owner/repo (默认使用 main 分支和根目录)
    const match = cleanUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?$/)
    
    if (!match) {
      return null
    }
    
    const [, owner, repo, branch, path] = match
    
    return {
      owner: owner.trim(),
      repo: repo.trim(),
      branch: (branch || 'main').trim(),
      path: (path || '').trim(),
    }
  } catch (error) {
    console.error('Failed to parse GitHub URL:', error)
    return null
  }
}

/**
 * GitHub 文件内容响应
 */
interface GitHubFileContent {
  name: string
  path: string
  type: 'file' | 'dir'
  content?: string // base64 编码的内容（仅文件）
  encoding?: string
  sha: string
  size: number
}

/**
 * GitHub 文件句柄
 */
class GitHubFileHandle implements FileHandle {
  config: GitHubConfig
  filePath: string

  constructor(
    config: GitHubConfig,
    filePath: string,
    _fileSha: string,
  ) {
    this.config = config
    this.filePath = filePath
  }

  get name(): string {
    const parts = this.filePath.split('/')
    return parts[parts.length - 1]
  }

  async getFile(): Promise<File> {
    const content = await this.fetchFileContent()
    return new File([content], this.name, { type: 'text/plain' })
  }

  async createWritable(): Promise<WritableStream> {
    // GitHub 是只读的，返回一个空的 WritableStream，静默跳过写入操作
    return new WritableStream({
      write() {
        // 静默跳过，不做任何操作
      },
      close() {
        // 静默跳过，不做任何操作
      },
    })
  }

  private async fetchFileContent(): Promise<string> {
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.filePath}`
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    }

    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }

    const data = (await response.json()) as GitHubFileContent
    if (data.encoding === 'base64' && data.content) {
      // 正确解码 base64 并转换为 UTF-8 字符串
      const binaryString = atob(data.content)
      // 将二进制字符串转换为 Uint8Array
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      // 使用 TextDecoder 将字节解码为 UTF-8 字符串
      const decoder = new TextDecoder('utf-8')
      return decoder.decode(bytes)
    }
    throw new Error('Unexpected file encoding')
  }
}

/**
 * GitHub 目录句柄
 */
class GitHubDirectoryHandleWrapper implements DirectoryHandle {
  config: GitHubConfig
  dirPath: string

  constructor(
    config: GitHubConfig,
    dirPath: string,
  ) {
    this.config = config
    this.dirPath = dirPath
  }

  get name(): string {
    const parts = this.dirPath.split('/').filter(Boolean)
    return parts.length > 0 ? parts[parts.length - 1] : this.config.repo
  }

  async *entries(): AsyncIterableIterator<[string, FileHandle | DirectoryHandle]> {
    const contents = await this.fetchDirectoryContents()
    for (const item of contents) {
      if (item.type === 'file') {
        yield [item.name, new GitHubFileHandle(this.config, item.path, item.sha)]
      } else if (item.type === 'dir') {
        yield [
          item.name,
          new GitHubDirectoryHandleWrapper(this.config, item.path),
        ]
      }
    }
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle> {
    // 如果是创建操作，返回一个假的文件句柄，静默跳过
    if (options?.create) {
      return new GitHubFileHandle(this.config, this.dirPath ? `${this.dirPath}/${name}` : name, '')
    }

    const contents = await this.fetchDirectoryContents()
    const file = contents.find((item) => item.name === name && item.type === 'file')

    if (!file) {
      // 创建一个符合 FileHandle 接口的错误对象，以便上层代码可以检查 error.name === 'NotFoundError'
      const error = new Error(`File not found: ${name}`)
      ;(error as any).name = 'NotFoundError'
      throw error
    }

    return new GitHubFileHandle(this.config, file.path, file.sha)
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle> {
    // 如果是创建操作，返回一个假的目录句柄，静默跳过
    if (options?.create) {
      return new GitHubDirectoryHandleWrapper(this.config, this.dirPath ? `${this.dirPath}/${name}` : name)
    }

    const contents = await this.fetchDirectoryContents()
    const dir = contents.find((item) => item.name === name && item.type === 'dir')

    if (!dir) {
      throw new Error(`Directory not found: ${name}`)
    }

    return new GitHubDirectoryHandleWrapper(this.config, dir.path)
  }

  async removeEntry(_name: string): Promise<void> {
    // GitHub 是只读的，静默跳过删除操作
    // 不做任何操作，直接返回
  }

  private async fetchDirectoryContents(): Promise<GitHubFileContent[]> {
    const ref = this.config.branch || 'main'
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.dirPath || ''}?ref=${ref}`
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    }

    const response = await fetch(url, { headers })
    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Failed to fetch directory: ${response.statusText}`)
    }

    const data = (await response.json()) as GitHubFileContent | GitHubFileContent[]
    // API 可能返回单个对象（如果路径是文件）或数组（如果路径是目录）
    if (Array.isArray(data)) {
      return data
    }
    // 如果是单个文件，返回空数组（这种情况不应该发生，因为我们在请求目录）
    return []
  }
}

/**
 * GitHub 目录访问器实现
 */
export class GitHubDirectoryAccessor implements DirectoryAccessor {
  readonly readOnly = true
  config: GitHubConfig

  constructor(config: GitHubConfig) {
    // 确保 branch 有默认值
    this.config = {
      ...config,
      branch: config.branch || 'main',
    }
  }

  get name(): string {
    const parts = this.config.path.split('/').filter(Boolean)
    return parts.length > 0 ? parts[parts.length - 1] : this.config.repo
  }

  async getDirectoryHandle(): Promise<DirectoryHandle> {
    return new GitHubDirectoryHandleWrapper(this.config, this.config.path)
  }
}

