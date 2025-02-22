"use client";
import { useState } from "react";

export default function YearFilter({}) {
  const [selectedYear, setSelectedYear] = useState("all");
  const handleChange = (event) => {
    setSelectedYear(event.target.value);
  };

  return (
    <div>
      <label htmlFor="year-select">Filter by Year: </label>
      <select id="year-select" value={selectedYear} onChange={handleChange}>
        <option value="all">Todos</option>
        <option value="2024">2024</option>
        <option value="2025">2025</option>
      </select>
      <p>Selected Year: {selectedYear}</p>
    </div>
  );
}
