import { forwardRef, useEffect } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, placeholder, className }) => {
    const modules = {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['link'],
        ['clean']
      ],
    }

    const formats = [
      'header', 'bold', 'italic', 'underline', 'strike',
      'list', 'bullet', 'indent', 'link'
    ]

    useEffect(() => {
      // Inject global styles for ReactQuill
      const style = document.createElement('style')
      style.textContent = `
        .ql-editor {
          word-wrap: break-word !important;
          word-break: break-word !important;
          white-space: pre-wrap !important;
          overflow-wrap: break-word !important;
          max-height: 320px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .ql-container {
          max-height: 400px !important;
          overflow: hidden !important;
        }
        .ql-toolbar {
          border-top: 1px solid #ccc !important;
          border-left: 1px solid #ccc !important;
          border-right: 1px solid #ccc !important;
          border-bottom: none !important;
          border-radius: 6px 6px 0 0 !important;
        }
        .ql-container.ql-snow {
          border-top: none !important;
          border-bottom: 1px solid #ccc !important;
          border-left: 1px solid #ccc !important;
          border-right: 1px solid #ccc !important;
          border-radius: 0 0 6px 6px !important;
        }
      `
      document.head.appendChild(style)
      
      return () => {
        document.head.removeChild(style)
      }
    }, [])

    return (
      <div className={className}>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          style={{
            backgroundColor: 'white',
            borderRadius: '6px',
            minHeight: '200px',
            maxHeight: '400px',
            width: '100%',
            overflow: 'hidden'
          }}
          bounds={'.modal-content'}
        />
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor