/**
 * Question Card Component
 *
 * Displays a single clarification question with radio options.
 * Supports a recommended option highlight and "Other" custom input.
 */

import { useState } from 'react';
import type { ParsedQuestion, QuestionAnswer } from '@/apis/clarification/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/card';
import { Label } from '@/client/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/client/components/ui/radio-group';
import { Textarea } from '@/client/components/ui/textarea';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/client/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface QuestionCardProps {
    question: ParsedQuestion;
    questionIndex: number;
    answer: QuestionAnswer | undefined;
    onAnswerChange: (answer: QuestionAnswer) => void;
}

export function QuestionCard({
    question,
    questionIndex,
    answer,
    onAnswerChange,
}: QuestionCardProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI state for collapsible
    const [contextOpen, setContextOpen] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral form state for textarea input
    const [otherText, setOtherText] = useState(answer?.customText || '');

    const selectedValue = answer?.selectedOption || '';

    const handleOptionChange = (value: string) => {
        if (value === 'Other') {
            onAnswerChange({
                questionIndex,
                selectedOption: 'Other',
                customText: otherText,
            });
        } else {
            onAnswerChange({
                questionIndex,
                selectedOption: value,
            });
        }
    };

    const handleOtherTextChange = (text: string) => {
        setOtherText(text);
        if (selectedValue === 'Other') {
            onAnswerChange({
                questionIndex,
                selectedOption: 'Other',
                customText: text,
            });
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                {/* Context (collapsible) */}
                {question.context && (
                    <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            {contextOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span>Context</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                            {question.context}
                        </CollapsibleContent>
                    </Collapsible>
                )}

                {/* Question */}
                <CardTitle className="text-base leading-relaxed pt-2">
                    {question.question}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Options */}
                <RadioGroup value={selectedValue} onValueChange={handleOptionChange}>
                    {question.options.map((option, optionIndex) => (
                        <div
                            key={optionIndex}
                            className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${
                                selectedValue === option.label
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/50'
                            }`}
                        >
                            <RadioGroupItem
                                value={option.label}
                                id={`q${questionIndex}-opt${optionIndex}`}
                                className="mt-0.5"
                            />
                            <Label
                                htmlFor={`q${questionIndex}-opt${optionIndex}`}
                                className="flex-1 cursor-pointer space-y-1"
                            >
                                <div className="flex items-center gap-2">
                                    <span>{option.emoji}</span>
                                    <span className="font-medium">{option.label}</span>
                                    {option.isRecommended && (
                                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                            Recommended
                                        </span>
                                    )}
                                </div>
                                {option.bullets.length > 0 && (
                                    <ul className="text-sm text-muted-foreground pl-6 space-y-0.5">
                                        {option.bullets.map((bullet, bulletIndex) => (
                                            <li key={bulletIndex} className="list-disc">
                                                {bullet}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Label>
                        </div>
                    ))}

                    {/* Other option */}
                    <div
                        className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${
                            selectedValue === 'Other'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-muted-foreground/50'
                        }`}
                    >
                        <RadioGroupItem
                            value="Other"
                            id={`q${questionIndex}-other`}
                            className="mt-0.5"
                        />
                        <Label
                            htmlFor={`q${questionIndex}-other`}
                            className="flex-1 cursor-pointer space-y-2"
                        >
                            <span className="font-medium">Other</span>
                            {selectedValue === 'Other' && (
                                <Textarea
                                    placeholder="Enter your custom response..."
                                    value={otherText}
                                    onChange={(e) => handleOtherTextChange(e.target.value)}
                                    className="min-h-[80px]"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                        </Label>
                    </div>
                </RadioGroup>

                {/* Recommendation banner */}
                {question.recommendation && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md p-3 text-sm">
                        <div className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                            💡 Agent&apos;s Recommendation
                        </div>
                        <div className="text-blue-600 dark:text-blue-300">
                            {question.recommendation}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
