import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStyles as s, c, AUTH_BG } from './authStyles';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, ArrowRight, Check,
} from 'lucide-react-native';
import { validateEmail, validatePassword, validatePhone } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const getPasswordStrength = (pass) => {
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/\d/.test(pass)) score += 1;
  if ((pass.match(/[\W_]/g) || []).length >= 2) score += 1;
  return score;
};

const SignUpScreen = ({ navigation }) => {
  const { generateOTP } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [focused, setFocused]                 = useState(null);
  const [loading, setLoading]                 = useState(false);

  const passwordStrong  = validatePassword(password);
  const passwordsMatch  = password === confirmPassword && confirmPassword.length > 0;
  const isFocused       = (field) => focused === field;
  const strength        = getPasswordStrength(password);

  const namePlaceholder = language === 'ur' ? "احمد رضا" : language === 'ru' ? "Ali Khan" : "Ahmad Raza";
  const emailPlaceholder = language === 'ur' ? "آپکا@ای میل.کام" : language === 'ru' ? "aapka@example.com" : "you@example.com";
  const phonePlaceholder = language === 'ur' ? "\u200F+٩٢ ٣٠٠ ١٢٣٤٥٦٧" : language === 'ru' ? "+92 300 1234567" : "+92 300 1234567";
  const passPlaceholder = language === 'ur' ? "پاسورڈ درج کریں" : language === 'ru' ? "Password darj karein" : "Enter password";
  const passHint = language === 'ur' ? "کم از کم ۸ حروف، ۱ بڑا حرف، ۱ نمبر اور ۲ خاص حروف" : language === 'ru' ? "Kam az kam 8 huroof, 1 bada harf, 1 number, 2 special" : "Min 8 chars, 1 uppercase, 1 num, 2 special";
  const confirmPlaceholder = language === 'ur' ? "پاسورڈ دوبارہ لکھیں" : language === 'ru' ? "Password dobara likhein" : "Re-enter password";

  const handleSignUp = async () => {
    if (loading) return;
    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter your full name.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    // Format Phone
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('92')) {
      // already has country code
    } else if (digits.startsWith('0')) {
      digits = '92' + digits.substring(1);
    } else {
      digits = '92' + digits;
    }
    const formattedPhone = '+' + digits;
    
    if (formattedPhone.length < 13) {
      Alert.alert('Invalid Phone', 'Please enter a valid Pakistani phone number (e.g. 300 1234567).');
      return;
    }
    if (!passwordStrong) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long, with an uppercase letter, lowercase letter, a number, and 2 special characters.');
      return;
    }
    if (!passwordsMatch) {
      Alert.alert("Passwords Don't Match", 'Please make sure both passwords are identical.');
      return;
    }

    setLoading(true);

    // Fallback: Simulate SMS since Firebase Phone Auth may throw Error 39 (quota/Play Integrity issues)
    const code = await generateOTP(email);
    setLoading(false);

    const params = {
      email: email.trim(),
      flow: 'signup',
      name: name.trim(),
      phone: formattedPhone,
      password,
      simulatedCode: code,
    };

    navigation.navigate('OTPVerification', params);
  };

  const strengthColors = ['rgba(0,0,0,0.1)', '#e74c3c', '#f39c12', '#f1c40f', '#1A7F37'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <ImageBackground source={AUTH_BG} style={{ flex: 1 }} resizeMode="cover" imageStyle={{ opacity: 0.40 }}>
      <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <View style={[s.sheet, { flex: 1 }]}>
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} activeOpacity={0.7} onPress={() => navigation.goBack()}>
              {language === 'ur' ? (
                <ArrowRight size={18} color={c.text} strokeWidth={2.5} />
              ) : (
                <ArrowLeft size={18} color={c.text} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
            <View style={langStyles.langPillGroup}>
              {[{ label: 'EN', code: 'en' }, { label: 'RU', code: 'ru' }, { label: 'اردو', code: 'ur' }].map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={[langStyles.langChip, language === l.code && langStyles.langChipActive]}
                  onPress={() => setLanguage(l.code)}
                  activeOpacity={0.7}
                >
                  <Text style={[langStyles.langChipText, language === l.code && langStyles.langChipTextActive]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <KeyboardAvoidingView
            style={s.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={s.formArea}>
                <Text style={s.heading}>{t('createAccountTitle')}</Text>
                <Text style={s.subheading}>
                  {t('signUpSubtitle')}
                </Text>

                {/* Full Name */}
                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('fullName')}</Text>
                  <View style={[s.inputWrapper, isFocused('name') && s.inputWrapperFocused]}>
                    <User size={16} color={isFocused('name') ? c.primary : '#111111'} strokeWidth={2} />
                    <TextInput
                      style={[s.input, language === 'ur' && { textAlign: 'right' }]}
                      placeholder={namePlaceholder}
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                      autoCorrect={false}
                      value={name}
                      onChangeText={setName}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('emailAddress')}</Text>
                  <View style={[s.inputWrapper, isFocused('email') && s.inputWrapperFocused]}>
                    <Mail size={16} color={isFocused('email') ? c.primary : '#111111'} strokeWidth={2} />
                    <TextInput
                      style={[s.input, language === 'ur' && { textAlign: 'right' }]}
                      placeholder={emailPlaceholder}
                      placeholderTextColor="#999999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>

                {/* Phone */}
                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('phoneNumber')}</Text>
                  <View style={[s.inputWrapper, isFocused('phone') && s.inputWrapperFocused]}>
                    <Phone size={16} color={isFocused('phone') ? c.primary : '#111111'} strokeWidth={2} />
                    <TextInput
                      style={[s.input, language === 'ur' && { textAlign: 'right' }]}
                      placeholder={phonePlaceholder}
                      placeholderTextColor="#999999"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                      onFocus={() => setFocused('phone')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('password')}</Text>
                  <View style={[s.inputWrapper, isFocused('password') && s.inputWrapperFocused]}>
                    <Lock size={16} color={isFocused('password') ? c.primary : '#111111'} strokeWidth={2} />
                    <TextInput
                      style={[s.input, language === 'ur' && { textAlign: 'right' }]}
                      placeholder={passPlaceholder}
                      placeholderTextColor="#999999"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                      {showPassword
                        ? <EyeOff size={16} color={c.textSecondary} strokeWidth={2} />
                        : <Eye size={16} color={c.textSecondary} strokeWidth={2} />
                      }
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 6, paddingHorizontal: 4, textAlign: 'left', alignSelf: 'flex-start' }}>
                    {passHint}
                  </Text>

                  {/* Password Strength */}
                  {password.length > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                        {[1, 2, 3, 4].map((level) => (
                          <View
                            key={level}
                            style={{
                              flex: 1,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: level <= strength ? strengthColors[strength] : 'rgba(0,0,0,0.1)',
                            }}
                          />
                        ))}
                      </View>
                      <Text style={{ fontSize: 11, color: strengthColors[strength], marginTop: 4, fontWeight: '600', alignSelf: 'flex-start' }}>
                        {strengthLabels[strength]}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Confirm Password */}
                <View style={s.inputGroup}>
                  <Text style={s.label}>{t('confirmPassword')}</Text>
                  <View style={[
                    s.inputWrapper,
                    isFocused('confirm') && s.inputWrapperFocused,
                    passwordsMatch && { borderColor: '#1A7F37' },
                  ]}>
                    <Lock size={16} color={isFocused('confirm') ? c.primary : '#111111'} strokeWidth={2} />
                    <TextInput
                      style={[s.input, language === 'ur' && { textAlign: 'right' }]}
                      placeholder={confirmPlaceholder}
                      placeholderTextColor="#999999"
                      secureTextEntry={!showConfirm}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocused('confirm')}
                      onBlur={() => setFocused(null)}
                    />
                    {passwordsMatch
                      ? <Check size={16} color="#1A7F37" strokeWidth={2.5} />
                      : (
                        <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
                          {showConfirm
                            ? <EyeOff size={16} color={c.textSecondary} strokeWidth={2} />
                            : <Eye size={16} color={c.textSecondary} strokeWidth={2} />
                          }
                        </TouchableOpacity>
                      )
                    }
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, loading && { opacity: 0.8 }]}
                  activeOpacity={0.7}
                  onPress={handleSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryBtnText}>{t('createAccount')}</Text>
                  )}
                </TouchableOpacity>

                <View style={s.footerRow}>
                  <Text style={s.footerText}>{t('alreadyHaveAccount')}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={s.footerLink}>{t('login')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>

        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

const langStyles = StyleSheet.create({
  langPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(30,70,32,0.15)',
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langChipActive: {
    backgroundColor: '#1e4620',
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e4620',
  },
  langChipTextActive: {
    color: '#fff',
  },
});

export default SignUpScreen;
