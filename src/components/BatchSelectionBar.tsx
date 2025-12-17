import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CheckSquare, Square, Trash2, Edit, ChevronDown, X } from "lucide-react"

interface BatchSelectionBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onBatchDelete?: () => void
  onBatchEdit?: () => void
  onBatchStatusChange?: (status: string) => void
  showDelete?: boolean
  showEdit?: boolean
  showStatusChange?: boolean
  statusOptions?: { value: string; label: string }[]
  editLabel?: string
  deleteLabel?: string
}

export function BatchSelectionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBatchDelete,
  onBatchEdit,
  onBatchStatusChange,
  showDelete = false,
  showEdit = false,
  showStatusChange = false,
  statusOptions = [],
  editLabel = "Editar selecionados",
  deleteLabel = "Excluir selecionados"
}: BatchSelectionBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status)
    setStatusDialogOpen(true)
  }

  const handleStatusConfirm = () => {
    if (selectedStatus && onBatchStatusChange) {
      onBatchStatusChange(selectedStatus)
    }
    setStatusDialogOpen(false)
    setSelectedStatus(null)
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
          >
            {selectedCount === totalCount ? (
              <CheckSquare className="w-4 h-4 mr-1" />
            ) : (
              <Square className="w-4 h-4 mr-1" />
            )}
            {selectedCount === totalCount ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>

          {selectedCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Badge variant="secondary">
                {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            </>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            {showStatusChange && statusOptions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Alterar status
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {statusOptions.map((option) => (
                    <DropdownMenuItem 
                      key={option.value}
                      onClick={() => handleStatusClick(option.value)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {showEdit && onBatchEdit && (
              <Button variant="outline" size="sm" onClick={onBatchEdit}>
                <Edit className="w-4 h-4 mr-1" />
                {editLabel}
              </Button>
            )}

            {showDelete && onBatchDelete && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {deleteLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} item{selectedCount !== 1 ? 's' : ''}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onBatchDelete?.()
                setDeleteDialogOpen(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir {selectedCount} item{selectedCount !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação de alteração de status */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o status de {selectedCount} item{selectedCount !== 1 ? 's' : ''} para "{statusOptions.find(o => o.value === selectedStatus)?.label}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusConfirm}>
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface SelectableItemCheckboxProps {
  isSelected: boolean
  onSelect: () => void
  className?: string
}

export function SelectableItemCheckbox({ isSelected, onSelect, className }: SelectableItemCheckboxProps) {
  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={onSelect}
      onClick={(e) => e.stopPropagation()}
      className={className}
    />
  )
}
