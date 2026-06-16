"use client"

import dynamic from "next/dynamic"

const KissCounter = dynamic(() => import("@/components/kiss-counter"), { ssr: false })

export default function Page() {
  return <KissCounter />
}
