/**
 * FilterChip Component
 *
 * Individual filter chip that can be toggled on/off
 */

import { Badge } from '@/client/components/ui/badge';
import { X } from 'lucide-react';

interface FilterChipProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
    return (
        <Badge
            variant={active ? 'default' : 'outline'}
            className={`cursor-pointer transition-colors ${active ? 'gap-1 pr-1' : ''}`}
            onClick={onClick}
        >
            {label}
            {active && <X className="h-3 w-3 ml-0.5" />}
        </Badge>
    );
}
