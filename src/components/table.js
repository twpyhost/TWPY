export default function Table({ children, columns }) {
  return (
    <div className={`grid grid-cols-${columns} justify-center w-full p-4`}>
      {children}
    </div>
  );
}
