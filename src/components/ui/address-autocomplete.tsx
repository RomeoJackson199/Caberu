import * as React from "react"
import { Check, Loader2, MapPin, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface AddressAutocompleteProps {
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

interface AddressSuggestion {
    display_name: string
    place_id: string
    address?: {
        road?: string
        house_number?: string
        city?: string
        town?: string
        village?: string
        postcode?: string
        country?: string
    }
}

export function AddressAutocomplete({
    value,
    onChange,
    placeholder = "Start typing an address...",
    className,
    disabled = false,
}: AddressAutocompleteProps) {
    const [inputValue, setInputValue] = React.useState(value || "")
    const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([])
    const [loading, setLoading] = React.useState(false)
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const suggestionsRef = React.useRef<HTMLDivElement>(null)

    // Update input value when prop changes
    React.useEffect(() => {
        if (value !== inputValue) {
            setInputValue(value || "")
        }
    }, [value])

    // Debounced fetch using Nominatim (OpenStreetMap) - free, no API key required
    React.useEffect(() => {
        const query = inputValue.trim()
        if (query.length < 3) {
            setSuggestions([])
            return
        }

        const timeoutId = setTimeout(async () => {
            setLoading(true)
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6&countrycodes=be,nl,de,fr,lu`,
                    {
                        headers: {
                            "Accept-Language": "en",
                            "User-Agent": "Caberu Dental App"
                        }
                    }
                )

                if (!response.ok) {
                    throw new Error("Failed to fetch address suggestions")
                }

                const data = await response.json()
                setSuggestions(data || [])
                setShowSuggestions(data.length > 0)
            } catch (error) {
                console.error("Address fetch error:", error)
                toast.error("Failed to load address suggestions")
                setSuggestions([])
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [inputValue])

    // Close suggestions on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSelect = (suggestion: AddressSuggestion) => {
        const addr = suggestion.address
        const parts: string[] = []

        // Build a clean address string
        if (addr?.road) {
            let street = addr.road
            if (addr.house_number) street += ` ${addr.house_number}`
            parts.push(street)
        }
        if (addr?.postcode) parts.push(addr.postcode)
        const city = addr?.city || addr?.town || addr?.village
        if (city) parts.push(city)

        const formattedAddress = parts.length > 0 ? parts.join(", ") : suggestion.display_name

        setInputValue(formattedAddress)
        onChange(formattedAddress)
        setShowSuggestions(false)
        setHighlightedIndex(-1)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)
        setHighlightedIndex(-1)
        if (newValue.length < 3) {
            setShowSuggestions(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault()
                setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
                break
            case "ArrowUp":
                e.preventDefault()
                setHighlightedIndex(prev => Math.max(prev - 1, 0))
                break
            case "Enter":
                e.preventDefault()
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSelect(suggestions[highlightedIndex])
                }
                break
            case "Escape":
                setShowSuggestions(false)
                setHighlightedIndex(-1)
                break
        }
    }

    const handleClear = () => {
        setInputValue("")
        onChange("")
        setSuggestions([])
        setShowSuggestions(false)
        inputRef.current?.focus()
    }

    const formatSuggestionDisplay = (suggestion: AddressSuggestion) => {
        const addr = suggestion.address
        if (!addr) return { main: suggestion.display_name, secondary: "" }

        const street = addr.road
            ? (addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road)
            : ""
        const city = addr.city || addr.town || addr.village || ""
        const postcode = addr.postcode || ""
        const country = addr.country || ""

        const main = street || suggestion.display_name.split(",")[0]
        const secondaryParts = [postcode, city, country !== "Belgium" ? country : ""].filter(Boolean)

        return { main, secondary: secondaryParts.join(" ") }
    }

    return (
        <div className={cn("relative w-full", className)}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="pl-9 pr-9"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!loading && inputValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                >
                    {suggestions.map((suggestion, index) => {
                        const { main, secondary } = formatSuggestionDisplay(suggestion)
                        return (
                            <button
                                key={suggestion.place_id}
                                type="button"
                                onClick={() => handleSelect(suggestion)}
                                className={cn(
                                    "w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-accent transition-colors",
                                    highlightedIndex === index && "bg-accent"
                                )}
                            >
                                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{main}</p>
                                    {secondary && (
                                        <p className="text-xs text-muted-foreground truncate">{secondary}</p>
                                    )}
                                </div>
                                {highlightedIndex === index && (
                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
