import forms from "@tailwindcss/forms";

export default {
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      width: {
        sidebar: "320px",
      },
    },
  },
  variants: {
    extend: {
      borderRadius: ["first", "last"],
    },
  },
  plugins: [forms],
};
