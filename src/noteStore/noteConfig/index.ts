/**
 * 笔记配置类型定义和文件读写函数
 * 配置状态由 NoteConfigProvider 维护，这里只提供类型定义和文件操作
 */

export interface NoteConfig {
  /**
   * 数据来源，例如 'binance', 'coinglass'
   */
  source: string
  
  /**
   * 标的，例如 'btc', 'eth', 'sol'
   */
  symbol: string
}

/**
 * 配置文件路径（相对于笔记文件夹）
 */
const CONFIG_FILE_NAME = 'note_config.json'

/**
 * 默认配置
 */
const DEFAULT_CONFIG: NoteConfig = {
  source: 'binance',
  symbol: 'BTC',
}

/**
 * 读取配置文件
 * 如果文件不存在，返回默认配置
 * 其他错误（解析失败、权限问题等）会抛出异常
 */
export async function loadNoteConfig(
  directoryHandle: FileSystemDirectoryHandle,
): Promise<NoteConfig> {
  console.log('[loadNoteConfig] Starting to load config from directory:', directoryHandle.name)
  
  try {
    console.log('[loadNoteConfig] Getting file handle for:', CONFIG_FILE_NAME)
    const fileHandle = await directoryHandle.getFileHandle(CONFIG_FILE_NAME)
    
    console.log('[loadNoteConfig] Getting file object')
    const file = await fileHandle.getFile()
    
    console.log('[loadNoteConfig] Reading file text, size:', file.size)
    const text = await file.text()
    console.log('[loadNoteConfig] File content:', text)
    
    try {
      const parsed = JSON.parse(text) as NoteConfig
      console.log('[loadNoteConfig] Parsed config:', parsed)
      
      // 验证配置格式
      if (typeof parsed.source !== 'string') {
        throw new Error(`Invalid config: 'source' must be a string, got ${typeof parsed.source}`)
      }
      if (typeof parsed.symbol !== 'string') {
        throw new Error(`Invalid config: 'symbol' must be a string, got ${typeof parsed.symbol}`)
      }
      
      console.log('[loadNoteConfig] Config loaded successfully:', parsed)
      return parsed
    } catch (parseError) {
      console.error('[loadNoteConfig] JSON parse error:', parseError)
      console.error('[loadNoteConfig] File content that failed to parse:', text)
      throw new Error(`Failed to parse note_config.json: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
    }
  } catch (error: any) {
    // 文件不存在，返回默认配置
    if (error.name === 'NotFoundError') {
      console.log('[loadNoteConfig] File not found, using default config')
      return DEFAULT_CONFIG
    }
    // 其他错误，详细记录并抛出
    console.error('[loadNoteConfig] Error loading config:', {
      error,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack,
      directoryName: directoryHandle.name,
    })
    throw error
  }
}

/**
 * 保存配置文件
 */
export async function saveNoteConfig(
  config: NoteConfig,
  directoryHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const handle = await directoryHandle.getFileHandle(CONFIG_FILE_NAME, { create: true })
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(config, null, 2))
  await writable.close()
}

