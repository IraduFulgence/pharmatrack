import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

export default function TabLayout(){

  return (
    <Tabs 
    screenOptions={{
      headerShown:false,
      tabBarActiveTintColor:'#206B5F',
      tabBarInactiveTintColor:'#98A2B3',

      tabBarStyle:{
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F2F4F7',
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          elevation:0,
          shadowOpacity:0,
      },
      tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
    }}
    >
      <Tabs.Screen
      name="home"
      options={{
        title:'Home',
            tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
      }}
      />
    </Tabs>
  )
}