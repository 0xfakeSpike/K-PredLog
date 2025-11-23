import { NotesProvider } from './noteStore/notes/NotesProvider'
import { NoteConfigProvider } from './noteStore/noteConfig/NoteConfigProvider'
import { NotesSidebar } from './components/sidebar/NotesSidebar'
import { NoteEditorPane } from './components/editor/NoteEditorPane'
import './App.css'

function App() {
  return (
    <NotesProvider>
      <NoteConfigProvider>
        <div className="app-shell">
          <NotesSidebar />
          <NoteEditorPane />
        </div>
      </NoteConfigProvider>
    </NotesProvider>
  )
}

export default App
