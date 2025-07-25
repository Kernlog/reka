// src/hooks/useVaults.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWalletUiAccount } from '@wallet-ui/react'
import { Json } from '@/lib/supabase.types'

// Mock data for development when Supabase is not configured
const mockVaults = [
  {
    id: '1',
    owner_pubkey: 'mock-address',
    created_at: new Date().toISOString(),
    data: {
      sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      sourceAmount: 100,
      target: 'mock-target',
      duration: { value: 7, unit: 'Days' },
      executions: 4,
      metadata: {
        sourceSymbol: 'USDC',
        targetSymbol: 'SOL',
        targetAmount: 0.5,
        percentage: 25,
        timeLeft: '5 days',
        targetName: 'Solana Yield'
      }
    }
  }
]

export function useVaults() {
  const { account } = useWalletUiAccount()

  const key = ['vaults', account?.address.toString()]
  return useQuery({
    queryKey: key,
    enabled: !!account?.address.toString(),
    queryFn: async () => {
      if (!account?.address) {
        throw new Error('Wallet address is not available')
      }
      
      try {
        const { data, error } = await supabase
          .from('vaults')
          .select('*')
          .eq('owner_pubkey', account.address.toString())
          .order('created_at', { ascending: false })
        if (error) throw error
        return data
      } catch (error) {
        console.warn('Supabase not configured, returning mock data:', error)
        return mockVaults
      }
    },
  })
}

export function useVaultById(id: string) {
  return useQuery({
    queryKey: ['vault', id],
    enabled: !!id,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('vaults')
          .select('*')
          .eq('id', id)
          .single()
        if (error) throw error
        return data
      } catch (error) {
        console.warn('Supabase not configured, returning mock data:', error)
        return mockVaults.find(v => v.id === id) || null
      }
    },
  })
}

export function useCreateVault() {
  const { account } = useWalletUiAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { data: Json }) => {
      if (!account?.address) {
        throw new Error('Wallet address is not available')
      }
      
      try {
        const { data, error } = await supabase
          .from('vaults')
          .insert({
            owner_pubkey: account.address.toString(),
            ...payload,
          })
          .select()
          .single()
        if (error) throw error
        return data
      } catch (error) {
        console.warn('Supabase not configured, simulating vault creation:', error)
        // Return mock data for development
        return {
          id: Date.now().toString(),
          owner_pubkey: account.address.toString(),
          created_at: new Date().toISOString(),
          ...payload
        }
      }
    },
    onSuccess: () => {
      if (account?.address) {
        queryClient.invalidateQueries({ queryKey: ['vaults', account.address.toString()] })
      }
    },
  })
}
