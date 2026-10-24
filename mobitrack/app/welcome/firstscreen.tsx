import { View, Text, StyleSheet } from "react-native";

export default function FirstScreen(){

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Hello from onboarding screen
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container:{
        flex:1
    },
    title:{
        textAlign:'center'
    },
});