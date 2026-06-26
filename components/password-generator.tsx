"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Copy, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
} as const

type OptionKey = keyof typeof CHAR_SETS

const OPTION_LABELS: Record<OptionKey, string> = {
  uppercase: "Uppercase (A-Z)",
  lowercase: "Lowercase (a-z)",
  numbers: "Numbers (0-9)",
  symbols: "Symbols (!@#$)",
}

function getSecureRandomInt(max: number) {
  // Rejection sampling for an unbiased value in [0, max)
  const array = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / max) * max
  let value = 0
  do {
    crypto.getRandomValues(array)
    value = array[0]
  } while (value >= limit)
  return value % max
}

function generatePassword(length: number, options: Record<OptionKey, boolean>) {
  const activeSets = (Object.keys(options) as OptionKey[]).filter((key) => options[key])
  if (activeSets.length === 0) return ""

  const pool = activeSets.map((key) => CHAR_SETS[key]).join("")

  // Guarantee at least one character from each selected set.
  const chars: string[] = activeSets.map((key) => {
    const set = CHAR_SETS[key]
    return set[getSecureRandomInt(set.length)]
  })

  for (let i = chars.length; i < length; i++) {
    chars.push(pool[getSecureRandomInt(pool.length)])
  }

  // Fisher-Yates shuffle so the guaranteed characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.slice(0, length).join("")
}

function getStrength(length: number, activeCount: number) {
  let score = 0
  if (length >= 8) score++
  if (length >= 12) score++
  if (length >= 16) score++
  if (activeCount >= 3) score++
  if (activeCount === 4) score++

  if (score <= 1) return { label: "Weak", level: 1 }
  if (score <= 3) return { label: "Fair", level: 2 }
  if (score === 4) return { label: "Strong", level: 3 }
  return { label: "Very strong", level: 4 }
}

export function PasswordGenerator() {
  const [length, setLength] = useState(16)
  const [options, setOptions] = useState<Record<OptionKey, boolean>>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
  })
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  const activeCount = useMemo(() => Object.values(options).filter(Boolean).length, [options])
  const strength = useMemo(() => getStrength(length, activeCount), [length, activeCount])

  const regenerate = useCallback(() => {
    setPassword(generatePassword(length, options))
    setCopied(false)
  }, [length, options])

  useEffect(() => {
    regenerate()
  }, [regenerate])

  const toggleOption = (key: OptionKey) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      // Never allow zero character sets selected.
      if (Object.values(next).every((v) => !v)) return prev
      return next
    })
  }

  const copyToClipboard = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard not available; silently ignore.
    }
  }

  const strengthColors = ["bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"]

  return (
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-card-foreground sm:text-3xl">
          Password Generator
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          Create strong, random passwords right in your browser.
        </p>
      </header>

      {/* Generated password */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 pl-4">
        <output
          aria-live="polite"
          className="flex-1 truncate font-mono text-base text-foreground sm:text-lg"
        >
          {password || "—"}
        </output>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={regenerate}
          aria-label="Generate new password"
        >
          <RefreshCw className="size-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          onClick={copyToClipboard}
          aria-label="Copy password to clipboard"
        >
          {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
        </Button>
      </div>

      {/* Strength meter */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Strength</span>
          <span className="font-medium text-foreground">{strength.label}</span>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                bar <= strength.level ? strengthColors[strength.level - 1] : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Length slider */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="length" className="text-sm font-medium text-foreground">
            Length
          </label>
          <span className="font-mono text-sm font-semibold text-foreground">{length}</span>
        </div>
        <input
          id="length"
          type="range"
          min={4}
          max={48}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
        />
      </div>

      {/* Options */}
      <fieldset className="mt-6">
        <legend className="mb-3 text-sm font-medium text-foreground">Include</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(OPTION_LABELS) as OptionKey[]).map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={options[key]}
                onChange={() => toggleOption(key)}
                className="size-4 cursor-pointer accent-primary"
              />
              <span className="text-foreground">{OPTION_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="button" onClick={regenerate} className="mt-6 w-full" size="lg">
        <RefreshCw className="size-4" />
        Generate Password
      </Button>
    </section>
  )
}
