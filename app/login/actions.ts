'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Get invite parameters from the URL
  const searchParams = new URLSearchParams(formData.get('searchParams') as string)
  const isInvited = searchParams.get('invited') === 'true'
  const inviteCode = searchParams.get('code')
  const inviteType = searchParams.get('type')
  const fromNodeId = searchParams.get('from')

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/', 'layout')

  // If this was from an invite, redirect to profile with invite parameters
  if (isInvited && inviteCode && inviteType && fromNodeId) {
    redirect(`/profile?invited=true&code=${inviteCode}&type=${inviteType}&from=${fromNodeId}`)
  } else {
    redirect('/profile')
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Get invite parameters from the URL
  const searchParams = new URLSearchParams(formData.get('searchParams') as string)
  const isInvited = searchParams.get('invited') === 'true'
  const inviteCode = searchParams.get('code')
  const inviteType = searchParams.get('type')
  const fromNodeId = searchParams.get('from')

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/', 'layout')

  // If this was from an invite, redirect to profile with invite parameters
  if (isInvited && inviteCode && inviteType && fromNodeId) {
    redirect(`/profile?invited=true&code=${inviteCode}&type=${inviteType}&from=${fromNodeId}`)
  } else {
    redirect('/profile')
  }
}