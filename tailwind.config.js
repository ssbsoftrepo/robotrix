/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'dark-maroon': '#6D282C',
                'dark-maroon-hover': '#893338',
                'dark-maroon-light': '#ff8fa3',
            },
            fontFamily: {
                'roboto': ['Roboto', 'sans-serif'],
                'roboto-condensed': ['Roboto Condensed', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
