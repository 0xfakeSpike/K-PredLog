import classNames from 'classnames'
import type { NotebookInfo } from '../../noteStore/hooks/useNotebookListManager'
import type { Note, NoteName } from '../../noteStore/note/types'
import { NoteItem } from './noteItem'
import './NotebookItem.css'

interface NotebookItemProps {
  notebook: NotebookInfo
  isActive: boolean
  isExpanded: boolean
  notes: Note[]
  activeNoteName: string | null
  isBusy: boolean
  onToggle: () => void
  onCreateNote: () => void | Promise<void>
  onSelectNote: (noteName: string) => void
  onRenameNote: (oldName: NoteName, newName: NoteName) => Promise<void>
}

export function NotebookItem({
  notebook,
  isActive,
  isExpanded,
  notes,
  activeNoteName,
  isBusy,
  onToggle,
  onCreateNote,
  onSelectNote,
  onRenameNote,
}: NotebookItemProps) {

  return (
    <div className={classNames('sidebar__notebook', { 'is-active': isActive })}>
      <div className="sidebar__notebook-header">
        <button className="sidebar__notebook-toggle" onClick={onToggle} type="button">
          <span className={classNames('sidebar__notebook-chevron', { 'is-open': isExpanded })}>
            ▸
          </span>
          <div className="sidebar__notebook-info">
            <span className="sidebar__notebook-name">{notebook.name}</span>
          </div>
        </button>
        <button
          className="sidebar__notebook-add"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onCreateNote()
          }}
          disabled={isBusy}
          title="在该笔记本下创建笔记"
        >
          +
        </button>
      </div>
      {isExpanded && (
        <div className="sidebar__notebook-notes">
          <ul>
            {notes.map((note) => (
              <NoteItem
                key={note.name}
                note={note}
                isActive={note.name === activeNoteName}
                onSelect={() => onSelectNote(note.name)}
                onRename={onRenameNote}
              />
            ))}
            {notes.length === 0 && (
              <li className="sidebar__notebook-empty">暂无笔记</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

