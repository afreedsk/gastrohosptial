import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

export default function SuccessPopup({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center animate-popIn">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
            <CheckCircle size={48} className="text-green-500" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-ink mb-2">Success!</h3>
        <p className="text-ink/70 text-sm whitespace-pre-line">{message}</p>
        <button
          onClick={onClose}
          className="mt-4 text-sm text-teal-600 hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  )
}