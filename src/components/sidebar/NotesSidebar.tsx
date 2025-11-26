import type { Note } from '../../noteStore/note/types'
import { useNotesContext } from '../../noteStore/hooks/useNotesContext'
import { ConfigPanel } from './ConfigPanel'
import { NoteItem } from './noteItem'
import './NotesSidebar.css'

export function NotesSidebar() {
  const {
    notes,
    activeNoteName,
    selectNote,
    createNote,
    renameNote,
    searchTerm,
    setSearchTerm,
    selectNotesFolder,
    selectGitHubRepository,
    createNotebook,
    isLoading,
    sourceFolderName,
    loadError,
    selectKlineDataDirectory,
    klineDataDirectoryName,
  } = useNotesContext()

  const hasKlineDirectory = !!klineDataDirectoryName

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="K 预记" className="sidebar__logo" />
          <div>
            <p className="sidebar__title">K 预记</p>
            <p className="sidebar__subtitle">行情笔记</p>
          </div>
        </div>
      </div>

      {!hasKlineDirectory ? (
        // 未选择 K 线目录时，只显示选择 K 线目录按钮
        <div className="sidebar__kline-data">
          <div className="sidebar__folder-actions">
            <button
              className="sidebar__folder-btn"
              onClick={selectKlineDataDirectory}
              disabled={isLoading}
            >
              {isLoading ? '选择中…' : '选择 K 线数据目录'}
            </button>
          </div>
        </div>
      ) : (
        // 已选择 K 线目录后，显示笔记本相关按钮
        <>
          <div className="sidebar__folder">
            {/* 第一行：3个按钮 */}
            <div className="sidebar__folder-actions">
              <button
                className="sidebar__folder-btn"
                onClick={selectNotesFolder}
                disabled={isLoading}
              >
                {isLoading ? '读取文件夹…' : '从本地加载笔记本'}
              </button>
              <button
                className="sidebar__folder-btn"
                onClick={selectGitHubRepository}
                disabled={isLoading}
              >
                {isLoading ? '加载中…' : '从 GitHub 加载笔记本'}
              </button>
              <button
                className="sidebar__folder-btn"
                onClick={createNotebook}
                disabled={isLoading}
              >
                {isLoading ? '创建中…' : '在本地创建笔记本'}
              </button>
            </div>
            {/* 第二行：当前笔记本名称 + 新建笔记按钮 */}
            <div className="sidebar__notebook-row">
              {sourceFolderName && (
                <p className="sidebar__folder-name">当前：{sourceFolderName}</p>
              )}
              <button
                className="sidebar__folder-btn sidebar__folder-btn--secondary"
                onClick={createNote}
                disabled={isLoading || !sourceFolderName}
              >
                + 新建笔记
              </button>
            </div>
            {loadError && <p className="sidebar__folder-error">{loadError}</p>}
          </div>

          {sourceFolderName && <ConfigPanel />}

          <div className="sidebar__search">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索笔记..."
            />
          </div>

          <div className="sidebar__list">
            <ul>
              {notes.map((note: Note) => (
                <NoteItem
                  key={note.name}
                  note={note}
                  isActive={note.name === activeNoteName}
                  onSelect={selectNote.bind(null, note.name)}
                  onRename={renameNote}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </aside>
  )
}

