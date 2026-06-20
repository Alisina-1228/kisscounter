"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"

// Floating bubble background — negative delays so they're already mid-flight on load
function Bubbles() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => {
        const duration = 8 + (i * 1.7) % 8
        return (
          <span
            key={i}
            className="bubble"
            style={{
              left: `${(i * 8.3 + 3) % 100}%`,
              animationDelay: `-${(i * 1.3) % duration}s`,
              animationDuration: `${duration}s`,
              fontSize: `${1.2 + (i * 0.4) % 2}rem`,
              opacity: 0.15 + (i % 4) * 0.07,
            }}
          >
            💋
          </span>
        )
      })}
    </div>
  )
}

// Animated number with count-up on change
function AnimatedNumber({ value }: { value: number | null }) {
  const [display, setDisplay] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const prevRef = useRef<number | null>(null)

  useEffect(() => {
    if (value === null) return
    const prev = prevRef.current
    prevRef.current = value

    if (prev === null) {
      setDisplay(value)
      return
    }

    // Animate count up/down
    const diff = value - prev
    if (diff === 0) return

    setAnimating(true)
    const steps = Math.min(Math.abs(diff), 20)
    const stepSize = diff / steps
    let current = prev
    let step = 0

    const tick = () => {
      step++
      current += stepSize
      setDisplay(Math.round(current))
      if (step < steps) {
        setTimeout(tick, 30)
      } else {
        setDisplay(value)
        setTimeout(() => setAnimating(false), 200)
      }
    }
    setTimeout(tick, 30)
  }, [value])

  if (value === null) {
    return (
      <div className="flex items-center gap-2">
        <span className="animate-pulse text-[clamp(2.5rem,15vw,7rem)] font-bold leading-none text-foreground/20">—</span>
      </div>
    )
  }

  return (
    <span
      className={`text-[clamp(2.5rem,15vw,7rem)] font-bold tabular-nums leading-none transition-transform duration-150 ${
        animating ? "scale-110" : "scale-100"
      }`}
      style={{ display: "inline-block" }}
    >
      {display ?? value}
    </span>
  )
}

const addTexts = [
  "Smooch logged! 💅",
  "Kiss received. Filing paperwork. 📋",
  "Another one for the archives! 🗂️",
  "Documented. Official. Certified. ✅",
  "That one counted! 💋",
  "Noted with love. 🫶",
  "The record grows. 📈",
  "Kiss captured! Don't lose it. 💾",
]

const resetTexts = [
  "Wiped the slate. Fresh start! 🧹",
  "Gone. Like it never happened. 👻",
  "The record has been expunged. 📜",
  "Zero is a perfectly valid number. 0️⃣",
  "Reset! Let the chaos begin again. 🔄",
  "The counter has been reborn. 🌱",
]

const idlePhrases = [
  "Kisses, officially counted.",
  "Every smooch, on the record.",
  "The most important metric.",
  "A very serious tracking system.",
  "Because love deserves data.",
]

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function KissCounter() {
  const [count, setCount] = useState<number | null>(null)
  const [totalKisses, setTotalKisses] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null)
  const [resetting, setResetting] = useState(false)
  const toastKeyRef = useRef(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    toastKeyRef.current += 1
    setToast({ msg, key: toastKeyRef.current })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    supabase
      .from("kiss_counter")
      .select("count, total_kisses")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setCount(data.count)
          setTotalKisses(data.total_kisses ?? 0)
        }
      })

    const channel = supabase
      .channel("kiss_counter_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kiss_counter" },
        (payload) => {
          const row = payload.new as { count: number; total_kisses: number }
          setCount(row.count)
          setTotalKisses(row.total_kisses ?? 0)
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

    // Fire confetti
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff4d6d", "#ff8fa3", "#ffb3c1", "#ff006e", "#c9184a"],
      shapes: ["circle"],
      scalar: 1.2,
    })

    await supabase.rpc("increment_kisses")
    showToast(pickRandom(addTexts))
    setLoading(false)
  }

  const reset = async () => {
    if (loading || count === null) return
    setLoading(true)
    setResetting(true)

    await supabase
      .from("kiss_counter")
      .update({
        count: 0,
        total_kisses: (totalKisses ?? 0) + count,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    showToast(pickRandom(resetTexts))
    setLoading(false)
    setTimeout(() => setResetting(false), 600)
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(100vh) scale(0.8); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.8; }
          100% { transform: translateY(-10vh) scale(1.1); opacity: 0; }
        }
        .bubble {
          position: absolute;
          bottom: -2rem;
          animation: floatUp linear infinite;
          will-change: transform, opacity;
          user-select: none;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .toast-enter {
          animation: toastIn 0.2s ease-out forwards;
        }
        @keyframes shakeOut {
          0%   { transform: scale(1) rotate(0deg); }
          20%  { transform: scale(0.9) rotate(-3deg); }
          40%  { transform: scale(1.05) rotate(3deg); }
          60%  { transform: scale(0.95) rotate(-2deg); }
          80%  { transform: scale(1.02) rotate(1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .shake { animation: shakeOut 0.5s ease-out; }
      `}</style>

      <Bubbles />

      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 relative z-10">

        {/* Attribution pill */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-border bg-background/60 backdrop-blur-sm px-4 py-1.5 text-xs text-muted-foreground font-medium tracking-wide whitespace-nowrap">
            Built by Alisina for Mahtab 💋
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-5xl">💋</span>
          <h1 className="text-3xl font-bold tracking-tight">Kiss Counter</h1>
          <p className="text-sm text-muted-foreground">{pickRandom(idlePhrases)}</p>
        </div>

        {/* Count display — two sections */}
        <div className="flex items-start justify-center gap-4 sm:gap-10 w-full max-w-xs sm:max-w-none">
          {/* Owed Kisses */}
          <div className={`flex flex-col items-center gap-1 ${resetting ? "shake" : ""}`}>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Owed</span>
            <AnimatedNumber value={count} />
            <span className="text-sm text-muted-foreground font-medium">
              {count === null ? "connecting…" : count === 1 ? "kiss" : "kisses"}
            </span>
          </div>

          <div className="w-px self-stretch bg-border mt-6" />

          {/* Total Kisses */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</span>
            <AnimatedNumber value={totalKisses} />
            <span className="text-sm text-muted-foreground font-medium">
              {totalKisses === null ? "connecting…" : totalKisses === 1 ? "kiss" : "kisses"}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Button
            size="lg"
            className="w-full text-lg h-14 transition-all active:scale-95 hover:scale-[1.02] shadow-md"
            onClick={addKiss}
            disabled={loading || count === null}
          >
            💋 Add a Kiss
          </Button>
          <Button
            variant="outline"
            className="w-full transition-all active:scale-95 hover:scale-[1.01]"
            onClick={reset}
            disabled={loading || count === null}
          >
            Reset
          </Button>
        </div>

        {/* Sync note */}
        <p className="text-xs text-muted-foreground/60">
          ✨ Syncs across all your devices in real-time
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          key={toast.key}
          className="toast-enter fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium shadow-lg whitespace-nowrap"
        >
          {toast.msg}
        </div>
      )}
    </>
  )
}
