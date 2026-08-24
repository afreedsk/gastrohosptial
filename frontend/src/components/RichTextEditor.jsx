import { useRef, useEffect } from 'react'
import { Bold, Italic, Underline } from 'lucide-react'

export default function RichTextEditor({ value, onChange, placeholder = '' }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const handleInput = () => {
    const html = editorRef.current.innerHTML
    // If empty, store as empty string
    onChange(html === '<br>' ? '' : html)
  }

  const execCommand = (command) => {
    document.execCommand(command, false, null)
    editorRef.current.focus()
    handleInput()
  }

  return (
    <div className="border border-border rounded-sm">
      <div className="flex gap-1 p-1 bg-gray-50 border-b border-border">
        <button type="button" onClick={() => execCommand('bold')} className="p-1 hover:bg-gray-200 rounded">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => execCommand('italic')} className="p-1 hover:bg-gray-200 rounded">
          <Italic size={16} />
        </button>
        <button type="button" onClick={() => execCommand('underline')} className="p-1 hover:bg-gray-200 rounded">
          <Underline size={16} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-2 min-h-[80px] focus:outline-none"
        onInput={handleInput}
        placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        suppressContentEditableWarning
      />
    </div>
  )
}