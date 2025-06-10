'use client'
import toast, { Toaster } from "react-hot-toast"; // Import toast library
import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import LoadingButton from "@/components/loadingButton";

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Usuario registrado. Revisa tu correo para confirmar el registro.')
    }

    setLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 my-10">
      <h1 className="text-xl font-semibold">Registro</h1>
      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 mb-2 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 mb-2 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
        />
        {
        /*<button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
            </button>*/
        }

        <LoadingButton loading={loading} text="Registrarse" loadingText="Registrando..." />
      </form>
    </div>
  )
}
