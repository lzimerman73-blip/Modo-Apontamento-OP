import { MD3LightTheme as DefaultTheme } from "react-native-paper";

export const ModoTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#00D1A3", // Verde Modo
    secondary: "#255E72", // Verde Escuro
    background: "#f5f7fa", // Cinza claro de fundo
    surface: "#ffffff", // Branco para os cards
    error: "#B00020",
    outline: "#79747e",
  },
};
