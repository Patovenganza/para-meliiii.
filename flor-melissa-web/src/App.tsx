import { useCallback, useState } from 'react'
import { Music2, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import HeartScene from './HeartScene'
import TextHeart from './TextHeart'

export default function App() {
  const [elapsed, setElapsed] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [musicOn, setMusicOn] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const onElapsed = useCallback((seconds: number) => setElapsed(seconds), [])

  const toggleMusic = async () => {
    const audio = document.getElementById('melissa-audio') as HTMLAudioElement | null
    if (!audio) return
    if (musicOn) {
      audio.pause(); setMusicOn(false); return
    }
    try {
      await audio.play(); setMusicOn(true); setAudioReady(true)
    } catch {
      setAudioReady(false)
    }
  }

  const restart = () => { setElapsed(0); setResetKey(v => v + 1) }

  return (
    <main className="page-shell">
      <section className="scene-frame">
        <HeartScene onElapsed={onElapsed} resetKey={resetKey} />
        <div className="top-note">una flor para ti</div>
        <TextHeart elapsed={elapsed} />
        <div className="controls">
          <button type="button" onClick={toggleMusic} className="control-button" aria-label={musicOn ? 'Pausar música' : 'Reproducir música'}>
            {musicOn ? <Volume2 size={18} /> : <Music2 size={18} />}
            <span>{musicOn ? 'Pausar música' : 'Escuchar música'}</span>
          </button>
          <button type="button" onClick={restart} className="control-button icon-only" aria-label="Volver a ver la animación" title="Volver a ver la animación">
            <RotateCcw size={17} />
          </button>
        </div>
        {!audioReady && <p className="audio-hint">Agrega tu canción MP3 en <code>public/audio/melissa.mp3</code></p>}
        <audio id="melissa-audio" src="/audio/melissa.mp3" loop preload="none" onError={() => setAudioReady(false)} />
      </section>
    </main>
  )
}
