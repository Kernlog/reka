"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ArrowRight, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useStakingYields } from "@/hooks/useStakingYields"
import { useTokenPrices } from "@/hooks/useTokenPrices"
import { useCreateVault } from "@/hooks/useSupabaseVaults"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { VaultCard } from "@/components/vault/vault-card"

// Define allowed source token mints
const ALLOWED_SOURCE_MINTS = [
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", // EURC
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", // pyUSD
  "So11111111111111111111111111111111111111112",   // SOL
]

interface TokenPrice {
  mint: string
  token: string
  usdPrice: string
}

// Custom hook to get source token options
function useSourceTokens(prices: TokenPrice[]) {
  const options = useMemo(() => {
    if (!prices?.length) return []
    
    return prices
      .filter(price => ALLOWED_SOURCE_MINTS.includes(price.mint))
      .map(price => ({
        value: price.mint,
        label: price.token,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) // Sort alphabetically by token symbol
  }, [prices])

  return { options }
}

// Custom hook to get target options from staking yields
function useTargetOptions(prices: TokenPrice[]) {
  const { yields, isLoading: yieldsLoading } = useStakingYields()
  
  // Transform yields into target options with price data
  const options = useMemo(() => {
    if (!yields || !prices?.length) return []
    
    return yields
      .map((yield_) => {
        const priceInfo = prices.find((p: TokenPrice) => p.mint === yield_.tokenMint)
        return {
          value: yield_.tokenMint,
          apy: Number(yield_.apy) * 100, // Convert to percentage
          tokenMint: yield_.tokenMint,
          symbol: priceInfo?.token || 'Unknown',
        }
      })
      // Filter out unknown tokens
      .filter(option => option.symbol !== 'Unknown')
      // Sort by APY descending
      .sort((a, b) => b.apy - a.apy)
  }, [yields, prices])

  return {
    options,
    isLoading: yieldsLoading,
  }
}

// Separate component for target option display
function TargetOption({ option }: { 
  option: { 
    value: string; 
    apy: number; 
    tokenMint: string; 
    symbol: string;
  } 
}) {
  return (
    <span>{`${option.symbol} (APY: ${option.apy.toFixed(2)}%)`}</span>
  )
}

// Form schema for validation
const formSchema = z.object({
  sourceToken: z.string({
    required_error: "Please select a source token",
  }),
  sourceAmount: z.union([
    z.string().refine(val => val === '', {
      message: "Please enter an amount"
    }),
    z.coerce.number()
      .positive("Amount must be positive")
  ]).transform(val => typeof val === 'string' ? 0 : val),
  target: z.string({
    required_error: "Please select a target",
  }),
  durationValue: z.union([
    z.string().refine(val => val === '', {
      message: "Please enter a duration"
    }),
    z.coerce.number()
      .int("Duration must be a whole number")
      .positive("Duration must be positive")
  ]).transform(val => typeof val === 'string' ? 0 : val),
  durationUnit: z.enum(["Hours", "Days", "Weeks"], {
    required_error: "Please select a duration unit",
  }),
  executions: z.coerce
    .number({
      required_error: "Please enter number of executions",
      invalid_type_error: "Please enter a valid number",
    })
    .int("Number of executions must be a whole number")
    .min(1, "Must have at least 1 execution")
    .max(100, "Maximum 100 executions allowed"),
  submissionDatetime: z.date(),
})

// Type for form output after validation
type FormOutput = z.infer<typeof formSchema>;

// Define a type for vault preview data
interface VaultPreviewData {
  sourceToken: string;
  sourceAmount: number;
  sourceSymbol: string;
  targetName: string;
  targetAmount: number;
  targetSymbol: string;
  percentage: number;
  timeLeft: string;
}

export default function VaultCreateFeature() {
  const router = useRouter()
  const [previewData, setPreviewData] = useState<VaultPreviewData | null>(null)
  const [formData, setFormData] = useState<FormOutput | null>(null)
  const { prices: allPrices, isLoading: pricesLoading } = useTokenPrices({ env: "mainnet-beta" })
  const { options: targetOptions, isLoading: targetOptionsLoading } = useTargetOptions(allPrices || [])
  const { options: sourceTokens } = useSourceTokens(allPrices || [])
  const createVaultMutation = useCreateVault()

  // Initialize form with empty values for number fields
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceToken: "",
      sourceAmount: "",  // Empty string for initial state
      target: "",
      durationValue: "", // Empty string for initial state
      durationUnit: "Days",
      executions: 1,
      submissionDatetime: new Date(),
    },
  })

  // Check if data is still loading
  const isLoading = targetOptionsLoading || pricesLoading

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-10 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Loading vault options...</p>
      </div>
    )
  }

  // Calculate derived values based on user input
  const calculateDerivedValues = (data: FormOutput, prices: TokenPrice[]) => {
    const targetInfo = targetOptions.find((t) => t.value === data.target)
    // Using sourceTokens directly instead of assigning to sourceInfo
    
    // Get USD prices and symbols for source and target tokens
    const sourcePriceInfo = prices.find(p => p.mint === data.sourceToken)
    const targetPriceInfo = prices.find(p => p.mint === data.target)

    // Calculate target amount using USD prices
    let targetAmount = data.sourceAmount
    if (sourcePriceInfo?.usdPrice && targetPriceInfo?.usdPrice && data.sourceToken !== data.target) {
      // Convert through USD: source -> USD -> target
      const sourceUsdValue = data.sourceAmount * parseFloat(sourcePriceInfo.usdPrice)
      targetAmount = sourceUsdValue / parseFloat(targetPriceInfo.usdPrice)
    }

    // Format time left string
    const timeLeft = `${data.durationValue} ${data.durationUnit}`

    return {
      sourceToken: data.sourceToken,
      sourceAmount: data.sourceAmount,
      sourceSymbol: sourcePriceInfo?.token || "Unknown",
      targetName: targetInfo ? `${targetInfo.symbol} Yield` : "Unknown Target",
      targetAmount,
      targetSymbol: targetPriceInfo?.token || "TOKEN",
      percentage: 0,
      timeLeft,
    }
  }

  // Handle form submission for preview
  const onDraftVault = (data: z.infer<typeof formSchema>) => {
    // Capture current time for submission
    const dataWithCurrentSubmissionTime = {
      ...data,
      submissionDatetime: new Date(),
    };

    // Calculate derived values
    const vaultData = calculateDerivedValues(dataWithCurrentSubmissionTime, allPrices || [])

    // Store form data for later use
    setFormData(dataWithCurrentSubmissionTime)
    
    // Update preview
    setPreviewData(vaultData)
  }

  // Handle creation of the vault
  const handleCreateVault = () => {
    if (!formData || !previewData) return

    // Store vault in Supabase
    createVaultMutation.mutate({
      data: {
        sourceToken: formData.sourceToken,
        sourceAmount: formData.sourceAmount,
        target: formData.target,
        duration: {
          value: formData.durationValue,
          unit: formData.durationUnit
        },
        executions: formData.executions,
        submissionDatetime: formData.submissionDatetime.toISOString(),
        metadata: {
          sourceToken: previewData.sourceToken,
          sourceAmount: previewData.sourceAmount,
          sourceSymbol: previewData.sourceSymbol,
          targetName: previewData.targetName,
          targetAmount: previewData.targetAmount,
          targetSymbol: previewData.targetSymbol,
          percentage: previewData.percentage,
          timeLeft: previewData.timeLeft,
        }
      }
    }, {
      onSuccess: () => {
        // Navigate back to vaults list after successful creation
        router.push('/vault')
      },
      onError: (error) => {
        console.error("Failed to create vault:", error)
        // You could add toast notification here if you have a toast library
      }
    })
  }

  return (
    <div className="container max-w-6xl py-10">
      {/* Header Section with Explanation */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Create New Automation</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Set up an automated DCA strategy that will purchase tokens at scheduled intervals 
          and immediately deploy them into yield-bearing protocols.
        </p>
        
        {/* What Happens When You Create an Automation */}
        <div className="bg-muted/30 border border-border rounded-lg p-6 mb-8 max-w-4xl mx-auto">
          <h3 className="font-semibold mb-4 text-lg">What happens when you create this automation?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-semibold">1</span>
              </div>
              <h4 className="font-medium mb-1">Smart Contract Setup</h4>
              <p className="text-muted-foreground">Your automation strategy is deployed as a trustless smart contract on Solana</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-semibold">2</span>
              </div>
              <h4 className="font-medium mb-1">Automated Execution</h4>
              <p className="text-muted-foreground">The contract automatically executes your DCA strategy at the specified intervals</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-semibold">3</span>
              </div>
              <h4 className="font-medium mb-1">Instant Yield</h4>
              <p className="text-muted-foreground">Each purchase immediately starts earning yield in your chosen protocol</p>
            </div>
          </div>
        </div>
      </div>

      {/* Show error message if mutation failed */}
      {createVaultMutation.isError && (
        <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
          Failed to create vault. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Automation Configuration</CardTitle>
            <CardDescription>
              Configure your automated DCA strategy by selecting your source token, investment amount, 
              target yield protocol, and execution schedule.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onDraftVault)} className="space-y-6">
                {/* Source Token */}
                <FormField
                  control={form.control}
                  name="sourceToken"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Source Token</FormLabel>
                      <FormDescription className="mb-2">
                        Choose the token you want to use for your DCA strategy. This will be the token 
                        you invest with at each interval.
                      </FormDescription>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? sourceTokens.find((token) => token.value === field.value)?.label
                                : "Select token"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search token..." />
                            <CommandList>
                              <CommandEmpty>No token found.</CommandEmpty>
                              <CommandGroup>
                                {sourceTokens.map((token) => (
                                  <CommandItem
                                    key={token.value}
                                    value={token.value}
                                    onSelect={() => {
                                      form.setValue("sourceToken", token.value)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        token.value === field.value ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {token.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Source Amount */}
                <FormField
                  control={form.control}
                  name="sourceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter amount" {...field} />
                      </FormControl>
                      <FormDescription>
                        The amount of tokens to invest at each execution interval. This will be split 
                        across the number of executions you specify.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Target with dynamic options */}
                <FormField
                  control={form.control}
                  name="target"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Target Yield Protocol</FormLabel>
                      <FormDescription className="mb-2">
                        Choose the yield-bearing protocol where your investments will be deployed. 
                        Each protocol offers different APY rates and risk profiles.
                      </FormDescription>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? targetOptions.find((option) => option.value === field.value)?.symbol
                                : "Select target protocol"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search protocol..." />
                            <CommandList>
                              <CommandEmpty>No protocol found.</CommandEmpty>
                              <CommandGroup>
                                {targetOptions.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => {
                                      form.setValue("target", option.value)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        option.value === field.value ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    <TargetOption option={option} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="durationValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter duration" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Hours">Hours</SelectItem>
                            <SelectItem value="Days">Days</SelectItem>
                            <SelectItem value="Weeks">Weeks</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="executions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Executions</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter number of executions" {...field} />
                      </FormControl>
                      <FormDescription>
                        Split your total investment into multiple executions over the duration period. 
                        For example, 4 executions over 7 days means one execution every 1.75 days.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full hover:bg-accent/90 hover:cursor-pointer bg-accent text-accent-foreground"
                >
                  Preview Automation
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Automation Preview</h2>

          {previewData ? (
            <>
              <VaultCard 
                {...previewData} 
                mode={formData ? "create" : "preview"}
                onAction={handleCreateVault}
              />
              
              {createVaultMutation.isPending && (
                <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating automation...
                </div>
              )}

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your automation will be deployed as a smart contract</li>
                  <li>• The first execution will occur after the specified duration</li>
                  <li>• You can monitor progress and modify settings anytime</li>
                  <li>• Yield earnings will be tracked in real-time</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
              <div>
                <p className="mb-2">Fill out the form to see a preview of your automation</p>
                <ArrowRight className="h-6 w-6 mx-auto" />
              </div>
            </div>
          )}

          <div className="mt-6 text-sm text-muted-foreground">
            <p className="mb-2">Note: The preview shows estimated values that may change based on market conditions.</p>
            <p>Target amount and percentage are calculated based on current rates and may vary.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
