/**
 * Chess sound effects using Web Audio API
 * No external audio files needed — generates all sounds programmatically
 */

import { getSettings } from './settings'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

function getVolume(): number {
  const settings = getSettings()
  if (!settings.soundEnabled) return 0
  return settings.volume / 100
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  rampDown = true
) {
  const vol = getVolume()
  if (vol === 0) return

  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)

  gain.gain.setValueAtTime(volume * vol, ctx.currentTime)
  if (rampDown) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  }

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration: number, volume = 0.1) {
  const vol = getVolume()
  if (vol === 0) return

  const ctx = getAudioContext()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume * vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(800, ctx.currentTime)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

/** Normal piece move — soft wooden tap */
export function playMoveSound() {
  playTone(800, 0.08, 'sine', 0.25)
  playNoise(0.06, 0.08)
}

/** Capture — sharper, more impactful */
export function playCaptureSound() {
  playTone(400, 0.12, 'square', 0.2)
  playNoise(0.1, 0.15)
  // Second thud
  setTimeout(() => playTone(250, 0.08, 'sine', 0.15), 30)
}

/** Check — alert ping */
export function playCheckSound() {
  playTone(880, 0.15, 'sine', 0.3)
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.2), 80)
}

/** Castle — two taps (king + rook) */
export function playCastleSound() {
  playTone(700, 0.08, 'sine', 0.25)
  playNoise(0.05, 0.08)
  setTimeout(() => {
    playTone(600, 0.08, 'sine', 0.2)
    playNoise(0.05, 0.06)
  }, 120)
}

/** Game over — descending tone */
export function playGameOverSound() {
  playTone(660, 0.2, 'sine', 0.3)
  setTimeout(() => playTone(520, 0.2, 'sine', 0.25), 150)
  setTimeout(() => playTone(440, 0.3, 'sine', 0.2), 300)
}

/** Win — ascending fanfare */
export function playWinSound() {
  playTone(523, 0.15, 'sine', 0.3)
  setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 120)
  setTimeout(() => playTone(784, 0.25, 'sine', 0.35), 240)
}

/** Illegal move attempt — low buzz */
export function playIllegalSound() {
  playTone(150, 0.15, 'square', 0.15)
}

/**
 * Determine and play the appropriate sound for a move
 */
export function playSoundForMove(san: string, isGameOver: boolean, isCheck: boolean) {
  if (isGameOver) {
    playGameOverSound()
    return
  }
  if (isCheck) {
    playCheckSound()
    return
  }
  if (san.includes('O-O')) {
    playCastleSound()
    return
  }
  if (san.includes('x')) {
    playCaptureSound()
    return
  }
  playMoveSound()
}
