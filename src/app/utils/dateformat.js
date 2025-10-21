function formatDate(date) {
  const [year, month, day] = date.split("-"); // Assuming input is "YYYY-MM-DD"
  return `${day}/${month}/${year}`;
}

async function getFormattedTorneos(data) {
  return data.map((torneo) => ({
    ...torneo,
    fecha_torneo: formatDate(torneo.fecha_torneo),
  }));
}

export { getFormattedTorneos };
