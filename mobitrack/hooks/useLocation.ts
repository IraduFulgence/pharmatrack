import { useState, useEffect, useCallback } from "react";
import * as Location from 'expo-location';
import { Alert, Linking, AppState } from "react-native";

export function useLocation(){
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // request location permission

    const requestlocation = useCallback(async () =>{
        setIsLoading(true);
        setErrorMessage(null);

        try {
            // we check if location services are enabled on the device
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setHasPermission(false);
                setErrorMessage('Location is disabled. Please enable it in settings.');
                setIsLoading(false);
                return;
            }

            // request foreground permissions
            const {status} = await Location.requestForegroundPermissionsAsync();
            if(status !== 'granted'){
                setHasPermission(false);
                setErrorMessage('Permission on location was denied!');
                setIsLoading(false);
                return;
            }
            setHasPermission(true);

            // get current location
            const currentlocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setLocation(currentlocation);
        
        } catch (error) {
            setErrorMessage('Failed to get location. Please try again.');
            setHasPermission(false);
        }
        finally{
            setIsLoading(false);
        }
    }, []);

    // check permission status on app starting
    useEffect(() =>{
        (async () =>{
            const {status} = await Location.getForegroundPermissionsAsync();
            setHasPermission(status === 'granted');
            if(status ==='granted'){
                requestlocation();
            }
        })();
    },[requestlocation]);

    // always check if the location is off while using the app
    useEffect(()=>{
        const sub = AppState.addEventListener('change',async (nextAppState) =>{
            if (nextAppState === 'active'){
                // whenever app is on foreground,check if location is on
                 const servicesEnabled = await Location.hasServicesEnabledAsync();
                 const { status } = await Location.getForegroundPermissionsAsync();
                if (!servicesEnabled || status !== 'granted') {
          setHasPermission(false);
        } else if (hasPermission && !location) {
          // If they turned it back on and we don't have a location yet, fetch it
          requestlocation();
        }
            }
        });
        return () =>{
            sub.remove();
        }
    },[hasPermission,location, requestlocation]);

    // helper to open device settings

    const openSetting = () =>{
        Linking.openSettings();
    };

    return {
        location,
        hasPermission,
        errorMessage,
        isLoading,
        requestlocation,
        openSetting,
    };
}   