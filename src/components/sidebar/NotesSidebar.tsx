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
    createNotebook,
    isLoading,
    sourceFolderName,
    loadError,
  } = useNotesContext()

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <img src="/logo.png" alt="K 预记" className="sidebar__logo" />
          <div>
            <p className="sidebar__title">K 预记</p>
            <p className="sidebar__subtitle">行情笔记</p>
          </div>
        </div>
        <button className="sidebar__new" onClick={createNote}>
          + 新建笔记
        </button>
      </div>

      <div className="sidebar__folder">
        <div className="sidebar__folder-actions">
          <button
            className="sidebar__folder-btn"
            onClick={selectNotesFolder}
            disabled={isLoading}
          >
            {isLoading ? '读取文件夹…' : '选择笔记文件夹'}
          </button>
          <button
            className="sidebar__folder-btn sidebar__folder-btn--secondary"
            onClick={createNotebook}
            disabled={isLoading}
          >
            {isLoading ? '创建中…' : '+ 新建笔记本'}
          </button>
        </div>
        {sourceFolderName && (
          <p className="sidebar__folder-name">当前：{sourceFolderName}</p>
        )}
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
    </aside>
  )
}

