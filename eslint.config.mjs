import nextPlugin from "eslint-config-next";

const nextConfig = [...nextPlugin];

export default [
  ...nextConfig,
  {
    // playwright-report/ y test-results/ son salida de la suite (JS
    // bundleado del reporte HTML, trazas, videos): no es codigo del proyecto.
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "blob-report/**",
    ],
  },
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
