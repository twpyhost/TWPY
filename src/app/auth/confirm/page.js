import Link from "next/link";

export default function ConfirmEmailPage() {
  return (
    <div className="mx-auto my-10 w-full max-w-md p-4">
      <h1 className="text-xl font-semibold">Confirmacion deshabilitada</h1>
      <p className="my-4">
        La confirmacion por correo esta deshabilitada mientras el proyecto
        trabaja sin Supabase.
      </p>
      <Link href="/auth/login" className="text-blue-300 hover:text-blue-100">
        Ir al login admin
      </Link>
    </div>
  );
}
