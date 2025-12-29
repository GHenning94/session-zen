import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Eye } from 'lucide-react'
import DOMPurify from 'dompurify'

interface TextPreviewProps {
  content: string
  isHtml?: boolean
  title?: string
  className?: string
}

export function TextPreview({ content, isHtml = false, title = "Visualização Completa", className = "" }: TextPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Remove HTML tags for preview length calculation
  const stripHtml = (html: string) => {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }

  const plainText = isHtml ? stripHtml(content) : content
  const shouldShowPreview = plainText.length > 150 // Show preview if content is long

  return (
    <>
      <div className={`relative ${className}`}>
        {isHtml ? (
          <div 
            className="line-clamp-3 cursor-pointer hover:bg-accent/30 rounded p-1 -m-1 transition-colors"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
            onClick={() => setIsModalOpen(true)}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}
          />
        ) : (
          <div 
            className="line-clamp-3 cursor-pointer hover:bg-accent/30 rounded p-1 -m-1 transition-colors"
            onClick={() => setIsModalOpen(true)}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}
          >
            {content}
          </div>
        )}
        
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {isHtml ? (
              <div 
                className="prose prose-sm max-w-none whitespace-pre-wrap break-words overflow-wrap-anywhere"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {content}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}