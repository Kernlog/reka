"use client"

import { useVaults } from "@/hooks/useSupabaseVaults"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Plus, TrendingUp, Clock, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface VaultMetadata {
  timeLeft: string;
  percentage: number;
  targetName: string;
  sourceToken: string;
  sourceAmount: number;
  sourceSymbol: string;
  targetAmount: number;
  targetSymbol: string;
}

interface VaultData {
  target: string;
  duration: {
    unit: string;
    value: number;
  };
  metadata: VaultMetadata;
  executions: number;
  sourceToken: string;
  sourceAmount: number;
}

export function DashboardFeature() {
  const router = useRouter();
  const { data: vaults } = useVaults()
  const d = vaults?.map((vault) => {
    const typedData = vault.data as unknown as VaultData;
    return (
      <Card key={vault.id}>
        <CardHeader>
          <CardTitle>{typedData?.metadata?.sourceSymbol} {'->'} {typedData?.metadata?.targetSymbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Amount: {typedData?.sourceAmount}</p>
          <p>Target: {typedData?.metadata?.targetAmount}</p>
          <p>Time Left: {typedData?.metadata?.timeLeft}</p>
          <p>Percentage: {typedData?.metadata?.percentage}</p>
        </CardContent>
      </Card>
    )
  })
  
  return (
    <div className="container max-w-7xl py-10">
      {/* Hero Section with Flow Explanation */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-6">Automated DCA + Yield Strategy</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Set up automated dollar-cost averaging that directly invests into yield-bearing protocols. 
          Your purchases work for you from day one.
        </p>
        
        {/* Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold">1. Set Your Strategy</h3>
            <p className="text-sm text-muted-foreground text-center">
              Choose your source token, target yield protocol, and automation schedule
            </p>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold">2. Automated Execution</h3>
            <p className="text-sm text-muted-foreground text-center">
              Our smart contracts automatically execute your DCA strategy at scheduled intervals
            </p>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold">3. Instant Yield</h3>
            <p className="text-sm text-muted-foreground text-center">
              Each purchase immediately starts earning yield in your chosen protocol
            </p>
          </div>
        </div>
      </div>

      {/* Active Automations Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Active Automations</h2>
            <p className="text-muted-foreground">
              Monitor and manage your automated DCA strategies
            </p>
          </div>
          <Button 
            onClick={() => router.push('/vault/create')}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Automation
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="col-span-1 group transition-all duration-200 border-dashed">
            <CardHeader className="pt-4 pb-3 text-center">
              <CardTitle className="text-base font-medium text-muted-foreground">New Automation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex justify-center items-center">
              <Button 
                variant="outline"
                className="flex items-center gap-2 px-6 py-2.5 rounded-md transition-all duration-200"
                onClick={() => router.push('/vault/create')}
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm font-medium">Create New</span>
              </Button>
            </CardContent>
          </Card>
          {d}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mt-16 p-8 bg-muted/30 rounded-lg">
        <h3 className="text-2xl font-bold mb-6 text-center">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold mb-3">What is Automated DCA?</h4>
            <p className="text-muted-foreground mb-4">
              Dollar Cost Averaging (DCA) is an investment strategy where you invest a fixed amount 
              at regular intervals, regardless of market conditions. Our platform automates this process 
              and immediately puts your investments to work in yield-bearing protocols.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Reduces market timing risk
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Automatically invests at scheduled intervals
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Immediate yield generation on each purchase
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Why Choose Reka?</h4>
            <p className="text-muted-foreground mb-4">
              Unlike traditional DCA, our platform doesn&apos;t just accumulate tokens - it immediately 
              deploys them into yield-bearing strategies, maximizing your returns from day one.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Trustless smart contract execution
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                No manual intervention required
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Cancel or modify anytime
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
