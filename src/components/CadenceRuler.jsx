import { useMemo } from 'react'
import { analyzeBlock } from '../lib/cadence'

// Each "dot" in the stress pattern: filled = stressed, hollow = unstressed
function StressDot({ stressed }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full mr-0.5 ${
        stressed ? 'bg-teal' : 'bg-rule'
      }`}
    />
  )
}

export default function CadenceRuler({ text }) {
  const lines = useMemo(() => analyzeBlock(text || ''), [text])

  return (
    <div className="flex flex-col" aria-hidden="true">
      {lines.map((line, i) => {
        const isOffRhythm = Math.abs(line.deviation) >= 4 && line.syllables > 0
        const isEmpty = line.syllables === 0

        return (
          <div
            key={i}
            className="flex items-center gap-2 h-[48px] px-2"
          >
            {!isEmpty && (
              <>
                {/* Syllable count badge */}
                <span
                  className={`font-mono text-[10px] w-5 text-right flex-shrink-0 transition-colors ${
                    isOffRhythm ? 'text-rust font-medium' : 'text-ink-soft/60'
                  }`}
                >
                  {line.syllables}
                </span>

                {/* Stress pattern dots — show up to 16 */}
                <span className="flex items-center flex-shrink-0">
                  {line.stress.slice(0, 16).map((s, j) => (
                    <StressDot key={j} stressed={s === 1} />
                  ))}
                  {line.stress.length > 16 && (
                    <span className="text-[8px] text-rule ml-0.5">+{line.stress.length - 16}</span>
                  )}
                </span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
