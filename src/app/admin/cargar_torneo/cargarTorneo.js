'use client';
import toast, { Toaster } from "react-hot-toast"; // Import toast library
import { useState } from "react";
import LoadingButton from "@/components/loadingButton";


export default function CargarTorneo() {
  const [url, setUrl] = useState(""); // State to hold the URL
  const [loading, setLoading] = useState(false); // To show loading state
  const [loadingInsert, setLoadingInsert] = useState(false); // To show loading state
  const [tournament, setTournament] = useState(null); // State to store tournament details

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission

    setLoading(true); // Set loading to true when the request starts
    setTournament(null); // Reset previous tournament data

    try {
      const response = await fetch("/api/previsualizar_torneo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const responseData = await response.json(); // Parse JSON response
      console.log(responseData); 

      if (!response.ok) {
        throw new Error(responseData.error || "Error desconocido al cargar el torneo");
      }
      toast.success(responseData.message || "Solicitud exitosa"); // Show success toast
      //setUrl(""); // Clear input field

      const torneo = responseData.data.tournament;
      setTournament({
        juego: torneo.game_name,
        nombre: torneo.name,
        cantidad_de_participantes: torneo.participants_count,
        url_challonge: torneo.url,
        id_torneo: torneo.id,
      });

    } catch (error) {
      toast.error(error.message); // Display error if the request fails
    } finally {
      setLoading(false); // Set loading to false when the request is done
    }
  };

  // Handle form submission
  const handleSubmitTorneo = async (e) => {
    try {
      e.preventDefault(); // Prevent the default form submission
      setLoadingInsert(true); // Set loading to true when the request starts
      toast.success("No se hizo nada");
      setTournament(null);
    }
    catch (error) {
      toast.error(error.message); // Display error if the request fails
    }
    finally {
      setLoadingInsert(false); // Set loading to false when the request is done
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-4">
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
            required
            placeholder="https://challonge.com/abcdefgh"
          />
        </div>
        
        <LoadingButton loading={loading} text="Previsualizar" loadingText="Obteniendo datos..." />
      </form>

      {tournament && (
        <div className="mt-4 p-4 border border-gray-300 rounded-md">
          <form onSubmit={handleSubmitTorneo}>
            <div className="mb-4">
              <h2 className="text-center text-lg font-semibold">Detalles del Torneo</h2>
              {Object.entries(tournament).map(([key, value]) => (
                <p key={key}>
                  <strong>{key.replace(/_/g, " ")}:</strong> {value}
                </p>
              ))}
              <input
                type="text"
                id="url_challonge"
                value={tournament.url_challonge}
                readOnly
              />
            </div>
            <LoadingButton loading={loadingInsert} text="Insertar Torneo" loadingText="Insertando..." />
          </form>
        </div>
      )}
    </div>
  );
}
