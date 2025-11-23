import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import type { JSONContent } from '@tiptap/core'
import classNames from 'classnames'
import type { Note } from '../../noteStore/note/types'
import './RichTextEditor.css'

type Props = {
  note: Note
  onContentChange: (content: JSONContent) => void
}

export function RichTextEditor({ note, onContentChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      Blockquote,
      HorizontalRule,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        protocols: ['https', 'http'],
      }),
      Placeholder.configure({
        placeholder: '记录你的思考、策略与执行计划…',
      }),
    ],
    content: note.content,
    autofocus: 'start',
    editorProps: {
      attributes: {
        class: 'ProseMirror editor__content',
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON()
      onContentChange(json)
    },
  })

  useEffect(() => {
    if (!editor) return
    // 当笔记切换时，更新编辑器内容
    const currentContent = editor.getJSON()
    const noteContentStr = JSON.stringify(note.content)
    const currentContentStr = JSON.stringify(currentContent)
    
    // 只有当内容真正改变时才更新，避免不必要的重新渲染
    if (noteContentStr !== currentContentStr) {
      editor.commands.setContent(note.content, { emitUpdate: false })
    }
  }, [editor, note.name, note.content])

  return (
    <div className={classNames('editor', { 'editor--focused': editor?.isFocused })}>
      {editor && (
        <div className="editor__toolbar">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
            B
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
            I
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
          >
            {'</>'}
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

type ToolbarButtonProps = {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}

function ToolbarButton({ children, onClick, active }: ToolbarButtonProps) {
  return (
    <button className={classNames('editor__btn', { 'is-active': active })} type="button" onClick={onClick}>
      {children}
    </button>
  )
}

