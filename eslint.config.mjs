import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "Ridgepeak_Fortress_Research/**",
      "public/downloads/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
];
export default config;
