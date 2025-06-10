'use client'
import toast, { Toaster } from "react-hot-toast"; // Import toast library
import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import LoadingButton from "@/components/loadingButton"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log(data, error);

    if (error) {
       toast.error(error.message)
    } else {
      toast.success('Has iniciado sesión correctamente.')
      router.push('/')
    }

    setLoading(false)
  }

  return (
    <div className="w-full max-w-md p-4 mx-auto my-10">
      <h2 className="text-xl font-semibold">Iniciar sesión</h2>
      <form onSubmit={handleLogin}>
        <input
          className="mt-1 mb-2 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="mt-1 mb-2 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <LoadingButton
          loading={loading}
          text="Ingresar"
          loadingText="Ingresando..."
        />
      </form>
    </div>
  )
}
