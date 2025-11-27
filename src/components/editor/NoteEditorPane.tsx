import { useNotesContext } from '../../noteStore/hooks/useNotesContext'
import { DIRECTION_OPTIONS, INTERVAL_OPTIONS } from '../../noteStore/note/noteOptions'
import { RichTextEditor } from './RichTextEditor'
import { KlineManager } from '../chart/KlineManager'
import './NoteEditorPane.css'

export function NoteEditorPane() {
  const { activeNote, updateNote, deleteNote, saveNoteToFolder, sourceFolderName, isLoading } =
    useNotesContext()

  return (
    <section className="editor-pane">
      <div className="editor-pane__surface">
        <div className="editor-pane__stack">
          <div className="editor-pane__data-card">
            <KlineManager />
          </div>

          {activeNote ? (
            <>
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
                    周期：
                    <strong>
                      {activeNote.interval
                        ? `${Math.round(activeNote.interval / (24 * 60 * 60))}天`
                        : '未设置'}
                    </strong>
                    {' · '}
                    评分：<strong>{activeNote.score ?? 0}</strong>
                  </p>
                </div>
              </div>

              <div className="editor-pane__content-card">
                <div className="editor-pane__content-header">
                  <div className="editor-pane__content-title">
                    <span>笔记内容</span>
                  </div>
                  <div className="editor-pane__actions">
                    <button
                      className="editor-pane__ghost-btn"
                      onClick={() => deleteNote(activeNote.name)}
                    >
                      删除
                    </button>
                    <button
                      className="editor-pane__primary-btn"
                      onClick={() => saveNoteToFolder(activeNote.name)}
                      disabled={!sourceFolderName || isLoading}
                    >
                      {sourceFolderName ? '保存' : '选择目录以保存'}
                    </button>
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
            </>
          ) : (
            <div className="editor-pane__empty-card">
              <div className="empty-state">
                <h2>暂无笔记</h2>
                <p>从左侧选择或新建一篇笔记开始编辑。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

