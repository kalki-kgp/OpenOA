import { useCallback, useState } from 'react'

export function useApi<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  const [data, setData] = useState<TResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (...args: TArgs) => {
      setLoading(true)
      setError(null)
      try {
        const result = await fn(...args)
        setData(result)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown API error'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fn]
  )

  return { data, loading, error, run, setData }
}
