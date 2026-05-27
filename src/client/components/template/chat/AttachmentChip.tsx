/**
 * AttachmentChip + AttachmentSlot
 *
 * Composer-state chip for in-flight upload UI. Shows a tiny image
 * preview (for images) or a file icon (for everything else), the
 * filename, an inline upload spinner, and an optional remove button.
 * Failed uploads render in destructive styling.
 *
 * For display-only persisted attachments (no remove, no spinner), use
 * `FilePreview` instead.
 *
 * The `AttachmentSlot` shape is intentionally generic enough that any
 * feature with a file-upload composer (chat input, bug-report form,
 * profile picker) can drive it from local state.
 */

import { Loader2, X, File as FileIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/client/lib/utils';

export interface AttachmentSlot {
    /** Local-only id for keying + removal. Caller-supplied so they can
     *  correlate with their own upload mutation. */
    id: string;
    name: string;
    contentType: string;
    status: 'uploading' | 'uploaded' | 'failed';
    /** Failure reason, when status is 'failed'. */
    error?: string;
    /** Final public URL once uploaded. */
    url?: string;
    /** Server-reported byte size. Populated alongside `url`. */
    size?: number;
    /** Local blob URL (`URL.createObjectURL(file)`) for instant image
     *  preview while the upload is in flight. The caller is
     *  responsible for revoking it. */
    previewUrl?: string;
}

export interface AttachmentChipProps {
    attachment: AttachmentSlot;
    /** When provided, renders the × button that calls back. Pass
     *  `undefined` for read-only chips. */
    onRemove?: () => void;
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
    const isImage = attachment.contentType.startsWith('image/');
    const isFailed = attachment.status === 'failed';
    const isUploading = attachment.status === 'uploading';
    const displayUrl = attachment.previewUrl || attachment.url;

    return (
        <div
            className={cn(
                'group relative flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs',
                isFailed && 'border-destructive/40 bg-destructive/5'
            )}
            title={attachment.error || attachment.name}
        >
            {isImage && displayUrl ? (
                <img
                    src={displayUrl}
                    alt={attachment.name}
                    className="h-8 w-8 rounded object-cover"
                />
            ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                    {isFailed ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            )}
            <span className="max-w-[160px] truncate">{attachment.name}</span>
            {isUploading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Remove attachment"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

