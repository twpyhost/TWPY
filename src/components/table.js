export default function Table({ children, columns }) {
  return (
    <div
      className={`grid ${columns} w-full justify-center sm:w-3/4 sm:text-3xl`}
    >
      {children}
    </div>
  );
}

// Maybe usar use effect después para evitar bug de no cargar columns
