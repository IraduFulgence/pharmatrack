import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { Linking, AppState } from "react-native";

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Prevent overlapping requests (mount effect + AppState effect + manual retry)
  const inFlightRef = useRef(false);

  const requestlocation = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Location services (GPS) enabled?
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setHasPermission(false);
        setLocation(null);
        setErrorMessage("Location is disabled. Please enable it in settings.");
        return;
      }

      // Foreground permission — will prompt the user if not yet decided
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        setLocation(null);
        setErrorMessage("Permission on location was denied!");
        return;
      }
      setHasPermission(true);

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
      setHasPermission(true);
      setErrorMessage(null);
    } catch (error) {
      console.error("useLocation.requestlocation error:", error);
      setErrorMessage("Failed to get location. Please try again.");
      setHasPermission(false);
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // On mount: check current permission, then ALWAYS attempt to request.
  // requestlocation() will prompt the user if permission has not been granted yet,
  // and will fetch the location if it already has been.
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === "granted");
      await requestlocation();
    })();
  }, [requestlocation]);

  // Re-check when app returns to foreground (e.g. user enabled location in Settings)
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState !== "active") return;

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        const { status } = await Location.getForegroundPermissionsAsync();

        if (!servicesEnabled || status !== "granted") {
          setHasPermission(false);
          setLocation(null);
          return;
        }

        // Permission is now granted. If we don't have a location yet, fetch it.
        setHasPermission(true);
        if (!location) {
          await requestlocation();
        }
      } catch (e) {
        console.error("AppState location check failed:", e);
      }
    });

    return () => sub.remove();
  }, [location, requestlocation]);

  const openSetting = useCallback(() => {
    Linking.openSettings();
  }, []);

  return {
    location,
    hasPermission,
    errorMessage,
    isLoading,
    requestlocation,
    openSetting,
  };
}