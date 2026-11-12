import { 
  StyleSheet, Platform, ScrollView, View, Text, TextInput, 
  KeyboardAvoidingView, TouchableOpacity, Alert, ActivityIndicator 
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FontAwesome5, AntDesign, Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import AuthHeader from "@/components/topheader/auth_header";
import { AuthService } from "@/src/api/auth/authService";
export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email/phone and password.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await AuthService.login(identifier.trim(), password);
      
      const user = response.data.user;

      if (user.role === 'PATIENT') {
        router.replace('/(tabs)');
      } else if (user.role === 'PHARMACY') {
        Alert.alert(
          "Pharmacy Account", 
          "This mobile app is for patients. Please use the web portal.",
          [{ text: "OK", onPress: () => AuthService.logout() }]
        );
      } else {
        Alert.alert("Notice", "Admin accounts must use the web portal.", [
          { text: "OK", onPress: () => AuthService.logout() }
        ]);
      }

    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AuthHeader />

      <KeyboardAvoidingView
        style={styles.formWrapper} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.welcomeText}>{t('auth.login.header')}</Text>
            <Text style={styles.subText}>
              {t('auth.login.createAccount')}{' '}
              <Text 
                style={styles.linkText} 
                onPress={() => router.replace('/auth/register')}
              >
                {t('auth.login.SignupText')}
              </Text>
            </Text>
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <AntDesign name="google" size={20} color="#DB4437" style={{ marginRight: 8 }} />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <FontAwesome5 name="apple" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Divider  */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.login.Or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Identifier Input*/}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.login.phone')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#98A2B3" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@gmail.com or +250788..."
                placeholderTextColor="#98A2B3"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>
          </View>

          {/* Password Input*/}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('auth.login.password')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#98A2B3" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#98A2B3"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#98A2B3" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotContainer}>
            <Text style={styles.forgotText}>{t('auth.login.Forgot')}</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isLoading && { opacity: 0.7 }]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>{t('auth.login.signIn')}</Text>
            )}
          </TouchableOpacity>

        
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F9',
  },
  formWrapper: {
    flex: 1,
    marginTop: -30, 
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 60,
  },
  cardHeader: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F2926',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#667085',
  },
  linkText: {
    color: '#007a55', 
    fontWeight: '700',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EAECF0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#98A2B3',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: 'white',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#101828',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007a55',
  },
  submitButton: {
    backgroundColor: '#007a55',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#007a55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#667085',
  },
});