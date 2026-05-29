import { ref, type Ref } from 'vue'
import { tr } from '../utils/locale'

export interface EngineError {
  path: string
  message: string
  suggestion?: string
}

export interface ErrorHandler {
  errors: Ref<EngineError[]>
  reportError: (error: EngineError) => void
  clearErrors: () => void
}

export function useErrorHandler(mode: 'dev' | 'prod'): ErrorHandler {
  const errors = ref<EngineError[]>([])

  const reportError = (error: EngineError) => {
    if (mode === 'dev') {
      errors.value = [...errors.value, error]
    } else {
      console.error(
        `${tr('error.engineLog')} ${error.path}: ${error.message}`,
        error.suggestion ? `\n  ${tr('error.suggestion')}: ${error.suggestion}` : '',
      )
    }
  }

  const clearErrors = () => {
    errors.value = []
  }

  return { errors, reportError, clearErrors }
}
