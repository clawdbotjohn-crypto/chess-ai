import { useState } from 'react';
import { Crown, Crosshair, Shield, Swords, Search, Shuffle, Save, Brain, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import type { EvaluationConfig } from '../engine/types';
import { PRESETS, PRESET_NAMES } from '../engine/presets';
import type { PresetName } from '../engine/presets';

type GamePhase = 'opening' | 'middlegame' | 'endgame';
type OverridePhase = 'opening' | 'endgame';
type OverrideSection = 'positional' | 'kingSafety' | 'tactical';

interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  tooltip?: string;
}

const PIECE_VALUE_SLIDERS: SliderDef[] = [
  { key: 'pawn', label: 'Pawn', min: 50, max: 1000, step: 5, tooltip: 'Base value of a pawn in centipawns. Standard is 100.' },
  { key: 'knight', label: 'Knight', min: 200, max: 1000, step: 5, tooltip: 'Base value of a knight. Standard is ~300. Higher = AI values knights more.' },
  { key: 'bishop', label: 'Bishop', min: 200, max: 1000, step: 5, tooltip: 'Base value of a bishop. Standard is ~325. Slightly above knight due to long-range potential.' },
  { key: 'rook', label: 'Rook', min: 300, max: 1000, step: 5, tooltip: 'Base value of a rook. Standard is ~500.' },
  { key: 'queen', label: 'Queen', min: 600, max: 1000, step: 10, tooltip: 'Base value of the queen. Standard is ~900.' },
];

const POSITIONAL_SLIDERS: SliderDef[] = [
  { key: 'centerControl', label: 'Center Control', min: 0, max: 100, step: 1, tooltip: 'Bonus for placing pieces on central squares (d4, d5, e4, e5). Higher = AI fights harder for the center.' },
  { key: 'pawnAdvancement', label: 'Pawn Advancement', min: 0, max: 100, step: 1, tooltip: 'Bonus for pushing pawns forward. Higher = more aggressive pawn play.' },
  { key: 'mobility', label: 'Mobility', min: 0, max: 100, step: 1, tooltip: 'Bonus per legal move available. Higher = AI prefers positions with more options.' },
  { key: 'pawnStructure', label: 'Pawn Structure', min: 0, max: 100, step: 1, tooltip: 'Penalty for weak pawn structures (doubled pawns, isolated pawns). Higher = AI avoids structural weaknesses.' },
];

const KING_SAFETY_SLIDERS: SliderDef[] = [
  { key: 'castleBonus', label: 'Castle Bonus', min: 0, max: 200, step: 1, tooltip: 'Bonus for having castling rights. Higher = AI prioritizes castling.' },
  { key: 'pawnShield', label: 'Pawn Shield', min: 0, max: 200, step: 1, tooltip: 'Bonus for pawns protecting the castled king. Higher = AI keeps pawns in front of its king.' },
  { key: 'exposurePenalty', label: 'Exposure Penalty', min: 0, max: 200, step: 1, tooltip: 'Penalty when the king is on an open file or has few nearby defenders. Higher = AI avoids exposed king positions.' },
];

const DISABLED_SLIDER_KEYS = new Set<string>();

const TACTICAL_SLIDERS: SliderDef[] = [
  { key: 'attackWeight', label: 'Attack Weight', min: 0, max: 100, step: 1, tooltip: 'Bonus for attacking enemy pieces. Higher values make the AI seek aggressive piece placement targeting opponent pieces.' },
  { key: 'defenseWeight', label: 'Defense Weight', min: 0, max: 100, step: 1, tooltip: 'Bonus for defending own pieces. Higher values make the AI prioritize protecting its own pieces with mutual defense.' },
  { key: 'aggression', label: 'Aggression', min: 0, max: 100, step: 1, tooltip: 'General aggression factor. Higher = AI values checks and attacks more. Influences overall playing style.' },
];

const SEARCH_SLIDERS: SliderDef[] = [
  { key: 'depth', label: 'Search Depth', min: 1, max: 10, step: 1, tooltip: 'How many moves ahead the AI looks. Higher depths play much stronger but take longer.' },
];

const DEPTH_TIME_ESTIMATES: Record<number, string> = {
  1: 'instant',
  2: '~1ms',
  3: '~10ms',
  4: '~50ms',
  5: '~0.5s',
  6: '~2s',
  7: '~5s',
  8: '~10s',
  9: '~30s+',
  10: '~60s+',
};

const RANDOMNESS_SLIDERS: SliderDef[] = [
  { key: 'threshold', label: 'Randomness', min: 0, max: 500, step: 5, tooltip: 'Centipawn threshold for move selection. 0 = always plays the best move. Higher = picks from several good moves randomly. Makes the AI less predictable.' },
];

interface SectionProps {
  title: React.ReactNode;
  sliders: SliderDef[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

function Section({ title, sliders, values, onChange }: SectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-semibold text-slate-300 hover:text-white transition-colors py-1"
      >
        <span className="flex items-center gap-1">{title}</span>
        <span className="text-xs">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
      </button>
      {open && (
        <div className="mt-1 space-y-2 pl-1">
          {sliders.map((s) => {
            const isDisabled = DISABLED_SLIDER_KEYS.has(s.key);
            return (
            <div key={s.key} className={`flex items-center gap-2 group relative${isDisabled ? ' opacity-50' : ''}`}>
              <label className="text-xs text-slate-400 w-28 flex-shrink-0 truncate" title={s.tooltip || s.label}>
                {s.label}
                {isDisabled && <span className="text-[9px] text-amber-400/80 ml-0.5">(disabled)</span>}
                {s.tooltip && (
                  <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-600 text-[9px] text-slate-400 cursor-help hover:bg-slate-500 hover:text-white transition-colors">?</span>
                )}
              </label>
              {s.tooltip && (
                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 w-56 p-2 text-xs text-slate-200 bg-slate-900 rounded shadow-lg border border-slate-700 pointer-events-none">
                  {s.tooltip}
                </div>
              )}
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={values[s.key] ?? 0}
                onChange={(e) => onChange(s.key, Number(e.target.value))}
                className="flex-1 h-1.5 accent-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-400 w-8 text-right font-mono">
                {values[s.key] ?? 0}
              </span>
              {s.key === 'depth' && (
                <span className="text-[10px] text-blue-400/70 w-14 text-right">
                  {DEPTH_TIME_ESTIMATES[values[s.key] ?? 4] ?? ''}
                </span>
              )}
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}

interface PhaseSectionProps {
  title: React.ReactNode;
  sliders: SliderDef[];
  baseValues: Record<string, number>;
  overrides: Partial<Record<string, number>> | undefined;
  onOverrideChange: (key: string, value: number) => void;
  onOverrideClear: (key: string) => void;
}

function PhaseSection({ title, sliders, baseValues, overrides, onOverrideChange, onOverrideClear }: PhaseSectionProps) {
  const [open, setOpen] = useState(true);
  const overrideKeys = overrides ? Object.keys(overrides) : [];

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-semibold text-slate-300 hover:text-white transition-colors py-1"
      >
        <span className="flex items-center gap-1">
          {title}
          {overrideKeys.length > 0 && <span className="text-[9px] text-blue-400 ml-1">📌 {overrideKeys.length}</span>}
        </span>
        <span className="text-xs">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
      </button>
      {open && (
        <div className="mt-1 space-y-2 pl-1">
          {sliders.map((s) => {
            const isDisabled = DISABLED_SLIDER_KEYS.has(s.key);
            const baseVal = baseValues[s.key] ?? 0;
            const isOverridden = overrides != null && s.key in overrides;
            const displayVal = isOverridden ? (overrides as Record<string, number>)[s.key] : baseVal;

            return (
              <div key={s.key} className={`flex items-center gap-2 group relative${isDisabled ? ' opacity-40' : !isOverridden ? ' opacity-50' : ''}`}>
                <label className="text-xs text-slate-400 w-28 flex-shrink-0 truncate" title={s.tooltip || s.label}>
                  {s.label}
                  {isDisabled && <span className="text-[9px] text-amber-400/80 ml-0.5">(disabled)</span>}
                  {s.tooltip && (
                    <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-600 text-[9px] text-slate-400 cursor-help hover:bg-slate-500 hover:text-white transition-colors">?</span>
                  )}
                </label>
                {s.tooltip && (
                  <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 w-56 p-2 text-xs text-slate-200 bg-slate-900 rounded shadow-lg border border-slate-700 pointer-events-none">
                    {s.tooltip}
                  </div>
                )}
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={displayVal}
                  onChange={(e) => onOverrideChange(s.key, Number(e.target.value))}
                  className={`flex-1 h-1.5 cursor-pointer ${isOverridden ? 'accent-blue-500' : 'accent-slate-500'}`}
                  disabled={isDisabled}
                />
                <span className="text-xs text-slate-400 w-8 text-right font-mono">
                  {displayVal}
                </span>
                {!isOverridden ? (
                  <span className="text-[9px] text-slate-500 w-14 text-right">base</span>
                ) : (
                  <>
                    <span className="text-[9px] text-slate-500 w-14 text-right">(base: {baseVal})</span>
                    <button
                      onClick={() => onOverrideClear(s.key)}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors px-0.5 flex-shrink-0"
                      title="Clear override (use base value)"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const AVATAR_OPTIONS = ['🤖', '🧠', '👑', '🐉', '🔥', '⚡', '🎯', '🏰', '⚔️', '💀', '👻', '🐺', '🦊', '🐻', '🦁', '🎭'];

interface AIEditorPanelProps {
  config: EvaluationConfig;
  activePreset: PresetName | null;
  savedNames: string[];
  avatar: string | null;
  onAvatarChange: (avatar: string | null) => void;
  onChange: (config: EvaluationConfig) => void;
  onLoadPreset: (name: PresetName) => void;
  onSave: (name: string) => void;
  onLoadSaved: (name: string) => void;
  onDeleteSaved: (name: string) => void;
}

export function AIEditorPanel({
  config,
  activePreset,
  savedNames,
  avatar,
  onAvatarChange,
  onChange,
  onLoadPreset,
  onSave,
  onLoadSaved,
  onDeleteSaved,
}: AIEditorPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [activePhase, setActivePhase] = useState<GamePhase>('middlegame');
  const [activeSavedName, setActiveSavedName] = useState<string | null>(null);

  const updateSection = <K extends keyof EvaluationConfig>(
    section: K,
    key: string,
    value: number,
  ) => {
    const updated = structuredClone(config);
    (updated[section] as Record<string, number>)[key] = value;
    onChange(updated);
  };

  const updatePhaseOverride = (phase: OverridePhase, section: OverrideSection, key: string, value: number) => {
    const updated = structuredClone(config);
    if (!updated.phases) updated.phases = {};
    if (!updated.phases[phase]) updated.phases[phase] = {};
    const phaseObj = updated.phases[phase]!;
    if (!phaseObj[section]) {
      (phaseObj as Record<string, unknown>)[section] = { [key]: value };
    } else {
      (phaseObj[section] as Record<string, number>)[key] = value;
    }
    onChange(updated);
  };

  const clearPhaseOverride = (phase: OverridePhase, section: OverrideSection, key: string) => {
    const updated = structuredClone(config);
    if (!updated.phases?.[phase]?.[section]) return;
    delete (updated.phases[phase]![section] as Record<string, number>)[key];
    if (Object.keys(updated.phases[phase]![section]!).length === 0) {
      delete (updated.phases[phase] as Record<string, unknown>)[section];
    }
    if (updated.phases[phase] && Object.keys(updated.phases[phase]!).length === 0) {
      delete updated.phases[phase];
    }
    if (updated.phases && Object.keys(updated.phases).length === 0) {
      delete updated.phases;
    }
    onChange(updated);
  };

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    if (savedNames.includes(name)) {
      if (!confirm(`A personality named '${name}' already exists. Overwrite it?`)) return;
    }
    onSave(name);
    setActiveSavedName(name);
    setSaveName('');
    setShowSaveInput(false);
  };

  const isOverridePhase = activePhase === 'opening' || activePhase === 'endgame';
  const overridePhase = isOverridePhase ? (activePhase as OverridePhase) : null;

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2"><Brain className="w-5 h-5" /> AI Personality</h2>
        <span className="text-slate-400 text-sm">{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Preset buttons */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Presets</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => { onLoadPreset(name); setActiveSavedName(null); }}
                  title={PRESETS[name].description}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    activePreset === name
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {PRESETS[name].label}
                </button>
              ))}
            </div>
          </div>

          {/* Saved personalities dropdown */}
          {savedNames.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Saved</p>
              <div className="flex flex-wrap gap-1.5">
                {savedNames.map((name) => (
                  <div key={name} className="flex items-center gap-0.5">
                    <button
                      onClick={() => { onLoadSaved(name); setActiveSavedName(name); }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        activeSavedName === name
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {name}
                    </button>
                    <button
                      onClick={() => onDeleteSaved(name)}
                      className="text-xs px-1 py-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                      title={`Delete "${name}"`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Avatar Picker */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Avatar</p>
            <select
              value={avatar ?? ''}
              onChange={(e) => onAvatarChange(e.target.value === '' ? null : e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg text-sm bg-slate-700/50 border-2 border-slate-700 text-slate-300 hover:border-slate-600 focus:border-blue-500 focus:outline-none transition-all cursor-pointer appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2394a3b8\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              <option value="">No Avatar</option>
              {AVATAR_OPTIONS.map((emoji) => (
                <option key={emoji} value={emoji}>
                  {emoji}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Phase tab bar */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Game Phase</p>
            <div className="flex bg-slate-700 rounded-lg p-0.5">
              {(['opening', 'middlegame', 'endgame'] as const).map(phase => (
                <button
                  key={phase}
                  onClick={() => setActivePhase(phase)}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors capitalize ${
                    activePhase === phase ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {phase}
                  {phase !== 'middlegame' && config.phases?.[phase] && Object.keys(config.phases[phase]!).length > 0 && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Phase description */}
          {isOverridePhase && (
            <p className="text-[11px] text-slate-500 italic">
              These settings override the base values during the {activePhase}.
            </p>
          )}

          {/* Slider sections */}
          {activePhase === 'middlegame' ? (
            <>
              <Section
                title={<><Crown className="w-4 h-4 inline-block" /> Piece Values</>}
                sliders={PIECE_VALUE_SLIDERS}
                values={config.pieceValues}
                onChange={(key, val) => updateSection('pieceValues', key, val)}
              />
              <Section
                title={<><Crosshair className="w-4 h-4 inline-block" /> Positional</>}
                sliders={POSITIONAL_SLIDERS}
                values={config.positional}
                onChange={(key, val) => updateSection('positional', key, val)}
              />
              <Section
                title={<><Shield className="w-4 h-4 inline-block" /> King Safety</>}
                sliders={KING_SAFETY_SLIDERS}
                values={config.kingSafety}
                onChange={(key, val) => updateSection('kingSafety', key, val)}
              />
              <Section
                title={<><Swords className="w-4 h-4 inline-block" /> Tactical</>}
                sliders={TACTICAL_SLIDERS}
                values={config.tactical}
                onChange={(key, val) => updateSection('tactical', key, val)}
              />
              <Section
                title={<><Search className="w-4 h-4 inline-block" /> Search</>}
                sliders={SEARCH_SLIDERS}
                values={config.search}
                onChange={(key, val) => updateSection('search', key, val)}
              />
              <Section
                title={<><Shuffle className="w-4 h-4 inline-block" /> Randomness</>}
                sliders={RANDOMNESS_SLIDERS}
                values={config.randomness}
                onChange={(key, val) => updateSection('randomness', key, val)}
              />

              {/* Opening Book Toggle */}
              <div className="mb-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-300 flex items-center gap-1">
                    <BookOpen className="w-4 h-4 inline-block" /> Opening Book
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.openingBookEnabled !== false}
                    onClick={() => {
                      const updated = structuredClone(config);
                      updated.openingBookEnabled = config.openingBookEnabled === false ? true : false;
                      onChange(updated);
                    }}
                    className={
                      config.openingBookEnabled !== false
                        ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full bg-blue-500 transition-colors'
                        : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full bg-slate-600 transition-colors'
                    }
                  >
                    <span
                      className={
                        config.openingBookEnabled !== false
                          ? 'pointer-events-none inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow-sm transition-transform mt-0.5 ml-0.5'
                          : 'pointer-events-none inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow-sm transition-transform mt-0.5 ml-0.5'
                      }
                    />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  AI uses common openings for the first 10 moves. Unset uses global setting.
                </p>
              </div>
            </>
          ) : (
            <>
              <PhaseSection
                title={<><Crosshair className="w-4 h-4 inline-block" /> Positional</>}
                sliders={POSITIONAL_SLIDERS}
                baseValues={config.positional}
                overrides={config.phases?.[overridePhase!]?.positional as Partial<Record<string, number>> | undefined}
                onOverrideChange={(key, val) => updatePhaseOverride(overridePhase!, 'positional', key, val)}
                onOverrideClear={(key) => clearPhaseOverride(overridePhase!, 'positional', key)}
              />
              <PhaseSection
                title={<><Shield className="w-4 h-4 inline-block" /> King Safety</>}
                sliders={KING_SAFETY_SLIDERS}
                baseValues={config.kingSafety}
                overrides={config.phases?.[overridePhase!]?.kingSafety as Partial<Record<string, number>> | undefined}
                onOverrideChange={(key, val) => updatePhaseOverride(overridePhase!, 'kingSafety', key, val)}
                onOverrideClear={(key) => clearPhaseOverride(overridePhase!, 'kingSafety', key)}
              />
              <PhaseSection
                title={<><Swords className="w-4 h-4 inline-block" /> Tactical</>}
                sliders={TACTICAL_SLIDERS}
                baseValues={config.tactical}
                overrides={config.phases?.[overridePhase!]?.tactical as Partial<Record<string, number>> | undefined}
                onOverrideChange={(key, val) => updatePhaseOverride(overridePhase!, 'tactical', key, val)}
                onOverrideClear={(key) => clearPhaseOverride(overridePhase!, 'tactical', key)}
              />
            </>
          )}

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Save button */}
          {showSaveInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Personality name..."
                className="flex-1 bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setShowSaveInput(false); setSaveName(''); }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="w-full text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Current Personality
            </button>
          )}
        </div>
      )}
    </div>
  );
}
