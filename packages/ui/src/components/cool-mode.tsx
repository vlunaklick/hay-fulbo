"use client";

import * as React from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  angle: number;
  scale: number;
  emoji: string;
};

export function CoolMode({
  children,
  emojis = ["⚽", "🥅", "👟", "🏆"],
}: {
  children: React.ReactNode;
  emojis?: string[];
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [particles, setParticles] = React.useState<Particle[]>([]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const particle: Particle = {
        id: Date.now() + Math.random(),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        angle: Math.random() * 360,
        scale: 0.5 + Math.random(),
        emoji: emojis[Math.floor(Math.random() * emojis.length)] ?? emojis[0] ?? "⚽",
      };
      setParticles((current) => [...current, particle]);
      setTimeout(() => {
        setParticles((current) => current.filter((item) => item.id !== particle.id));
      }, 1200);
    },
    [emojis],
  );

  return (
    <div ref={ref} className="relative" onClick={handleClick}>
      {children}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <span
            key={particle.id}
            aria-hidden="true"
            className="animate-cool-particle absolute select-none"
            style={{
              left: particle.x,
              top: particle.y,
              fontSize: `${particle.scale * 1.5}rem`,
              transform: `rotate(${particle.angle}deg)`,
            }}
          >
            {particle.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
