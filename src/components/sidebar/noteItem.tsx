import { useState, useEffect, useCallback } from 'react'
import classNames from 'classnames'
import type { Note, NoteName } from '../../noteStore/note/types'
import { extractTitleFromContent } from '../../noteStore/note/contentUtils'
import './noteItem.css'

interface NoteItemProps {
  note: Note
  isActive: boolean
  onSelect: () => void
  onRename: (oldName: NoteName, newName: NoteName) => Promise<void>
}

export function NoteItem({ note, isActive, onSelect, onRename }: NoteItemProps) {
  const [isEditingFilename, setIsEditingFilename] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  
  const [filenameValue, setFilenameValue] = useState(note.name)
  
  // 当 note 改变时，同步文件名（仅在非编辑状态下）
  useEffect(() => {
    if (!isEditingFilename) {
      setFilenameValue(note.name)
    }
  }, [note.name, isEditingFilename])

  const handleFilenameBlur = useCallback(async () => {
    setIsEditingFilename(false)
    setRenameError(null)
    
    // 如果名称没有变化，直接返回
    if (filenameValue === note.name) {
      return
    }
    
    // 使用通过 props 传入的 renameNote 方法（包含验证和冲突检查）
    try {
      await onRename(note.name, filenameValue)
      setRenameError(null)
    } catch (error) {
      // 恢复原值
      setFilenameValue(note.name)
      setRenameError(error instanceof Error ? error.message : '重命名失败，请检查权限后重试')
    }
  }, [filenameValue, note.name, onRename])

  const handleFilenameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      // 恢复原值并取消编辑
      setFilenameValue(note.name)
      setIsEditingFilename(false)
      setRenameError(null)
    }
  }, [note.name])

  const handleFilenameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilenameValue(e.target.value)
    setRenameError(null)
  }, [])

  const handleEditClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setIsEditingFilename(true)
  }, [])

  return (
    <li>
      <div className={classNames('sidebar__note', { 'is-active': isActive })}>
        {isEditingFilename ? (
          <div className="sidebar__note-rename-wrapper">
            <input
              type="text"
              className="sidebar__note-filename-input"
              value={filenameValue}
              onChange={handleFilenameChange}
              onBlur={handleFilenameBlur}
              onKeyDown={handleFilenameKeyDown}
              autoFocus
              placeholder="YYYY-MM-DD"
            />
            {renameError && (
              <div className="sidebar__note-rename-error" title={renameError}>
                {renameError}
              </div>
            )}
          </div>
        ) : (
          <div className="sidebar__note-content">
            <div className="sidebar__note-header">
              <span className="sidebar__note-filename">{filenameValue}</span>
              <button
                className="sidebar__note-edit-btn"
                onClick={handleEditClick}
                title="修改日期"
              >
                ✏️
              </button>
            </div>
            <button
              className="sidebar__note-body"
              onClick={onSelect}
            >
              <span className="sidebar__note-title">{extractTitleFromContent(note.content)}</span>
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

