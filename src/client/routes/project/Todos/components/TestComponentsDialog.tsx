import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/client/components/template/ui/dialog';
import { Button } from '@/client/components/template/ui/button';
import { Input } from '@/client/components/template/ui/input';
import { Textarea } from '@/client/components/template/ui/textarea';
import { Label } from '@/client/components/template/ui/label';
import { Switch } from '@/client/components/template/ui/switch';
import { Badge } from '@/client/components/template/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/client/components/template/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/client/components/template/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/client/components/template/ui/dropdown-menu';
import { ConfirmDialog } from '@/client/components/template/ui/confirm-dialog';
import { toast } from '@/client/components/template/ui/toast';
import { ChevronDown, FlaskConical } from 'lucide-react';

export function TestComponentsDialog() {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog open state
    const [open, setOpen] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral test input
    const [text, setText] = useState('');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral test textarea
    const [area, setArea] = useState('');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral test select
    const [selectValue, setSelectValue] = useState('one');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral test switch
    const [switchOn, setSwitchOn] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral test radio
    const [radio, setRadio] = useState('a');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral confirm dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <FlaskConical className="mr-1.5 h-4 w-4" />
                        Test components
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Component smoke test</DialogTitle>
                        <DialogDescription>
                            Verify focus, layout stability, and nested overlays inside a Dialog.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <section className="space-y-1.5">
                            <Label htmlFor="test-input">Input</Label>
                            <Input
                                id="test-input"
                                placeholder="Type here…"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                            />
                        </section>

                        <section className="space-y-1.5">
                            <Label htmlFor="test-textarea">Textarea</Label>
                            <Textarea
                                id="test-textarea"
                                placeholder="Multi-line input…"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                            />
                        </section>

                        <section className="space-y-1.5">
                            <Label htmlFor="test-select">Select</Label>
                            <Select value={selectValue} onValueChange={setSelectValue}>
                                <SelectTrigger id="test-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="one">One</SelectItem>
                                    <SelectItem value="two">Two</SelectItem>
                                    <SelectItem value="three">Three</SelectItem>
                                    <SelectItem value="four">A much longer option label</SelectItem>
                                </SelectContent>
                            </Select>
                        </section>

                        <section className="flex items-center justify-between gap-3">
                            <Label htmlFor="test-switch" className="cursor-pointer">
                                Switch
                            </Label>
                            <Switch id="test-switch" checked={switchOn} onCheckedChange={setSwitchOn} />
                        </section>

                        <section className="space-y-2">
                            <Label>Radio group</Label>
                            <RadioGroup value={radio} onValueChange={setRadio} className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem id="radio-a" value="a" />
                                    <Label htmlFor="radio-a" className="cursor-pointer">Alpha</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem id="radio-b" value="b" />
                                    <Label htmlFor="radio-b" className="cursor-pointer">Beta</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem id="radio-c" value="c" />
                                    <Label htmlFor="radio-c" className="cursor-pointer">Gamma</Label>
                                </div>
                            </RadioGroup>
                        </section>

                        <section className="space-y-2">
                            <Label>Dropdown menu</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between">
                                        Open menu
                                        <ChevronDown className="h-4 w-4 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuItem onSelect={() => toast.info('Menu item: Action 1')}>
                                        Action 1
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => toast.info('Menu item: Action 2')}>
                                        Action 2
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => toast.info('Menu item: Action 3')}>
                                        Action 3
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </section>

                        <section className="space-y-2">
                            <Label>Buttons</Label>
                            <div className="flex flex-wrap gap-2">
                                <Button>Default</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="destructive">Destructive</Button>
                            </div>
                        </section>

                        <section className="space-y-2">
                            <Label>Badges</Label>
                            <div className="flex flex-wrap gap-1.5">
                                <Badge>Default</Badge>
                                <Badge variant="secondary">Secondary</Badge>
                                <Badge variant="outline">Outline</Badge>
                                <Badge variant="destructive">Destructive</Badge>
                            </div>
                        </section>

                        <section className="space-y-2">
                            <Label>Nested overlays</Label>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
                                    Open confirm dialog
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => toast.success('Toast from inside dialog')}>
                                    Fire toast
                                </Button>
                            </div>
                        </section>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Nested confirm"
                description="This ConfirmDialog is opened from inside another Dialog."
                confirmText="OK"
                onConfirm={() => {
                    toast.success('Confirmed');
                    setConfirmOpen(false);
                }}
            />
        </>
    );
}
