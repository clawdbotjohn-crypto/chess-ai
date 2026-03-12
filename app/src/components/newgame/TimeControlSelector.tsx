import { Clock } from 'lucide-react'
import type { TimeControl } from '../../engine/types'
import { TIME_CONTROLS } from '../../engine/types'

interface TimeControlSelectorProps {
  timeControl: TimeControl
  onTimeControlChange: (tc: TimeControl) => void
}

export function TimeControlSelector({ timeControl, onTimeControlChange }: TimeControlSelectorProps) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
        <Clock className="w-4 h-4" /> Time Control
      </p>
      <div className="grid grid-cols-4 gap-2">
        {TIME_CONTROLS.map((tc) => (
          <button
            key={tc.label}
            onClick={() => onTimeControlChange(tc)}
            className={`py-2 px-2 rounded-lg text-center transition-all border-2 ${
              timeControl.label === tc.label
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <div className="text-xs font-semibold text-white">{tc.label.split(' ')[0]}</div>
            {tc.type !== 'none' && (
              <div className="text-[10px] text-slate-400">{tc.label.split(' ').slice(1).join(' ')}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
