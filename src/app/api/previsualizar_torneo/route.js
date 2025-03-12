// src/app/api/cargar_torneo/route.js

export async function POST(req) {
  try {
    const { url } = await req.json(); // Extract the URL from the request body

    if (!url) {
      return new Response(JSON.stringify({ error: "Se requiere la URL" }), { status: 400 });
    }

    // Extract the tournament ID from the URL
    const tournamentId = extractTournamentId(url);
    if (!tournamentId) {
      return new Response(JSON.stringify({ error: "URL no válida" }), { status: 400 });
    }

    // Call the Challonge API with the tournament ID
    const apiResponse = await fetchChallongeApi(tournamentId);
    if (!apiResponse.ok) {
      const errorMessage = await apiResponse.text(); // Get error details from response body
      return new Response(JSON.stringify({ error: errorMessage }), { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    return new Response(JSON.stringify({ message: "Torneo encontrado exitosamente", data: data }), { status: 200 });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Ocurrió un error al procesar la URL" }), { status: 500 });
  }
}

// Function to extract the tournament ID from the URL
function extractTournamentId(url) {
  const regex = /challonge\.com\/(?:es\/)?([a-z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null; // Return the tournament ID if found
}

// Function to call the Challonge API with the tournament ID
async function fetchChallongeApi(tournamentId) {
  const apiKey = process.env.CHALLONGE_API_KEY; // Replace with your API key
  const apiUrl = `https://api.challonge.com/v1/tournaments/${tournamentId}.json?api_key=${apiKey}&include_participants=1`;

  try {
    const response = await fetch(apiUrl);
    return response;
  } catch (error) {
    console.error("Error fetching Challonge API:", error);
    return null;
  }
}
