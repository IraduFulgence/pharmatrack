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
import DateTimePicker from '@react-native-community/datetimepicker';
import type { HouseholdRole } from '@/src/api/auth/authService';

// Patients must be 18+ to register themselves (the server checks this too).
const MIN_PATIENT_AGE = 18;
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Latest date of birth allowed today: exactly 18 years ago (29 Feb -> 28 Feb).
const latestAdultDob = () => {
  const t = new Date();
  const d = new Date(t.getFullYear() - MIN_PATIENT_AGE, t.getMonth(), t.getDate());
  if (d.getMonth() !== t.getMonth()) d.setDate(0);
  return d;
};

const HOUSEHOLD_ROLES: { value: HouseholdRole; label: string; hint: string }[] = [
  { value: 'FAMILY_HEAD', label: 'Head of the family', hint: 'You can add your spouse and children later.' },
  { value: 'SPOUSE', label: 'Spouse', hint: 'You can help manage your family later.' },
  { value: 'OTHER_ADULT', label: 'Another adult', hint: 'For example an adult child or relative.' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Form State
  const [fullName, setFullName] = useState('');
  const [Gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male'); 
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [householdRole, setHouseholdRole] = useState<HouseholdRole | ''>('');
  
  // Validation State
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(() => {
    const d = new Date(2000, 0, 1);
    return d > latestAdultDob() ? latestAdultDob() : d;
  });

  const handleSwitch = () => {
    router.replace('/auth/login');
  };

  // Validation Logic
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return `${t('auth.signup.fullnameFail')}`;
        if (value.trim().length < 3) return `${t('auth.signup.fullnameCount')}`;
        return "";
      
      case 'dateOfBirth':
        if (!value.trim()) return `${t('auth.signup.DOBFail')}`;
        if (value > toIso(latestAdultDob())) {
          return t('auth.signup.under18', {
            defaultValue: 'You must be at least {{age}} to create an account. A parent or guardian can add you to their family instead.',
            age: MIN_PATIENT_AGE,
          });
        }
        return "";

      case 'householdRole':
        if (!value) return t('auth.signup.householdRoleFail', 'Choose your role in your household.');
        return "";

      case 'phone':
        if (!value.trim()) return `${t('auth.signup.phoneFail')}`;
        if (!/^\+[1-9]\d{1,14}$/.test(value.trim())) {
          return `${t('auth.signup.phoneInternational')}`;
        }
        return "";

      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return `${t('auth.signup.emailFail')}`;
        }
        return "";

      case 'password':
        if (!value) return `${t('auth.signup.passwordFail')}`;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{}|;:'",.<>\/`~]{8,}$/;
        if (!passwordRegex.test(value)) {
          return `${t('auth.signup.passwordCount')}`;
        }
        return "";

      default:
        return "";
    }
  };

  // Update Field and Clear Error
  const handleFieldChange = (field: string, setter: (val: string) => void, value: string) => {
    setter(value);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Date Picker Handlers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      handleFieldChange('dateOfBirth', setDateOfBirth, dateStr);
    }
  };

  const confirmIOSDate = () => {
    const year = tempDate.getFullYear();
    const month = String(tempDate.getMonth() + 1).padStart(2, '0');
    const day = String(tempDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    handleFieldChange('dateOfBirth', setDateOfBirth, dateStr);
    setShowDatePicker(false);
  };

  // Submit Handler
  const handleSubmit = async () => {
    const newErrors: {[key: string]: string} = {};
    
    newErrors.fullName = validateField('fullName', fullName);
    newErrors.dateOfBirth = validateField('dateOfBirth', dateOfBirth);
    newErrors.householdRole = validateField('householdRole', householdRole);
    newErrors.phone = validateField('phone', phone);
    newErrors.email = validateField('email', email);
    newErrors.password = validateField('password', password);
    
    const cleanedErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, v]) => v !== "")
    );

    if (Object.keys(cleanedErrors).length > 0) {
      setErrors(cleanedErrors);
      return;
    }

    setErrors({});

    try {
      setIsLoading(true);
      await AuthService.registerPatient({
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        phoneNumber: phone.trim(),
        gender: Gender,
        householdRole: householdRole as HouseholdRole,
        email: email.trim() || undefined,  
        password: password,
      });
      
      Alert.alert(
        "Success", 
        `${t('auth.signup.AccountSuccess')}`, 
        [{ text: "OK", onPress: () => router.replace('/auth/login') }]
      );
      
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRadioOption = (label: string, value: 'Male' | 'Female' | 'Other') => {
    const isSelected = Gender === value;
    return (
      <TouchableOpacity 
        style={[styles.radioOption, isSelected && styles.radioOptionSelected]} 
        onPress={() => setGender(value)}
        activeOpacity={0.7}
      >
        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
          {isSelected && <View style={styles.radioInnerCircle} />}
        </View>
        <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
       <AuthHeader />
      <KeyboardAvoidingView
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
         
         

          
          <View style={styles.formContainer}>
            
            {/* Already have an account link */}
            <View style={styles.welcomeHeader}>
              <Text style={styles.subText}>
                {t('auth.signup.Already')}{' '}
                <Text style={styles.linkText} onPress={handleSwitch}>{t('auth.signup.Login')}</Text>
              </Text>
            </View>

            {/* Social Login */}
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

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.login.Or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* FULL NAME */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.Fullname')}</Text>
              <View style={[styles.inputContainer, errors.fullName && styles.inputContainerError]}>
                <Ionicons name="person-outline" size={20} color={errors.fullName ? "#EF4444" : "#98A2B3"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#98A2B3"
                  value={fullName}
                  onChangeText={(v) => handleFieldChange('fullName', setFullName, v)}
                />
              </View>
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* DOB */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.DOB')}</Text>
              <TouchableOpacity 
                style={[styles.inputContainer, errors.dateOfBirth && styles.inputContainerError]} 
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={errors.dateOfBirth ? "#EF4444" : "#98A2B3"} style={styles.inputIcon} />
                <Text style={[styles.input, { color: dateOfBirth ? '#101828' : '#98A2B3' }]}>
                  {dateOfBirth || "YYYY-MM-DD"}
                </Text>
              </TouchableOpacity>
              {errors.dateOfBirth
                ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
                : <Text style={styles.hintText}>{t('auth.signup.ageHint', { defaultValue: 'You must be {{age}} or older.', age: MIN_PATIENT_AGE })}</Text>}
            </View>

            {showDatePicker && (
              <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : undefined}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={latestAdultDob()} 
                  themeVariant="light"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.iosDoneButton} onPress={confirmIOSDate}>
                    <Text style={styles.iosDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.Gender')}</Text>
              <View style={styles.radioGroup}>
                {renderRadioOption(t('auth.signup.genderlabelMale'), "Male")}
                {renderRadioOption(t('auth.signup.genderlabelFemale'), "Female")}
              </View>
            </View>

            {/* Household role (family heads and spouses can build the family tree later) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.householdRole', 'Your role in your household')}</Text>
              <View style={{ gap: 8 }}>
                {HOUSEHOLD_ROLES.map((r) => {
                  const selected = householdRole === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.radioOption, styles.roleOption, selected && styles.radioOptionSelected]}
                      onPress={() => {
                        setHouseholdRole(r.value);
                        if (errors.householdRole) setErrors((prev) => ({ ...prev, householdRole: '' }));
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                        {selected && <View style={styles.radioInnerCircle} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>
                          {t(`auth.signup.role_${r.value}`, r.label)}
                        </Text>
                        <Text style={styles.hintText}>{t(`auth.signup.roleHint_${r.value}`, r.hint)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.householdRole && <Text style={styles.errorText}>{errors.householdRole}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.Email')} <Text style={{color:'#98A2B3'}}>(Optional)</Text></Text>
              <View style={[styles.inputContainer, errors.email && styles.inputContainerError]}>
                <Ionicons name="mail-outline" size={20} color={errors.email ? "#EF4444" : "#98A2B3"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@gmail.com"
                  placeholderTextColor="#98A2B3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email} 
                  onChangeText={(v) => handleFieldChange('email', setEmail, v)}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.Phone')}</Text>
              <View style={[styles.inputContainer, errors.phone && styles.inputContainerError]}>
                <Ionicons name="call-outline" size={20} color={errors.phone ? "#EF4444" : "#98A2B3"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+250788000003"
                  placeholderTextColor="#98A2B3"
                  keyboardType="phone-pad"
                  value={phone} 
                  onChangeText={(v) => handleFieldChange('phone', setPhone, v)}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.login.password')}</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputContainerError]}>
                <Ionicons name="lock-closed-outline" size={20} color={errors.password ? "#EF4444" : "#98A2B3"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#98A2B3"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(v) => handleFieldChange('password', setPassword, v)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#98A2B3" 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Terms */}
            <View style={styles.optionsRow}>
              <TouchableOpacity style={{flexDirection:'row', flexWrap: 'wrap'}}>
                <Text style={styles.forgotText}>{t('auth.signup.terms')} </Text>
                <Text style={styles.TermsText}>{t('auth.signup.termsLabel')} </Text>
                <Text style={styles.forgotText}>{t('auth.signup.And')} </Text>
                <Text style={styles.TermsText}>{t('auth.signup.condition')}</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && { opacity: 0.7 }]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>{t('auth.signup.button')}</Text>
                  <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

          </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40, 
  },
  
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  welcomeHeader: { 
    marginBottom: 24,
  },
  subText: { 
    fontSize: 15,
    color: '#667085',
    textAlign: 'center',
  },
  linkText: { 
    color: '#007a55',
    fontWeight: '700' 
  },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    gap: 12, 
    marginBottom: 24
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
    fontSize: 15, 
    fontWeight: '600', 
    color: '#344054' 
  },

  dividerRow: { 
    flexDirection: 'row',
    alignItems: 'center', 
    marginBottom: 24 
  },
  dividerLine: { 
    flex: 1, 
    height: 1,
    backgroundColor: '#EAECF0'
  },
  dividerText: { 
    marginHorizontal: 12, 
    fontSize: 13, 
    color: '#98A2B3',
    fontWeight: '500'
  },

  inputGroup: { 
    marginBottom: 20
  },
  inputLabel: { 
    fontSize: 15,
    fontWeight: '600', 
    color: '#344054', 
    marginBottom: 8 
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
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: { 
    marginRight: 10 
  },
  input: { 
    flex: 1,
    fontSize: 15, 
    color: '#101828' 
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: '#667085',
    marginTop: 4,
  },
  // Full-width, stacked radio cards (radioOption is laid out for a row).
  roleOption: {
    flex: 0,
    alignItems: 'flex-start',
  },

  radioGroup: { 
    flexDirection: 'row', 
    gap: 8 
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, 
    paddingHorizontal: 14,
    borderWidth: 1, 
    borderColor: '#EAECF0',
    borderRadius: 12,
    backgroundColor: 'white', 
    flex: 1,
  },
  radioOptionSelected: {
    borderColor: '#007a55', 
    backgroundColor: '#e6f4ef' 
  },
  radioCircle: {
    width: 20,
    height: 20, 
    borderRadius: 10, 
    borderWidth: 2,
    borderColor: '#D0D5DD', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 8,
  },
  radioCircleSelected: { 
    borderColor: '#007a55' 
  },
  radioInnerCircle: {
    width: 10, 
    height: 10,
    borderRadius: 5, 
    backgroundColor: '#007a55'
  },
  radioLabel: { 
    fontSize: 15,
    color: '#667085', 
    fontWeight: '500' 
  },
  radioLabelSelected: { 
    color: '#0F2926', 
    fontWeight: '600' 
  },

  optionsRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  forgotText: { 
    fontSize: 13,
    color: '#667085' 
  },
  TermsText: {
    fontSize: 13, 
    fontWeight: '700',
    color: '#007a55' 
  },

  submitButton: {
    backgroundColor: '#007a55', 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 18, 
    borderRadius: 12,
    shadowColor: '#007a55', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 4,
  },
  submitButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '700' 
  },

  iosPickerContainer: {
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 10, 
    marginBottom: 20,
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iosDoneButton: { 
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  iosDoneText: {
    color: '#007a55',
    fontSize: 16, 
    fontWeight: '600'
  },
});