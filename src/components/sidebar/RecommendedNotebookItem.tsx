import classNames from 'classnames'
import { useCallback } from 'react'
import type { RecommendedNotebook } from './NotesSidebar'
import type { Note } from '../../noteStore/note/types'
import { extractTitleFromContent } from '../../noteStore/note/contentUtils'
import './NotebookItem.css'
import './noteItem.css'

interface RecommendedNotebookItemProps {
  notebook: RecommendedNotebook
  isActive: boolean
  isBusy: boolean
  notes: Note[]
  activeNoteName: string | null
  onSelectNote: (noteName: string) => void
  onSelect: (url: string) => void
}

export function RecommendedNotebookItem({
  notebook,
  isActive,
  isBusy,
  notes,
  activeNoteName,
  onSelectNote,
  onSelect,
}: RecommendedNotebookItemProps) {
  const handleOpen = useCallback(() => {
    onSelect(notebook.url)
  }, [notebook.url, onSelect])

  return (
    <div className={classNames('sidebar__notebook', 'is-recommended', { 'is-active': isActive })}>
      <div className="sidebar__notebook-header">
        <button
          className="sidebar__notebook-toggle"
          onClick={handleOpen}
          type="button"
          disabled={isBusy}
        >
          <span className={classNames('sidebar__notebook-chevron', { 'is-open': isActive })}>
            ▸
          </span>
          <div className="sidebar__notebook-info">
            <span className="sidebar__notebook-name">{notebook.label}</span>
            <span className="sidebar__notebook-config">GitHub</span>
          </div>
        </button>
      </div>
      {isActive && (
        <div className="sidebar__notebook-notes sidebar__notebook-notes--github">
          {notes.length === 0 && isBusy ? (
            <div className="sidebar__notebook-empty">加载中…</div>
          ) : (
            <ul>
              {notes.map((note) => (
                <li key={note.name}>
                  <div
                    className={classNames('sidebar__note', {
                      'is-active': note.name === activeNoteName,
                    })}
                  >
                    <button className="sidebar__note-body" onClick={() => onSelectNote(note.name)}>
                      <span className="sidebar__note-filename">{note.name}</span>
                      <span className="sidebar__note-title">
                        {extractTitleFromContent(note.content)}
                      </span>
                    </button>
                  </div>
                </li>
              ))}
              {notes.length === 0 && (
                <li className="sidebar__notebook-empty">暂无笔记</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

