"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export default function KissCounter() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from("kiss_counter")
      .select("count")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setCount(data.count)
      })

    const channel = supabase
      .channel("kiss_counter_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kiss_counter" },
        (payload) => {
          setCount((payload.new as { count: number }).count)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const addKiss = async () => {
    if (loading) return
    setLoading(true)
    await supabase.rpc("increment_kisses")
    setLoading(false)
  }

  const reset = async () => {
    if (loading) return
    setLoading(true)
    await supabase
      .from("kiss_counter")
      .update({ count: 0, updated_at: new Date().toISOString() })
      .eq("id", 1)
    setLoading(false)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-6xl">💋</span>
        <h1 className="text-2xl font-semibold tracking-tight">Kiss Counter</h1>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-9xl font-bold tabular-nums leading-none">
          {count === null ? "—" : count}
        </span>
        <span className="text-sm text-muted-foreground">kisses</span>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Button
          size="lg"
          className="w-full text-lg h-14"
          onClick={addKiss}
          disabled={loading || count === null}
        >
          💋 Add a Kiss
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={reset}
          disabled={loading || count === null}
        >
          Reset
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Syncs across all devices in real-time</p>
    </div>
  )
}
