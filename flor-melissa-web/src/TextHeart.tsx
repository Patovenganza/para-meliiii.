import { useEffect, useState } from 'react'

type TextHeartProps = { elapsed: number }

export default function TextHeart({ elapsed }: TextHeartProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(elapsed >= 10)
  }, [elapsed])

  return (
    <div className={`love-message ${visible ? 'is-visible' : ''}`} aria-live="polite">
      <p className="main-message">nada más por kiut, te amodoro mi vida</p>
      <p className="signature">para Melissa <span>♡</span></p>
    </div>
  )
}
