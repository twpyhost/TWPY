import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import CargarTorneo from './cargarTorneo'

export default async function PrivatePage() {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) redirect('/error')
  if (!authData?.user) redirect('/login')

  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')                     // tabla intermedia
    .select('role_id, roles(name)')        // seleccionamos el ID del rol y su nombre desde la tabla "roles"
    .eq('user_id', authData.user.id) 

  if (rolesError) redirect('/error')

  const esAdmin = rolesData?.some(r => r.roles?.name === 'admin_challonge')
  if (!esAdmin) redirect('/no-autorizado')

  return <CargarTorneo></CargarTorneo>
}
