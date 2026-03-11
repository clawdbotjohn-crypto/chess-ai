import { Link, useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { Bot, Users, Eye, Brain, ScrollText, Scale, Swords, Shield, Dices, Crosshair, Target, ChevronRight, Cpu, LayoutGrid, BarChart3, BookOpen } from 'lucide-react'
import { PRESETS } from '../engine/presets'
import WhatsNew from '../components/WhatsNew'

// Static Tailwind classes — dynamic construction (bg-${color}-...) breaks JIT purging
const colorStyles: Record<string, { iconBg: string; iconText: string; hoverBorder: string }> = {
  blue:   { iconBg: 'bg-blue-600/20',   iconText: 'text-blue-400',   hoverBorder: 'hover:border-blue-500/50' },
  green:  { iconBg: 'bg-green-600/20',  iconText: 'text-green-400',  hoverBorder: 'hover:border-green-500/50' },
  purple: { iconBg: 'bg-purple-600/20', iconText: 'text-purple-400', hoverBorder: 'hover:border-purple-500/50' },
  amber:  { iconBg: 'bg-amber-600/20',  iconText: 'text-amber-400',  hoverBorder: 'hover:border-amber-500/50' },
  cyan:   { iconBg: 'bg-cyan-600/20',   iconText: 'text-cyan-400',   hoverBorder: 'hover:border-cyan-500/50' },
  rose:   { iconBg: 'bg-rose-600/20',   iconText: 'text-rose-400',   hoverBorder: 'hover:border-rose-500/50' },
  red:    { iconBg: 'bg-red-600/20',    iconText: 'text-red-400',    hoverBorder: 'hover:border-red-500/50' },
  orange: { iconBg: 'bg-orange-600/20', iconText: 'text-orange-400', hoverBorder: 'hover:border-orange-500/50' },
}

const quickActions = [
  { label: 'Play vs AI', desc: 'Challenge your custom AI personality or preset opponents', icon: Bot, color: 'blue', to: '/play?mode=human-vs-ai' },
  { label: 'Play Stockfish', desc: 'Challenge Stockfish engine at your preferred difficulty', icon: Cpu, color: 'orange', to: '/play?mode=human-vs-ai&stockfish=1' },
  { label: 'Local 2-Player', desc: 'Play against a friend on the same device', icon: Users, color: 'green', to: '/play?mode=human-vs-human' },
  { label: 'AI vs AI', desc: 'Watch two AI personalities battle it out', icon: Eye, color: 'purple', to: '/play?mode=ai-vs-ai' },
  { label: 'Create Personality', desc: 'Design a new AI with custom evaluation weights', icon: Brain, color: 'amber', to: '/editor' },
  { label: 'Game History', desc: 'Review past games and analyze your play', icon: ScrollText, color: 'rose', to: '/history' },
  { label: 'Position Setup', desc: 'Set up custom board positions and play or analyze from them', icon: LayoutGrid, color: 'cyan', to: '/setup' },
]

const presetCards = [
  { key: 'DEFAULT', icon: Scale, color: 'blue', subtitle: 'Balanced' },
  { key: 'AGGRESSIVE', icon: Swords, color: 'red', subtitle: 'Attacks' },
  { key: 'DEFENSIVE', icon: Shield, color: 'green', subtitle: 'Solid' },
  { key: 'CHAOTIC', icon: Dices, color: 'purple', subtitle: 'Random' },
  { key: 'TACTICAL', icon: Crosshair, color: 'amber', subtitle: 'Combos' },
  { key: 'POSITIONAL', icon: Target, color: 'cyan', subtitle: 'Strategic' },
] as const

export default function HomePage() {
  usePageTitle('')
  const navigate = useNavigate()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <WhatsNew />
      {/* Hero Section */}
      <section className="text-center mb-10">
        <h1 className="text-4xl lg:text-5xl font-bold mb-3">Chess AI</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Play, analyze, and create custom AI opponents
        </p>
      </section>

      {/* Featured: AI Creator */}
      <section className="mb-8">
        <Link
          to="/editor"
          className="block bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl p-6 md:p-8 transition group"
        >
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">Create Your AI Opponent</h2>
              <p className="text-slate-400 text-sm md:text-base">
                Tune 15+ evaluation weights to craft a unique chess personality. Make it aggressive, defensive, chaotic, or anything in between.
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-purple-400 transition flex-shrink-0 hidden md:block" />
          </div>
        </Link>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {quickActions.map(({ label, desc, icon: Icon, color, to }) => {
          const s = colorStyles[color]
          return (
            <Link
              key={label}
              to={to}
              className={`group bg-slate-800 hover:bg-slate-800/80 border border-slate-700 rounded-xl p-6 transition ${s.hoverBorder}`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-12 h-12 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${s.iconText}`} />
                </div>
                <h3 className="text-lg font-semibold">{label}</h3>
              </div>
              <p className="text-slate-400 text-sm">{desc}</p>
            </Link>
          )
        })}
      </section>

      {/* Feature Highlights */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Brain, label: 'Custom AI Personalities', desc: 'Create bots with unique play styles', color: 'purple' },
            { icon: BarChart3, label: 'Deep Analysis', desc: 'Review games with move-by-move evaluation', color: 'cyan' },
            { icon: Cpu, label: 'Multiple Engines', desc: 'Play against Stockfish or custom AI', color: 'orange' },
            { icon: BookOpen, label: 'Opening Book', desc: '3000+ openings with ECO codes', color: 'green' },
          ].map(({ icon: Icon, label, desc, color }) => {
            const s = colorStyles[color]
            return (
              <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-4.5 h-4.5 ${s.iconText}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Preset Personalities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            ✨ Preset Personalities
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {presetCards.map(({ key, icon: Icon, color, subtitle }) => {
            const s = colorStyles[color]
            return (
              <button
                key={key}
                onClick={() => navigate(`/play?mode=human-vs-ai&preset=${key}`)}
                className={`bg-slate-800 hover:bg-slate-800/80 border border-slate-700 rounded-lg p-4 text-center transition ${s.hoverBorder}`}
              >
                <div className={`w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-5 h-5 ${s.iconText}`} />
                </div>
                <p className="font-medium text-sm">{PRESETS[key].label}</p>
                <p className="text-slate-500 text-xs">{subtitle}</p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
