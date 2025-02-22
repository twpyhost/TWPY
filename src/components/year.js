"use client";
import { useState, useEffect } from "react";
import { getFiltroAno } from "@/app/utils/db";

export default function YearFilter({}) {
  const [anos, setAnos] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");

  useEffect(() => {
    const fetchAnos = async () => {
      const anos = await getFiltroAno();
      setAnos(anos);
    };
    fetchAnos();
  }, []);

  const handleChange = (event) => {
    setSelectedYear(event.target.value);
  };

  return (
    <div>
      <label htmlFor="year-select">Filtro por año </label>
      <select id="year-select" value={selectedYear} onChange={handleChange}>
        <option value="all">Todos</option>
        {anos.map((ano, index) => (
          <option key={index} value={ano.year}>
            {ano.year}
          </option>
        ))}
      </select>
      <p>Selected Year: {selectedYear}</p>
    </div>
  );
}
