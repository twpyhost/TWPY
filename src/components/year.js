"use client";

const YearFilterDropdown = ({ selectedYear, anos }) => {
  const years = anos;

  return (
    <select
      name="year"
      defaultValue={selectedYear}
      onChange={(e) => {
        window.location.search = `?year=${e.target.value}`;
      }}
      className="mb-4 flex w-3/4 max-w-xs bg-black text-center text-2xl"
    >
      <option value="all">Todos</option>
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
};

export default YearFilterDropdown;

// maybe wrap it all in <form>
