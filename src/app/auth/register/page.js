'use client'
import toast, { Toaster } from "react-hot-toast"; // Import toast library
import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import LoadingButton from "@/components/loadingButton";

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (password !== passwordConfirm) {
      toast.error("Las contraseñas no son idénticas, verifique.")
      setLoading(false)
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      toast.error(error.message)
    } else {
      setEmail('')
      setPassword('')
      setPasswordConfirm('')
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
          placeholder="Ingrese un correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 mb-2 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          
        />
        <input
          type="password"
          placeholder="Ingrese una contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 mb-2 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
        />
        <input
          type="password"
          placeholder="Vuelva a ingresar la contraseña"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
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
