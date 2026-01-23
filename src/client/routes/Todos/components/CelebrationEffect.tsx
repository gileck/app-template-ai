/**
 * Celebration Effect Component
 *
 * Renders confetti particles when a todo is completed.
 * Pure CSS implementation with no external libraries.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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

const CONFETTI_COLORS = [
    'hsl(221, 83%, 53%)',    // primary
    'hsl(262, 83%, 58%)',    // secondary
    'hsl(142, 71%, 45%)',    // success
    'hsl(48, 96%, 53%)',     // warning
    'hsl(217, 91%, 60%)',    // info
];

const DARK_CONFETTI_COLORS = [
    'hsl(217, 91%, 60%)',    // primary (dark)
    'hsl(263, 89%, 67%)',    // secondary (dark)
    'hsl(142, 71%, 45%)',    // success
    'hsl(48, 96%, 53%)',     // warning
    'hsl(217, 91%, 60%)',    // info
];

export function CelebrationEffect({ active, onComplete }: CelebrationEffectProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral animation particles
    const [particles, setParticles] = useState<Particle[]>([]);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral theme detection
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check if dark mode is active
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    useEffect(() => {
        if (active) {
            // Generate confetti particles
            const colors = isDark ? DARK_CONFETTI_COLORS : CONFETTI_COLORS;
            const newParticles: Particle[] = [];

            for (let i = 0; i < 20; i++) {
                newParticles.push({
                    id: i,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    left: `${Math.random() * 100}%`,
                    delay: `${Math.random() * 0.3}s`,
                });
            }

            setParticles(newParticles);

            // Clean up after animation completes
            const timeout = setTimeout(() => {
                setParticles([]);
                onComplete();
            }, 1800);

            return () => clearTimeout(timeout);
        }
    }, [active, isDark, onComplete]);

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
