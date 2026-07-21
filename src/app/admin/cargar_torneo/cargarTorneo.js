"use client";
import toast, { Toaster } from "react-hot-toast";
import { useState } from "react";
import LoadingButton from "@/components/loadingButton";

export default function CargarTorneo() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInsert, setLoadingInsert] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [resumen, setResumen] = useState(null);

  // Paso 1: previsualizar el torneo desde Challonge
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setTournament(null);
    setResumen(null);

    try {
      const response = await fetch("/api/previsualizar_torneo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || "Error desconocido al cargar el torneo",
        );
      }
      toast.success(responseData.message || "Solicitud exitosa");

      const torneo = responseData.data.tournament;
      setTournament({
        juego: torneo.game_name,
        nombre: torneo.name,
        cantidad_de_participantes: torneo.participants_count,
        estado: torneo.state,
        url_challonge: torneo.url,
        id_torneo: torneo.id,
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: insertar el torneo previsualizado en la base de datos
  const handleSubmitTorneo = async (e) => {
    e.preventDefault();
    setLoadingInsert(true);

    try {
      const response = await fetch("/api/admin/insertar_torneo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || "Error desconocido al insertar el torneo",
        );
      }

      toast.success(responseData.message || "Torneo insertado");
      setResumen(responseData.resumen);
      setTournament(null);
      setUrl("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingInsert(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <h1 className="text-xl font-semibold">Cargar Torneo</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="url" className="block text-sm font-medium">
            Ingrese la URL del Torneo
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
            required
            placeholder="https://challonge.com/abcdefgh"
          />
        </div>

        <LoadingButton
          loading={loading}
          text="Previsualizar"
          loadingText="Obteniendo datos..."
        />
      </form>

      {tournament && (
        <div className="mt-4 rounded-md border border-gray-300 p-4">
          <form onSubmit={handleSubmitTorneo}>
            <div className="mb-4">
              <h2 className="text-center text-lg font-semibold">
                Detalles del Torneo
              </h2>
              {Object.entries(tournament).map(([key, value]) => (
                <p key={key}>
                  <strong>{key.replace(/_/g, " ")}:</strong> {value}
                </p>
              ))}
            </div>
            <LoadingButton
              loading={loadingInsert}
              text="Insertar Torneo"
              loadingText="Insertando..."
            />
          </form>
        </div>
      )}

      {resumen && (
        <div className="mt-4 rounded-md border border-green-500 p-4">
          <h2 className="text-center text-lg font-semibold">
            Torneo insertado
          </h2>
          <p>
            <strong>Torneo:</strong> {resumen.torneo}
          </p>
          <p>
            <strong>Fecha:</strong> {resumen.fecha} (temporada{" "}
            {resumen.temporada})
          </p>
          <p>
            <strong>Resultados cargados:</strong> {resumen.resultados}
          </p>
          <p>
            <strong>Usuarios nuevos:</strong> {resumen.usuarios_creados} (
            {resumen.usuarios_temporales} temporales)
          </p>
          {resumen.advertencias?.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-yellow-400">Advertencias:</p>
              <ul className="list-inside list-disc text-sm">
                {resumen.advertencias.map((advertencia, index) => (
                  <li key={index}>{advertencia}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
