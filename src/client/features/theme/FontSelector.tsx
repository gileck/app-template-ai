import React from 'react';
import { Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/client/components/ui/select';
import { fontPresets } from './fonts';
import { useThemeStore } from './store';

/**
 * Font family selector dropdown
 */
export function FontSelector() {
    const currentFontId = useThemeStore((s) => s.settings.fontFamily);
    const setFontFamily = useThemeStore((s) => s.setFontFamily);

    return (
        <div className="space-y-2">
            <div>
                <h3 className="text-sm font-medium">Font Family</h3>
                <p className="text-xs text-muted-foreground">
                    Choose a font for the entire application
                </p>
            </div>

            <Select value={currentFontId} onValueChange={setFontFamily}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a font" />
                </SelectTrigger>
                <SelectContent>
                    {fontPresets.map((font) => (
                        <SelectItem 
                            key={font.id} 
                            value={font.id}
                            className="py-2"
                        >
                            <div className="flex items-center gap-2">
                                <span 
                                    className="text-sm"
                                    style={{ fontFamily: font.fontFamily }}
                                >
                                    {font.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {font.description}
                                </span>
                                {currentFontId === font.id && (
                                    <Check className="ml-auto h-4 w-4 text-primary" />
                                )}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Font preview */}
            <div className="rounded-md border border-border bg-card p-3">
                <p className="text-sm text-muted-foreground">Preview:</p>
                <p className="mt-1 text-lg">
                    The quick brown fox jumps over the lazy dog.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    0123456789 !@#$%^&*()
                </p>
            </div>
        </div>
    );
}

