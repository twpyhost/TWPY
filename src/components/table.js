export default function Table({ children, columns }) {
  return (
    <div className={`grid ${columns} w-full justify-center text-xl`}>
      {children}
    </div>
  );
}

// Maybe usar use effect después para evitar bug de no cargar columns
