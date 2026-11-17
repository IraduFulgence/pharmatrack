import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useLocation } from "@/hooks/useLocation";
import { Pharmacy, pharmacyService } from "@/src/api/pharmacy/pharmacyService";
import { useTranslation } from "react-i18next";

const logo = require("../../assets/images/Green-logo.png");

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const NEARBY_RADIUS_KM = 5;

// Simulated function for fetching prescription by code
const mockFetchPrescription = async (code: string) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (code === "SMS-123") {
    return [{ name: "Paracetamol", quantity: 10 }];
  }
  throw new Error("Invalid code. Try 'SMS-123' for testing.");
};

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    location,
    hasPermission,
    isLoading: isLocating,
    requestlocation,
    openSetting,
  } = useLocation();

  // State
  const [nearbyPharmacies, setNearbyPharmacies] = useState<
    (Pharmacy & { distanceKm?: number })[]
  >([]);
  const [otherPharmacies, setOtherPharmacies] = useState<
    (Pharmacy & { distanceKm?: number })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("there");
  const [userInitials, setUserInitials] = useState("U");

  // Modals State
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [prescriptionCode, setPrescriptionCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Guard against duplicate fetches (mount + AppState re-trigger)
  const fetchingRef = useRef(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userString = await SecureStore.getItemAsync("user");
        if (userString) {
          const user = JSON.parse(userString);
          const name = user.fullName || "User";
          setUserName(name.split(" ")[0]);
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
          setUserInitials(initials || "U");
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const fetchNearbyPharmacies = useCallback(
    async (latitude: number, longitude: number) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        setIsLoading(true);
        const response = await pharmacyService.getNearbyPharmacies(
          latitude,
          longitude
        );

        const pharmacyList =
          response.data?.pharmacies || response.pharmacies || [];

        const sortedPharmacies = pharmacyList
          .filter(
            (p: Pharmacy) =>
              !p.verificationStatus ||
              p.verificationStatus === "APPROVED" ||
              p.verification_status === "APPROVED"
          )
          .map((p: Pharmacy) => ({
            ...p,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            distanceKm: calculateDistance(
              latitude,
              longitude,
              Number(p.latitude),
              Number(p.longitude)
            ),
          }))
          .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

        const withinRadius = sortedPharmacies.filter(
          (p) => (p.distanceKm || 0) <= NEARBY_RADIUS_KM
        );
        const outsideRadius = sortedPharmacies.filter(
          (p) => (p.distanceKm || 0) > NEARBY_RADIUS_KM
        );

        setNearbyPharmacies(withinRadius);
        setOtherPharmacies(outsideRadius);
      } catch (error: any) {
        console.error("Fetch Error:", error);
        Alert.alert("Connection Error", "Could not load nearby pharmacies.");
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    },
    []
  );

  // Fetch pharmacies whenever we have permission + location
  useEffect(() => {
    if (hasPermission === null) return; // still determining

    if (hasPermission && location) {
      fetchNearbyPharmacies(location.coords.latitude, location.coords.longitude);
    } else {
      // No permission OR no location yet — don't leave the spinner hanging
      setNearbyPharmacies([]);
      setOtherPharmacies([]);
      setIsLoading(false);
    }
  }, [hasPermission, location, fetchNearbyPharmacies]);

  // Handle Code Redemption
  const handleRedeemCode = async () => {
    if (!prescriptionCode.trim()) {
      Alert.alert("Error", "Please enter the code from your SMS.");
      return;
    }

    try {
      setIsVerifyingCode(true);
      const prescribedMedicines = await mockFetchPrescription(
        prescriptionCode.trim()
      );

      setIsCodeModalVisible(false);
      setPrescriptionCode("");

      const firstMedicine = prescribedMedicines[0].name;
      router.push({
        pathname: "/search",
        params: { initialQuery: firstMedicine },
      });
    } catch (error: any) {
      Alert.alert("Invalid Code", error.message);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleLogout = async () => {
    setIsMenuVisible(false);
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");
    router.replace("/auth/login");
  };

  const PharmacyCard = ({
    item,
  }: {
    item: Pharmacy & { distanceKm?: number };
  }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: `/pharmacy/${item.pharnacy_id}`,
          params: {
            name: item.pharmacyName || item.pharmacy_name,
            address: item.locationAddress || item.location_address,
            latitude: item.latitude,
            longitude: item.longitude,
          },
        })
      }
    >
      <View style={styles.cardIconContainer}>
        <FontAwesome5 name="clinic-medical" size={20} color="white" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>
          {item.pharmacyName || item.pharmacy_name}
        </Text>
        <View style={styles.statusRow}>
          <Text style={styles.hoursText}>
            {" "}
            {item.locationAddress || item.location_address || "Kigali"}
          </Text>
        </View>
      </View>
      {item.distanceKm !== undefined && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {item.distanceKm.toFixed(1)} km
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderLocationFallback = () => {
    // GPS off
    if (!hasPermission && isLocating === false) {
      return (
        <View style={styles.noNearbyContainer}>
          <Ionicons name="location-outline" size={28} color="#F59E0B" />
          <Text style={styles.noNearbyTitle}>
            {t(
              "homescreen.locationOff",
              "Location is needed to find pharmacies near you"
            )}
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
            <TouchableOpacity
              onPress={requestlocation}
              style={[styles.fallbackBtn, { backgroundColor: "#007a55" }]}
            >
              <Text style={styles.fallbackBtnText}>
                {t("homescreen.retry", "Try again")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openSetting}
              style={[styles.fallbackBtn, { backgroundColor: "#344054" }]}
            >
              <Text style={styles.fallbackBtnText}>
                {t("homescreen.openSettings", "Open settings")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
          <TouchableOpacity
            onPress={() => setIsMenuVisible(true)}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchContainer}
          onPress={() => router.push("/search")}
          activeOpacity={0.8}
        >
          <Feather
            name="search"
            size={20}
            color="#98A2B3"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.searchPlaceholder}>
            {t("homescreen.searchPlaceholder")}
          </Text>
        </TouchableOpacity>

        {/* Redeem Prescription Code */}
        <TouchableOpacity
          style={styles.uploadCard}
          onPress={() => setIsCodeModalVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.uploadContent}>
            <View style={styles.uploadIconContainer}>
              <FontAwesome5 name="sms" size={24} color="white" />
            </View>
            <View style={styles.uploadTextContainer}>
              <Text style={styles.uploadTitle}>
                {t("homescreen.havePrescription", "Have a prescription?")}
              </Text>
              <Text style={styles.uploadSubtitle}>
                {t(
                  "homescreen.preMessage",
                  "Enter the SMS code from your hospital."
                )}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#007a55" />
          </View>
        </TouchableOpacity>

        {/* Pharmacies Section */}
        {hasPermission === null || isLoading || isLocating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007a55" />
            <Text style={styles.loadingText}>
              {t(
                "homescreen.loadingPharmacies",
                "Finding pharmacies near you..."
              )}
            </Text>
          </View>
        ) : (
          <>
            {renderLocationFallback()}

            {hasPermission && nearbyPharmacies.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {t("homescreen.PhaNear", "Pharmacies near you")}
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {nearbyPharmacies.length} {t("homescreen.Found", "found")}
                  </Text>
                </View>
                {nearbyPharmacies.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} item={pharmacy} />
                ))}
              </>
            )}

            {hasPermission && nearbyPharmacies.length === 0 && (
              <View style={styles.noNearbyContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={28}
                  color="#F59E0B"
                />
                <Text style={styles.noNearbyTitle}>
                  {t("homescreen.notFound", "No pharmacies within 5 km")}
                </Text>
              </View>
            )}

            {hasPermission && otherPharmacies.length > 0 && (
              <>
                <View
                  style={[
                    styles.sectionHeader,
                    { marginTop: nearbyPharmacies.length > 0 ? 24 : 0 },
                  ]}
                >
                  <Text style={styles.sectionTitle}>
                    {nearbyPharmacies.length > 0
                      ? t("homescreen.otherPharmacies", "Other Pharmacies")
                      : t("home.allPharmacies", "All Pharmacies")}
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {otherPharmacies.length} {t("homescreen.Found", "found")}
                  </Text>
                </View>
                {otherPharmacies.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} item={pharmacy} />
                ))}
              </>
            )}

            {hasPermission &&
              nearbyPharmacies.length === 0 &&
              otherPharmacies.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="business-outline"
                    size={48}
                    color="#D0D5DD"
                  />
                  <Text style={styles.emptyText}>
                    {t("homescreen.notFound", "No pharmacies found")}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {t("homescreen.try", "Please try again later")}
                  </Text>
                </View>
              )}
          </>
        )}

        {/* Marketplace */}
        <TouchableOpacity
          style={styles.marketplaceCard}
          onPress={() => router.push("/(tabs)/marketplace")}
          activeOpacity={0.9}
        >
          <View style={styles.marketplaceContent}>
            <MaterialCommunityIcons
              name="shopping-outline"
              size={24}
              color="#007a55"
            />
            <View style={styles.marketplaceTextContainer}>
              <Text style={styles.marketplaceTitle}>
                {t("homescreen.explore", "Explore Pharmacy Marketplace")}
              </Text>
              <Text style={styles.marketplaceSubtitle}>
                {t(
                  "homescreen.exploreMessage",
                  "Cosmetics, baby care, and health services."
                )}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#007a55" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isCodeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCodeModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalIndicator} />

            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <FontAwesome5 name="sms" size={28} color="#007a55" />
              </View>
              <TouchableOpacity
                onPress={() => setIsCodeModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color="#667085" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContentArea}>
              <Text style={styles.modalTitle}>
                {t("searchModel.Smodel", "Enter SMS Code")}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t(
                  "searchModel.SmodelMessage",
                  "Enter the code from your hospital SMS to find your prescribed medicine."
                )}
              </Text>

              <View style={styles.codeInputContainer}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="Code"
                  placeholderTextColor="#98A2B3"
                  value={prescriptionCode}
                  onChangeText={setPrescriptionCode}
                  autoCapitalize="characters"
                  autoFocus
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  isVerifyingCode && { opacity: 0.7 },
                ]}
                onPress={handleRedeemCode}
                disabled={isVerifyingCode}
              >
                {isVerifyingCode ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.modalPrimaryButtonText}>
                      {t("searchModel.Sfind", "Find Medicine")}
                    </Text>
                    <Ionicons
                      name="search"
                      size={20}
                      color="white"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.helpText}>
                {t(
                  "searchModel.Sfooter",
                  "Check the SMS sent by your hospital or clinic."
                )}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.profileModalOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <View style={styles.dropdownAvatar}>
                <Text style={styles.dropdownAvatarText}>{userInitials}</Text>
              </View>
              <View>
                <Text style={styles.dropdownName}>{userName}</Text>
              </View>
            </View>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuVisible(false);
                router.push("/(tabs)/profile");
              }}
            >
              <Ionicons name="person-outline" size={20} color="#344054" />
              <Text style={styles.menuItemText}>
                {t("dropdown.Myprofile")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuVisible(false);
                router.push("/(tabs)/orders");
              }}
            >
              <Ionicons name="receipt-outline" size={20} color="#344054" />
              <Text style={styles.menuItemText}>
                {t("dropdown.MyOrders")}
              </Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: "#EF4444" }]}>
                {t("dropdown.Signout")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9F9" },

  /* Header */
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EAECF0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLogo: { height: 32, width: 150 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#e6f4ef",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1E7DD",
  },
  avatarText: { fontWeight: "700", color: "#007a55", fontSize: 14 },

  /* Body */
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  /* Search */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    elevation: 2,
  },
  searchPlaceholder: { flex: 1, fontSize: 15, color: "#98A2B3" },

  /* Upload Prescription Card */
  uploadCard: {
    backgroundColor: "#e6f4ef",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#D1E7DD",
  },
  uploadContent: { flexDirection: "row", alignItems: "center" },
  uploadIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#007a55",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  uploadTextContainer: { flex: 1 },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2926",
    marginBottom: 4,
  },
  uploadSubtitle: { fontSize: 12, color: "#475569", lineHeight: 16 },

  /* Section Headers */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F2926" },
  sectionSubtitle: { fontSize: 13, color: "#667085", fontWeight: "500" },

  /* Pharmacy Cards */
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F2F4F7",
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#007a55",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F2926",
    marginBottom: 4,
  },
  statusRow: { flexDirection: "row", alignItems: "center" },
  hoursText: { color: "#98A2B3", fontSize: 13 },
  distanceBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  distanceText: { fontSize: 12, fontWeight: "700", color: "#166534" },

  /* No Nearby / Permission fallback */
  noNearbyContainer: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEF3C7",
    marginBottom: 24,
    marginTop: 10,
  },
  noNearbyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#B45309",
    marginTop: 10,
    textAlign: "center",
  },
  fallbackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  fallbackBtnText: { color: "white", fontWeight: "700", fontSize: 14 },

  /* Empty State */
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 40 },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344054",
    marginTop: 12,
  },
  emptySubtext: { fontSize: 14, color: "#98A2B3", marginTop: 4 },

  /* Loading */
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  loadingText: { marginTop: 12, color: "#667085", fontWeight: "500" },

  /* Marketplace Teaser */
  marketplaceCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#EAECF0",
  },
  marketplaceContent: { flexDirection: "row", alignItems: "center" },
  marketplaceTextContainer: { flex: 1, marginLeft: 16 },
  marketplaceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2926",
    marginBottom: 4,
  },
  marketplaceSubtitle: { fontSize: 12, color: "#667085" },

  /* Profile Dropdown Modal */
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingTop: Platform.OS === "android" ? 80 : 60,
    paddingRight: 24,
    alignItems: "flex-end",
  },
  dropdownContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    width: 220,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 12,
  },
  dropdownAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e6f4ef",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownAvatarText: { color: "#007a55", fontWeight: "700", fontSize: 13 },
  dropdownName: { fontSize: 15, fontWeight: "700", color: "#0F2926" },
  dropdownDivider: { height: 1, backgroundColor: "#EAECF0", marginVertical: 6 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 10,
  },
  menuItemText: { fontSize: 14, fontWeight: "500", color: "#344054" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 12,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e6f4ef",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    padding: 8,
    backgroundColor: "#F8F9F9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EAECF0",
  },
  modalContentArea: { alignItems: "center" },
  modalTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F2926",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#667085",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  codeInputContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#007a55",
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#007a55",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  codeInput: {
    height: 72,
    fontSize: 28,
    fontWeight: "800",
    color: "#0F2926",
    textAlign: "center",
    letterSpacing: 6,
  },
  modalPrimaryButton: {
    width: "100%",
    backgroundColor: "#007a55",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#007a55",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalPrimaryButtonText: { color: "white", fontSize: 18, fontWeight: "700" },
  helpText: {
    fontSize: 13,
    color: "#98A2B3",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});