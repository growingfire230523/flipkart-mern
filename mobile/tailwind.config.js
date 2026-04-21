/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: "#875c43",
          lightGreen: "#2f6f4e",
          green: "#2a5f44",
          yellow: "#d6b36a",
          orange: "#b76e79",
          darkBlue: "#24171a",
          grey: "#7b6f6a",
        },
        cream: "#fbf6f2",
      },
      fontFamily: {
        roboto: ["Roboto"],
        "roboto-medium": ["Roboto-Medium"],
        "roboto-bold": ["Roboto-Bold"],
        brand: ["CormorantGaramond"],
        "brand-medium": ["CormorantGaramond-Medium"],
        "brand-semibold": ["CormorantGaramond-SemiBold"],
        "brand-bold": ["CormorantGaramond-Bold"],
      },
      fontSize: {
        xs:   ['13px', { lineHeight: '18px' }],
        sm:   ['15px', { lineHeight: '22px' }],
        base: ['17px', { lineHeight: '26px' }],
        lg:   ['19px', { lineHeight: '28px' }],
        xl:   ['22px', { lineHeight: '30px' }],
        '2xl':['26px', { lineHeight: '34px' }],
        '3xl':['30px', { lineHeight: '38px' }],
        '4xl':['36px', { lineHeight: '44px' }],
      },
    },
  },
  plugins: [],
};
