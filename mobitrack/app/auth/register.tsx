import { StyleSheet,Platform,
    ScrollView,
    View,
    Text,
    TextInput,
    KeyboardAvoidingView,
    TouchableOpacity,
    

 } from "react-native";

import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FontAwesome5,AntDesign,Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import AuthHeader from "@/components/topheader/auth_header";


export default function RegisterScreen(){
    const router = useRouter();
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signup')
    
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [fullName, setFullName] = useState('');
    const [Age, setAge] = useState('');
    const [email, setEmail] = useState('');
    const [Gender, setGender] = useState<'male' | 'female' | ''>('');
    const [Nid, setNid] = useState('');

    const handleSwitch = () =>{
        router.replace('/auth/login');
    }
    const handleSubmit = async () =>{
      router.replace('/auth/aftersignup');
    }

const renderRadioOption = (label: string, value: 'male' | 'female') => {
    const isSelected = Gender === value;
    return (
      <TouchableOpacity 
        style={styles.radioOption} 
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


return(
        <View style={styles.container}>

            {/* header */}
            <AuthHeader />
            {/* end of header  */}

            <KeyboardAvoidingView
            style={styles.formWrapper} 
            behavior={Platform.OS ==='ios' ? 'padding':undefined}
            >
            <ScrollView
            contentContainerStyle ={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            >
                
                <View style={styles.tabContainer}>

                    <TouchableOpacity 
                     style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
                     onPress={handleSwitch}
                    >
                    <Text style={[ styles.tabText, activeTab === 'signin'  && styles.activeTabText]}>
                        {t('auth.login.signIn')}
                    </Text>    
                    </TouchableOpacity>
                                  <TouchableOpacity 
                style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                onPress={() => setActiveTab('signup')}
              >
                <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
                  {t('auth.login.createAccount')}
                </Text>
              </TouchableOpacity>

               
                 
                </View>
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

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.login.Or')}</Text>
              <View style={styles.dividerLine} />
            </View>
            


             <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.Fullname')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people" size={20} color="#98A2B3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.signup.fullnamePlaceholder')}
                  placeholderTextColor="#98A2B3"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>
             

             <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.Age')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people" size={20} color="#98A2B3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.signup.AgePlaceholder')}
                  placeholderTextColor="#98A2B3"
                  value={Age}
                  onChangeText={setAge}
                />
              </View>
            </View>
                        <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.radioGroup}>
                {renderRadioOption(t('auth.signup.genderlabelMale'), 'male')}
                {renderRadioOption(t('auth.signup.genderlabelFeMale'), 'female')}
              
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.Email')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#98A2B3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@gmail.com"
                  placeholderTextColor="#98A2B3"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.signup.Phone')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#98A2B3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0788000003"
                  placeholderTextColor="#98A2B3"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.login.password')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#98A2B3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.signup.passwordPlaceholder')}
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

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              
              
              <TouchableOpacity style={{flexDirection:'row',}}>
                <Text style={styles.forgotText}>{t('auth.signup.terms')} {' '}</Text>
                <Text style={styles.TermsText}>{t('auth.signup.termsLabel')} {' '}</Text>
                <Text style={styles.forgotText}>{t('auth.signup.And')} {' '}</Text>
                <Text style={styles.TermsText}>{t('auth.signup.condition')}</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} >
              <Text style={styles.submitButtonText}>{t('auth.signup.button')}</Text>
              <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

          
            </ScrollView>

            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:'#F8F9F9',
    },
    
formWrapper: {
    flex: 1,
    marginTop: -30, 
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    
  },
  
  /* Tabs */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    marginTop:35
   
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667085',
  },
  activeTabText: {
    color: '#0F2926',
  },

  /* Social Buttons */
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
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
  },

  /* Divider */
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

  /* Inputs */
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
    backgroundColor: '#FCFCFD',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#101828',
  },

  /* Options Row */
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D0D5DD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#2A7B6F',
    borderColor: '#2A7B6F',
  },
  checkboxText: {
    fontSize: 13,
    color: '#344054',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#000000',
  },
   TermsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A7B6F',
    textTransform:'capitalize'
  },
  
  submitButton: {
    backgroundColor: '#206B5F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 12,
    backgroundColor: '#FCFCFD',
    flex: 1, 
    marginHorizontal: 4,
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
    borderColor: '#2A7B6F',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2A7B6F', 
  },
  radioLabel: {
    fontSize: 14,
    color: '#667085',
    fontWeight: '500',
  },
  radioLabelSelected: {
    color: '#0F2926', 
    fontWeight: '600',
  },
});

