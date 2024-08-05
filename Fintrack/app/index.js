import React, { useEffect, useState } from "react";
import axios from "axios";
import { useColorScheme, StatusBar, Appearance } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import Navigation from "./components/navigation";
import { ThemeProvider, useTheme } from "./context/themeContext";

axios.defaults.baseURL = process.env.EXPO_PUBLIC_SERVER_URL;

// const Stack = createNativeStackNavigator();
// const image = { uri: "https://picsum.photos/1600/900" };

export default function Page() {

  const [fontsLoaded] = useFonts({
    Urbanist: require("../assets/fonts/Urbanist-VariableFont_wght.ttf"),
    Inter: require("../assets/fonts/Inter-VariableFont_opsz,wght.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </>
  );
}

const ThemedApp = () => {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar
        backgroundColor={theme.background}
        barStyle={theme.statusBarStyle}
      />
      <Navigation />
    </>
  );
};
