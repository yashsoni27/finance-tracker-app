import React from "react";
import axios from "axios";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme, StatusBar } from "react-native";
import Navigation from "./components/navigation";

axios.defaults.baseURL = process.env.EXPO_PUBLIC_SERVER_URL;

const Stack = createNativeStackNavigator();

// const image = { uri: "https://picsum.photos/1600/900" };

export default function Page() {
  // const scheme = useColorScheme();
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Navigation />
    </>
  );
}
