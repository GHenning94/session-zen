import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  RemoveFormatting
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimpleRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const SimpleRichTextEditor = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  className
}: SimpleRichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value
      setIsInitialized(true)
    }
  }, [value, isInitialized])

  useEffect(() => {
    // Reset initialized state when value changes externally (e.g., when modal opens with new content)
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const handleLink = () => {
    const url = prompt('Digite a URL do link:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const handleHeading = (level: number) => {
    execCommand('formatBlock', `h${level}`)
  }

  const toolbarButtons = [
    { icon: Heading1, action: () => handleHeading(1), title: 'Título 1' },
    { icon: Heading2, action: () => handleHeading(2), title: 'Título 2' },
    { icon: Heading3, action: () => handleHeading(3), title: 'Título 3' },
    { icon: Bold, action: () => execCommand('bold'), title: 'Negrito' },
    { icon: Italic, action: () => execCommand('italic'), title: 'Itálico' },
    { icon: Underline, action: () => execCommand('underline'), title: 'Sublinhado' },
    { icon: List, action: () => execCommand('insertUnorderedList'), title: 'Lista' },
    { icon: ListOrdered, action: () => execCommand('insertOrderedList'), title: 'Lista numerada' },
    { icon: LinkIcon, action: handleLink, title: 'Link' },
    { icon: RemoveFormatting, action: () => execCommand('removeFormat'), title: 'Limpar formatação' },
  ]

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
        {toolbarButtons.map((btn, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            onClick={btn.action}
            title={btn.title}
            className="h-8 w-8 p-0"
          >
            <btn.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className={cn(
          "min-h-[200px] max-h-[400px] overflow-y-auto p-4 focus:outline-none",
          "prose prose-sm dark:prose-invert max-w-none",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none"
        )}
        data-placeholder={placeholder}
        style={{
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word'
        }}
      />
    </div>
  )
}
