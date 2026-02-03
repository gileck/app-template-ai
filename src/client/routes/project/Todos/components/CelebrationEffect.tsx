/**
 * Celebration Effect Component
 *
 * Renders confetti particles when a todo is completed.
 * Pure CSS implementation with no external libraries.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CLEANUP_DELAY } from '../animations';

interface CelebrationEffectProps {
    active: boolean;
    onComplete: () => void;
}

interface Particle {
    id: number;
    color: string;
    left: string;
    delay: string;
}

export function CelebrationEffect({ active, onComplete }: CelebrationEffectProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral animation particles
    const [particles, setParticles] = useState<Particle[]>([]);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral confetti colors from CSS variables
    const [confettiColors, setConfettiColors] = useState<string[]>([]);

    useEffect(() => {
        // Read semantic color tokens from CSS variables
        const styles = getComputedStyle(document.documentElement);
        const colors = [
            `hsl(${styles.getPropertyValue('--primary').trim()})`,
            `hsl(${styles.getPropertyValue('--secondary').trim()})`,
            `hsl(${styles.getPropertyValue('--success').trim()})`,
            `hsl(${styles.getPropertyValue('--warning').trim()})`,
            `hsl(${styles.getPropertyValue('--info').trim()})`,
        ];
        setConfettiColors(colors);
    }, []);

    useEffect(() => {
        if (active && confettiColors.length > 0) {
            // Generate confetti particles
            const newParticles: Particle[] = [];

            for (let i = 0; i < 20; i++) {
                newParticles.push({
                    id: i,
                    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                    left: `${Math.random() * 100}%`,
                    delay: `${Math.random() * 0.3}s`,
                });
            }

            setParticles(newParticles);

            // Clean up after animation completes
            const timeout = setTimeout(() => {
                setParticles([]);
                onComplete();
            }, CLEANUP_DELAY);

            return () => clearTimeout(timeout);
        }
    }, [active, confettiColors, onComplete]);

    if (!active || particles.length === 0) return null;

    // Render confetti particles at the root level for proper z-index
    return createPortal(
        <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="todo-confetti-particle absolute top-1/2 left-1/2"
                    style={{
                        backgroundColor: particle.color,
                        left: particle.left,
                        animationDelay: particle.delay,
                    }}
                />
            ))}
        </div>,
        document.body
    );
}
