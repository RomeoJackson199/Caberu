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
    formatted: string
    street?: string
    housenumber?: string
    city?: string
    postcode?: string
    country?: string
    lat: number
    lon: number
    place_id: string
}

// Free Geoapify API key (3000 requests/day limit)
// You can get your own at https://myprojects.geoapify.com/
const GEOAPIFY_API_KEY = "6dc7fb95a3b246cfa0f3bcef5ce9ed9a"

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

    // Close suggestions when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                inputRef.current &&
                !inputRef.current.contains(e.target as Node) &&
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target as Node)
            ) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([])
            return
        }

        setLoading(true)
        try {
            // Use Geoapify Autocomplete API - better coverage for Belgium/Europe
            const response = await fetch(
                `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
                    query
                )}&lang=en&limit=6&type=street,amenity,locality&filter=countrycode:be,nl,de,fr,lu&format=json&apiKey=${GEOAPIFY_API_KEY}`
            )

            if (!response.ok) {
                throw new Error("Failed to fetch address suggestions")
            }

            const data = await response.json()

            if (data.results) {
                const formattedResults: AddressSuggestion[] = data.results.map((result: any) => ({
                    formatted: result.formatted,
                    street: result.street,
                    housenumber: result.housenumber,
                    city: result.city,
                    postcode: result.postcode,
                    country: result.country,
                    lat: result.lat,
                    lon: result.lon,
                    place_id: result.place_id,
                }))
                setSuggestions(formattedResults)
            } else {
                setSuggestions([])
            }
        } catch (error) {
            console.error("Address fetch error:", error)
            toast.error("Failed to load address suggestions")
            setSuggestions([])
        } finally {
            setLoading(false)
        }
    }

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue && showSuggestions) {
                fetchSuggestions(inputValue)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [inputValue, showSuggestions])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)
        setShowSuggestions(true)
        setHighlightedIndex(-1)

        // Also update parent if user is manually typing
        if (!newValue) {
            onChange("")
        }
    }

    const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
        const selectedValue = suggestion.formatted
        setInputValue(selectedValue)
        onChange(selectedValue)
        setShowSuggestions(false)
        setSuggestions([])
        setHighlightedIndex(-1)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) return

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault()
                setHighlightedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                )
                break
            case "ArrowUp":
                e.preventDefault()
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                )
                break
            case "Enter":
                e.preventDefault()
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSelectSuggestion(suggestions[highlightedIndex])
                }
                break
            case "Escape":
                setShowSuggestions(false)
                setHighlightedIndex(-1)
                break
        }
    }

    const clearInput = () => {
        setInputValue("")
        onChange("")
        setSuggestions([])
        inputRef.current?.focus()
    }

    // Format address parts for display
    const formatAddressParts = (suggestion: AddressSuggestion) => {
        const parts: string[] = []

        if (suggestion.street) {
            let streetPart = suggestion.street
            if (suggestion.housenumber) {
                streetPart += ` ${suggestion.housenumber}`
            }
            parts.push(streetPart)
        }

        if (suggestion.postcode || suggestion.city) {
            const cityPart = [suggestion.postcode, suggestion.city].filter(Boolean).join(" ")
            parts.push(cityPart)
        }

        return parts
    }

    return (
        <div className="relative w-full">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                        "pl-9 pr-8",
                        className
                    )}
                />
                {inputValue && !disabled && (
                    <button
                        type="button"
                        onClick={clearInput}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (inputValue.length >= 3 || loading) && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95"
                >
                    {loading ? (
                        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching addresses...
                        </div>
                    ) : suggestions.length > 0 ? (
                        <ul className="max-h-[280px] overflow-y-auto">
                            {suggestions.map((suggestion, index) => {
                                const addressParts = formatAddressParts(suggestion)
                                return (
                                    <li
                                        key={suggestion.place_id}
                                        onClick={() => handleSelectSuggestion(suggestion)}
                                        className={cn(
                                            "flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border/50 last:border-0",
                                            index === highlightedIndex
                                                ? "bg-accent"
                                                : "hover:bg-accent/50"
                                        )}
                                    >
                                        <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            {addressParts.length > 0 ? (
                                                <>
                                                    <p className="text-sm font-medium truncate">
                                                        {addressParts[0]}
                                                    </p>
                                                    {addressParts[1] && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {addressParts[1]}
                                                            {suggestion.country && suggestion.country !== "Belgium" && (
                                                                <>, {suggestion.country}</>
                                                            )}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-sm truncate">{suggestion.formatted}</p>
                                            )}
                                        </div>
                                        {value === suggestion.formatted && (
                                            <Check className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    ) : inputValue.length >= 3 ? (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            No addresses found. Try a different search.
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
