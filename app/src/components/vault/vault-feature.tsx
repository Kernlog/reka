'use client'

import { WalletButton } from '../solana/solana-provider'
import { useWalletUi } from '@wallet-ui/react'
import { VaultCard } from './vault-card'
import { Button } from '../ui/button'
import { useVaults } from '@/hooks/useSupabaseVaults'
import { Loader2, Plus, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Type for vault metadata structure
type VaultMetadata = Record<string, string | number>;

// Type for vault data structure
type VaultData = {
  sourceToken?: string;
  sourceAmount?: number;
  metadata?: VaultMetadata;
  [key: string]: unknown;
};

export default function VaultFeature() {
    const { account } = useWalletUi()
    const { data: vaults, isLoading } = useVaults()
    const router = useRouter()

    // if (account) {
    //   return redirect(`/account/${account.address.toString()}`)
    // }

    if (!account) {
        return (
            <div className="hero py-[64px]">
                <div className="hero-content text-center">
                    <WalletButton />
                </div>
            </div>
        )
    }

    return (
        <div className="container max-w-7xl py-10">
            {/* Header Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Active Vaults</h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                    Monitor and manage your automated DCA strategies. Each vault represents an active 
                    automation that executes your investment strategy at scheduled intervals.
                </p>
                
                {/* Info Box */}
                <div className="bg-muted/50 border border-border rounded-lg p-6 mb-8 max-w-3xl mx-auto">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="text-left">
                            <h3 className="font-semibold mb-2">How Vaults Work</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                                Each vault is an automated strategy that:
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Automatically purchases tokens at scheduled intervals</li>
                                <li>• Immediately deploys funds into yield-bearing protocols</li>
                                <li>• Tracks your progress and accumulated yield</li>
                                <li>• Can be paused, modified, or cancelled anytime</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Your Automations</h2>
                    <p className="text-muted-foreground">
                        {vaults && vaults.length > 0 
                            ? `${vaults.length} active automation${vaults.length === 1 ? '' : 's'}`
                            : 'No active automations yet'
                        }
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
            
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading vaults...</span>
                </div>
            ) : vaults && vaults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {vaults.map((vault) => {
                        // Type assertion and safe access with optional chaining
                        const data = vault.data as VaultData || {};
                        const metadata = data.metadata as VaultMetadata || {};
                        
                        return (
                            <VaultCard
                                key={vault.id}
                                id={vault.id}
                                sourceToken={data.sourceToken || ""}
                                sourceAmount={Number(data.sourceAmount) || 0}
                                sourceSymbol={metadata.sourceSymbol as string || ""}
                                targetName={metadata.targetName as string || ""}
                                targetAmount={Number(metadata.targetAmount) || 0}
                                targetSymbol={metadata.targetSymbol as string || ""}
                                percentage={Number(metadata.percentage) || 0}
                                timeLeft={metadata.timeLeft as string || ""}
                                mode="view"
                                onAction={() => router.push(`/vault/${vault.id}`)}
                            />
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg p-8 bg-muted/20">
                    <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No Active Vaults</h3>
                        <p className="text-muted-foreground mb-6">
                            You don&apos;t have any automated DCA strategies running yet. 
                            Create your first automation to start earning yield automatically.
                        </p>
                        <Button 
                            onClick={() => router.push('/vault/create')}
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Automation
                        </Button>
                    </div>
                </div>
            )}

            {/* Additional Info Section */}
            {vaults && vaults.length > 0 && (
                <div className="mt-12 p-6 bg-muted/30 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Managing Your Vaults</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                        <div>
                            <h4 className="font-medium mb-2">Monitoring</h4>
                            <p>Track your automation progress, execution history, and accumulated yield in real-time.</p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Modifications</h4>
                            <p>Adjust your strategy parameters, pause executions, or cancel automations at any time.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
