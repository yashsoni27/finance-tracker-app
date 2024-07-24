import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

const FooterItem = ({ name, text, handlePress, screenName, routeName }) => {
  const activeScreenColor = screenName === routeName && "darkmagenta";

  return (
    <TouchableOpacity onPress={handlePress}>
      <FontAwesome5 name={name} size={25} style={styles.fontStyle} color={activeScreenColor} />
      <Text style={styles.textStyle}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fontStyle: {
    marginBottom: 5,
    alignSelf: "center",
  },
  textStyle: {
    fontSize: 12,
    textAlign: "center",
    textTransform: "uppercase",
  },
});

export default FooterItem;
