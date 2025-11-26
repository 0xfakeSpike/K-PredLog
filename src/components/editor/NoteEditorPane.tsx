import { useNotesContext } from '../../noteStore/hooks/useNotesContext'
import { DIRECTION_OPTIONS, INTERVAL_OPTIONS } from '../../noteStore/note/noteOptions'
import { extractTitleFromContent } from '../../noteStore/note/contentUtils'
import { RichTextEditor } from './RichTextEditor'
import { KlineManager } from '../chart/KlineManager'
import './NoteEditorPane.css'

export function NoteEditorPane() {
  const {
    activeNote,
    updateNote,
    deleteNote,
    saveNoteToFolder,
    sourceFolderName,
    isLoading,
  } = useNotesContext()

  if (!activeNote) {
    return (
      <section className="editor-pane editor-pane--empty">
        <div className="empty-state">
          <h2>暂无笔记</h2>
          <p>从左侧选择或新建一篇笔记开始编辑。</p>
        </div>
      </section>
    )
  }

  return (
    <section className="editor-pane">
      <header className="editor-pane__header">
        <div>
          <h2 className="editor-pane__title">{extractTitleFromContent(activeNote.content)}</h2>
        </div>
        <div className="editor-pane__actions">
          <button
            className="editor-pane__save"
            onClick={() => saveNoteToFolder(activeNote.name)}
            disabled={!sourceFolderName || isLoading}
          >
            {sourceFolderName ? '保存到文件夹' : '选择文件夹以保存'}
          </button>
          <button
            className="editor-pane__delete"
            onClick={() => deleteNote(activeNote.name)}
            disabled={false}
          >
            删除
          </button>
        </div>
      </header>

      <div className="editor-pane__body">
        <KlineManager />
        <div className="editor-pane__meta-card">
          <div className="editor-pane__judgement">
            <div className="editor-pane__judgement-values">
              <label className="editor-pane__control">
                <span>多空方向</span>
                <select
                  value={activeNote.direction}
                  onChange={(event) =>
                    updateNote(activeNote.name, {
                      direction: event.target.value,
                    })
                  }
                >
                  <option value="">未设置</option>
                  {DIRECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="editor-pane__control">
                <span>判断周期</span>
                <select
                  value={activeNote.interval || ''}
                  onChange={(event) =>
                    updateNote(activeNote.name, {
                      interval: event.target.value ? Number(event.target.value) : 0,
                    })
                  }
                >
                  <option value="">未设置</option>
                  {INTERVAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="editor-pane__control">
                <span>评分</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  value={activeNote.score ?? 0}
                  onChange={(event) =>
                    updateNote(activeNote.name, {
                      score: event.target.value ? Number(event.target.value) : 0,
                    })
                  }
                />
              </label>
            </div>
            <p className="editor-pane__judgement-preview">
              当前方向：<strong>{activeNote.direction || '未设置'}</strong>
              {' · '}
              周期：<strong>{activeNote.interval ? `${Math.round(activeNote.interval / (24 * 60 * 60))}天` : '未设置'}</strong>
              {' · '}
              评分：<strong>{activeNote.score ?? 0}</strong>
            </p>
          </div>
        </div>
        <RichTextEditor
          note={activeNote}
          onContentChange={(content) =>
            updateNote(activeNote.name, {
              content,
            })
          }
        />
      </div>
    </section>
  )
}

