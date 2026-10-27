
import { LanguageSwitcher } from "@/components/language/languageswitche";
import { FontAwesome5 } from "@expo/vector-icons";

import { View, StyleSheet, Text, Platform, SafeAreaView, Image

} from "react-native";

const logo = require('../../assets/images/logo.png');
export default function SecondScreen(){

    return(
        <SafeAreaView style={styles.container}>
           {/* start of header section */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View>
                    <Image source={logo} style={styles.logoImage} />
                    </View>
                    <Text style={styles.logoText}>
                        Pharmatrack
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.skipText}>Skip</Text>
                    <LanguageSwitcher compact />
                </View>
            </View>
           {/* end of header section */}

        


        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    container:{
        flex:1,
        backgroundColor:'#FFFFFF'

    },
    header:{
        flexDirection:'row',
        justifyContent:'space-between',
        paddingTop: Platform.OS === 'android' ? 40 :undefined,
        paddingHorizontal:24,
        alignItems:'center',
        paddingBottom:24
    },
    logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    backgroundColor: '#2A7B6F',
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2926',
  },
  skipText: {
    color: '#667085',
    fontSize: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoImage:{
        height:40,
        width:50
  }
})