/**
 * Bug Report Dialog
 * 
 * Modal dialog for users to report bugs with description and optional screenshot.
 */

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';
import { Label } from '@/client/components/ui/label';
import { Input } from '@/client/components/ui/input';
import { Bug, Upload, X, Send, Loader2, Gauge } from 'lucide-react';
import { useBugReportStore } from './store';
import { useSubmitBugReport } from './hooks';
import { toast } from '@/client/components/ui/toast';
import type { BugCategory } from './types';

export function BugReportDialog() {
    const isOpen = useBugReportStore((state) => state.isOpen);
    const closeDialog = useBugReportStore((state) => state.closeDialog);
    
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral form state
    const [category, setCategory] = useState<BugCategory>('bug');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral form state
    const [description, setDescription] = useState('');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral form state
    const [screenshot, setScreenshot] = useState<string | null>(null);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral form state
    const [screenshotName, setScreenshotName] = useState<string>('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const submitMutation = useSubmitBugReport();

    const handleClose = () => {
        setCategory('bug');
        setDescription('');
        setScreenshot(null);
        setScreenshotName('');
        closeDialog();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setScreenshot(event.target?.result as string);
            setScreenshotName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveScreenshot = () => {
        setScreenshot(null);
        setScreenshotName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!description.trim()) {
            toast.error('Please describe the bug');
            return;
        }

        try {
            await submitMutation.mutateAsync({
                description: description.trim(),
                screenshot: screenshot || undefined,
                category,
            });
            
            handleClose();
            const message = category === 'performance' 
                ? 'Performance report submitted with timing data. Thank you!'
                : 'Bug report submitted successfully. Thank you!';
            toast.success(message);
        } catch {
            toast.error('Failed to submit report. Please try again.');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bug className="h-5 w-5 text-red-500" />
                        Report an Issue
                    </DialogTitle>
                    <DialogDescription>
                        Describe the issue you encountered. Your session logs and browser info will be included automatically.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category Selection */}
                    <div className="space-y-2">
                        <Label>Report Type</Label>
                        <div className="flex rounded-md border">
                            <button
                                type="button"
                                onClick={() => setCategory('bug')}
                                disabled={submitMutation.isPending}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-l-md px-3 py-2 text-sm transition-colors ${
                                    category === 'bug'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background hover:bg-muted'
                                }`}
                            >
                                <Bug className="h-4 w-4" />
                                Bug
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategory('performance')}
                                disabled={submitMutation.isPending}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-r-md px-3 py-2 text-sm transition-colors ${
                                    category === 'performance'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background hover:bg-muted'
                                }`}
                            >
                                <Gauge className="h-4 w-4" />
                                Performance
                            </button>
                        </div>
                        {category === 'performance' && (
                            <p className="text-xs text-muted-foreground">
                                Performance reports include all request timings and performance metrics.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            placeholder={category === 'performance' 
                                ? "Describe the performance issue. What was slow?" 
                                : "What happened? What were you trying to do?"}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={submitMutation.isPending}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Screenshot (optional)</Label>
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={submitMutation.isPending}
                        />
                        
                        {screenshot ? (
                            <div className="relative rounded-md border p-2">
                                <div className="flex items-center gap-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- base64 user-uploaded screenshot */}
                                    <img 
                                        src={screenshot} 
                                        alt="Screenshot preview" 
                                        className="h-16 w-16 rounded object-cover"
                                    />
                                    <span className="flex-1 truncate text-sm text-muted-foreground">
                                        {screenshotName}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleRemoveScreenshot}
                                        disabled={submitMutation.isPending}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={submitMutation.isPending}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Screenshot
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={handleClose}
                            disabled={submitMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={submitMutation.isPending || !description.trim()}
                        >
                            {submitMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Report
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

