'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  /** Legacy prop retained so existing callers keep compiling; ignored in favor of variant. */
  confirmButtonClass?: string
  /** Visual variant for the confirm button. Defaults to the primary (blue) style. */
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

/**
 * Thin wrapper around shadcn Dialog with a standard "Title / message / Cancel +
 * Confirm" layout. Radix Dialog (via @base-ui) handles focus trap, Esc-close,
 * and tap-outside for free — the hand-rolled version had to reimplement all of
 * that and still didn't trap focus correctly.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isLoading) onConfirm()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
