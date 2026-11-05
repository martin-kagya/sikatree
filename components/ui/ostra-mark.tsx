type OstraMarkProps = {
  className?: string;
};

/**
 * The Ostra mark (shell + pearl). The shell arcs are drawn with `currentColor`
 * so the mark stays legible on both light and dark surfaces, while the pearl
 * keeps its brand green gradient.
 */
export function OstraMark({ className }: OstraMarkProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label="Ostra"
      shapeRendering="geometricPrecision"
      className={className}
    >
      <defs>
        <radialGradient id="ostra-mark-pearl" cx="0.32" cy="0.26" r="0.85">
          <stop offset="0" stopColor="#95D968" />
          <stop offset="0.55" stopColor="#74C55B" />
          <stop offset="1" stopColor="#58AD4A" />
        </radialGradient>
      </defs>
      <path
        d="M 20.11 54.87 A 44 44 0 0 0 107.89 54.87"
        fill="none"
        stroke="currentColor"
        strokeWidth="7.9"
        strokeLinecap="round"
      />
      <path
        d="M 36.77 53.7 A 27.3 27.3 0 0 0 91.23 53.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <path
        d="M 42 50 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0 Z M 54.35 42.52 a 3.4 3.4 0 1 0 6.8 0 a 3.4 3.4 0 1 0 -6.8 0 Z"
        fill="url(#ostra-mark-pearl)"
        fillRule="evenodd"
      />
    </svg>
  );
}
