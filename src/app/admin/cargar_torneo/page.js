import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabaseServer'

export default async function PrivatePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  console.log(data)
  console.log(error)
  if (error || !data?.user) {
    redirect('/login')
  }

  return <p>Hello {data.user.email}</p>
}
