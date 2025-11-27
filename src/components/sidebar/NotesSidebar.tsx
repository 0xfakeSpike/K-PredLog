import { useCallback, useEffect, useState } from 'react'
import { useNotesContext } from '../../noteStore/hooks/useNotesContext'
import { NotebookItem } from './NotebookItem'
import { RecommendedNotebookItem } from './RecommendedNotebookItem'
import './NotesSidebar.css'

export type RecommendedNotebook = {
  label: string
  url: string
}

export function NotesSidebar() {
  const {
    notes,
    activeNoteName,
    selectNote,
    createNote,
    renameNote,
    searchTerm,
    setSearchTerm,
    notebooks,
    activeNotebookName,
    selectNotebook,
    selectRootDirectory,
    createNotebook,
    loadGitHubNotebook,
    isLoading,
    loadError,
    selectKlineDataDirectory,
    klineDataDirectoryName,
  } = useNotesContext()

  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set())
  const [recommendedNotebooks, setRecommendedNotebooks] = useState<RecommendedNotebook[]>([])
  const [activeGitHubNotebook, setActiveGitHubNotebook] = useState<string | null>(null)
  const [isGitHubLoading, setIsGitHubLoading] = useState(false)

  const hasKlineDirectory = !!klineDataDirectoryName

  const handleOpenRecommendedNotebook = useCallback(
    (url: string) => {
      setActiveGitHubNotebook(url)
      setIsGitHubLoading(true)
      loadGitHubNotebook(url)
        .catch((error) => {
          console.error('Failed to open recommended notebook:', error)
        })
        .finally(() => {
          setIsGitHubLoading(false)
        })
    },
    [loadGitHubNotebook],
  )

  useEffect(() => {
    let cancelled = false
    const loadRecommended = async () => {
      try {
        const response = await fetch('recommended_notebooks.json', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to load recommended notebooks: ${response.status}`)
        }
        const data = (await response.json()) as RecommendedNotebook[]
        if (!cancelled) {
          setRecommendedNotebooks(data)
        }
      } catch (error) {
        console.warn('[NotesSidebar] Failed to load recommended notebooks:', error)
      }
    }

    loadRecommended()
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggleNotebook = (notebookName: string) => {
    setActiveGitHubNotebook(null)
    setExpandedNotebooks((prev) => {
      const next = new Set(prev)
      if (next.has(notebookName)) {
        next.delete(notebookName)
      } else {
        next.add(notebookName)
        selectNotebook(notebookName).catch((error) => {
          console.error('Failed to select notebook:', error)
        })
      }
      return next
    })
  }

  const handleCreateNoteForNotebook = async (notebookName: string) => {
    try {
      setActiveGitHubNotebook(null)
      setExpandedNotebooks((prev) => {
        const next = new Set(prev)
        next.add(notebookName)
        return next
      })

      if (activeNotebookName !== notebookName) {
        await selectNotebook(notebookName)
      }

      await createNote()
    } catch (error) {
      console.error('Failed to create note for notebook:', error)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__workspace">
        <div className="sidebar__workspace-avatar">📒</div>
        <div>
          <p className="sidebar__workspace-name">K 预记</p>
          <p className="sidebar__workspace-meta">By @0xfakeSpike</p>
        </div>
        <button
          className="sidebar__workspace-action"
          onClick={selectRootDirectory}
          disabled={isLoading}
          title="选择笔记本根目录"
        >
          …
        </button>
      </div>

      {!hasKlineDirectory ? (
        <div className="sidebar__empty">
          <p>请选择一个 K 线数据目录</p>
          <button onClick={selectKlineDataDirectory} disabled={isLoading}>
            {isLoading ? '选择中…' : '立即选择'}
          </button>
          {loadError && <p className="sidebar__error">{loadError}</p>}
        </div>
      ) : (
        <>
          <div className="sidebar__group sidebar__group--search">
            <input
              className="sidebar__search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="过滤笔记…"
              disabled={isLoading}
            />
          </div>
          <div className="sidebar__list-header">
            <span className="sidebar__group-label">本地</span>
            <button
              className="sidebar__primary-btn"
              onClick={createNotebook}
              disabled={isLoading}
            >
              {isLoading ? '创建中…' : '新建'}
            </button>
          </div>
          <div className="sidebar__notebook-list sidebar__notebook-list--local">
            {notebooks.map((notebook) => {
              const isExpanded = expandedNotebooks.has(notebook.name)
              const isActive = activeNotebookName === notebook.name
              const notebookNotes = isActive ? notes : []

              return (
                <NotebookItem
                  key={notebook.name}
                  notebook={notebook}
                  isActive={isActive}
                  isExpanded={isExpanded}
                  notes={notebookNotes}
                  activeNoteName={activeNoteName}
                  isBusy={isLoading}
                  onToggle={() => handleToggleNotebook(notebook.name)}
                  onCreateNote={() => handleCreateNoteForNotebook(notebook.name)}
                  onSelectNote={selectNote}
                  onRenameNote={renameNote}
                />
              )
            })}
            {notebooks.length === 0 && (
              <div className="sidebar__empty-state">
                <p>暂无笔记本</p>
                <p className="sidebar__empty-hint">点击“新建”创建第一个笔记本</p>
              </div>
            )}
            {loadError && <p className="sidebar__error">{loadError}</p>}
          </div>
          {recommendedNotebooks.length > 0 && (
            <div className="sidebar__recommended">
              <div className="sidebar__list-header">
                <span className="sidebar__group-label">GitHub 推荐</span>
              </div>
              <div className="sidebar__notebook-list">
                {recommendedNotebooks.map((item) => (
                  <RecommendedNotebookItem
                    key={item.url}
                    notebook={item}
                    isActive={activeGitHubNotebook === item.url}
                    isBusy={Boolean(
                      isGitHubLoading && activeGitHubNotebook === item.url,
                    )}
                    notes={activeGitHubNotebook === item.url && !isGitHubLoading ? notes : []}
                    activeNoteName={activeNoteName}
                    onSelectNote={selectNote}
                    onSelect={handleOpenRecommendedNotebook}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  )
}

