'use client'
import toast, { Toaster } from "react-hot-toast"; // Import toast library
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('confirming') // o 'error', 'success'

  useEffect(() => {
    const confirmEmail = async () => {
      const toastId = toast.loading('Confirmando correo…');

      const token = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (!token || type !== 'email') {
        toast.error('Parámetros inválidos', { id: toastId })
        return
      }

      const { data, error } = await supabase.auth.verifyOtp({
        type: 'email',
        token_hash: token,
      })

      if (error) {
        toast.error('Error al confirmar el correo: ' + error.message, { id: toastId })
        setStatus('error')
      } else {
        toast.success('¡Correo confirmado! Redirigiendo...', { id: toastId })
        setTimeout(() => {
          router.push('/login') // o donde quieras
        }, 3000)
      }
    }

    confirmEmail()
  }, [searchParams, router])

  return (
    <div className="p-4">
    </div>
  )
}
