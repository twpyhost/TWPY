export default function Table({ children, columns }) {
  return (
    <div
      className={`grid ${columns} w-full justify-center text-xl sm:text-3xl md:w-full md:max-w-screen-sm lg:max-w-screen-lg`}
    >
      {children}
    </div>
  );
}

// Maybe usar use effect después para evitar bug de no cargar columns
