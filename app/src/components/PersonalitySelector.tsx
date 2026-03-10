import { useState } from 'react';
import type { EvaluationConfig } from '../engine/types';
import { PRESETS, PRESET_NAMES } from '../engine/presets';
import type { PresetName } from '../engine/presets';

const STORAGE_PREFIX = 'chess-ai-personality:';

function getSavedNames(): string[] {
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      names.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return names.sort();
}

function loadSavedConfig(name: string): EvaluationConfig | null {
  const raw = localStorage.getItem(STORAGE_PREFIX + name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EvaluationConfig;
  } catch {
    return null;
  }
}

interface PersonalitySelectorProps {
  label: string;
  color: string; // tailwind color class like 'blue' or 'red'
  config: EvaluationConfig;
  onChange: (config: EvaluationConfig, name: string) => void;
}

export function PersonalitySelector({ label, color, onChange }: PersonalitySelectorProps) {
  const [selectedName, setSelectedName] = useState<string>('Classical');
  const savedNames = getSavedNames();

  const handleSelect = (presetName: PresetName) => {
    const preset = PRESETS[presetName];
    setSelectedName(preset.label);
    onChange(structuredClone(preset.config), preset.label);
  };

  const handleLoadSaved = (name: string) => {
    const cfg = loadSavedConfig(name);
    if (cfg) {
      setSelectedName(name);
      onChange(cfg, name);
    }
  };

  const borderColor = color === 'blue' ? 'border-blue-500' : 'border-red-500';
  const bgActive = color === 'blue' ? 'bg-blue-600' : 'bg-red-600';

  return (
    <div className={`bg-slate-800 rounded-lg p-3 border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <span className="text-xs text-slate-400 font-mono">{selectedName}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESET_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => handleSelect(name)}
            title={PRESETS[name].description}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              selectedName === PRESETS[name].label
                ? `${bgActive} text-white`
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {PRESETS[name].label}
          </button>
        ))}
        {savedNames.map((name) => (
          <button
            key={`saved-${name}`}
            onClick={() => handleLoadSaved(name)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              selectedName === name
                ? `${bgActive} text-white`
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
