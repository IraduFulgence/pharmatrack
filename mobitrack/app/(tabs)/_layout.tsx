import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/topheader/AppHeader";
import { useInactivityLogout } from "@/src/session/inactivity";

// Title for screens opened with a name, e.g. a pharmacy or a chat.
const paramTitle = (route: any, fallback: string) =>
  typeof route?.params?.name === "string" && route.params.name.trim() ? route.params.name : fallback;
export default function TabLayout(){

  const {t} = useTranslation();
  // Signed out after 5 minutes without a touch (see src/session/inactivity.ts).
  const onActivity = useInactivityLogout();

  return (
    // Every touch anywhere in the logged-in app counts as activity (without taking the touch).
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => { onActivity(); return false; }}
    >
    <Tabs 
    backBehavior="history"
    screenOptions={{
      // One header for every logged-in screen: back button, title, cart and account menu.
      headerShown:true,
      header: (props) => <AppHeader {...props} />,
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
        title:t('Navbar.Home'),
            tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
      }}
      />
      <Tabs.Screen
      name="search"
      options={{
        title:t('Navbar.Search'),
            tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
      }}
      />
      <Tabs.Screen
      name="profile"
      options={{
        title:t('Navbar.profile'),
            tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people"} size={24} color={color} />
          ),
      }}
      />
       <Tabs.Screen
      name="marketplace"
      options={{
        title:t('Navbar.market'),
            tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "storefront" : "storefront-outline"} size={24} color={color} />
          ),
      }}
      />
      <Tabs.Screen 
  name="chat/index" 
  options={{ 
    title:t('Navbar.message'), 
    tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} /> 
  }} 
/>
     <Tabs.Screen 
  name="chat/[id]" 
  options={({ route }) => ({ href: null, title: paramTitle(route, t("chat.title", "Messages")) })} 
   />
   <Tabs.Screen
      name="orders/index"
      options={{ href: null, title: t("orders.title", "My orders") }}
   />
    <Tabs.Screen
      name="orders/[id]"
      options={({ route }: any) => ({ href: null, title: `${t("orders.order", "Order")} #${route?.params?.id ?? ""}` })}
   />
   <Tabs.Screen
      name="pharmacy/[id]"
      options={({ route }) => ({ href: null, title: paramTitle(route, t("pharmacy.title", "Pharmacy")) })}
   />
   <Tabs.Screen
      name="cart"
      options={{ href: null, title: t("cart.title", "Your cart") }}
   />
   <Tabs.Screen
      name="product/[id]"
      options={{ href: null, title: t("product.title", "Product details") }}
   />
   <Tabs.Screen
      name="prescription"
      options={{ href: null, title: t("rxLookup.title", "My prescription") }}
   />
   <Tabs.Screen
      name="family"
      options={{ href: null, title: t("family.title", "My family") }}
   />

    </Tabs>
    </View>
  )
}