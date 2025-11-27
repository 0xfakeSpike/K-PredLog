import { NotesProvider } from './noteStore/notes/NotesProvider'
import { NotesSidebar } from './components/sidebar/NotesSidebar'
import { NoteEditorPane } from './components/editor/NoteEditorPane'
import './App.css'

function App() {
  return (
    <NotesProvider>
        <div className="app-shell">
          <NotesSidebar />
          <NoteEditorPane />
        </div>
    </NotesProvider>
  )
}

export default App
