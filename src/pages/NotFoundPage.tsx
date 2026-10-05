import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Compass className="mx-auto h-12 w-12 text-surface-300" />
      <h1 className="mt-4 text-2xl font-bold text-surface-900 dark:text-surface-50">
        Page not found / <span className="ta">பக்கம் கிடைக்கவில்லை</span>
      </h1>
      <p className="mt-2 text-sm text-surface-500">The page you are looking for does not exist.</p>
      <Link to="/" className="btn-primary mt-6">
        Go Home / <span className="ta">முகப்பு</span>
      </Link>
    </div>
  )
}
