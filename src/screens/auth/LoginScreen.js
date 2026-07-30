import React, { useState, useRef, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Modal,
  StyleSheet,
  I18nManager,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStyles as s, c, AUTH_BG } from './authStyles';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, Phone, X, CheckCircle, Smartphone, AlertCircle } from 'lucide-react-native';
import { validateEmail } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

// ─── Official Google "G" SVG Logo ────────────────────────────────────────────

const GoogleGLogo = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

// ─── Google Sign-In Demo Modal ────────────────────────────────────────────────

const GoogleModal = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const [step, setStep] = useState('idle'); // idle | loading | success

  const handleGoogleSignIn = useCallback(() => {
    setStep('loading');
    setTimeout(() => setStep('success'), 1600);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Reset after animation ends so user doesn't see state change while closing
    setTimeout(() => setStep('idle'), 400);
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={modal.overlay}>
        <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[modal.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
          <TouchableOpacity style={[modal.closeBtn, language === 'ur' ? { left: 20 } : { right: 20 }]} onPress={handleClose} activeOpacity={0.7}>
            <X size={24} color="#111" strokeWidth={2.5} />
          </TouchableOpacity>

          {step === 'success' ? (
            <View style={modal.centeredBlock}>
              <View style={modal.successCircle}>
                <CheckCircle size={44} color="#1A7F37" strokeWidth={2} />
              </View>
              <Text style={modal.successTitle}>{language === 'ur' ? 'گوگل منسلک ہو گیا!' : 'Google Connected!'}</Text>
              <Text style={modal.successSub}>
                {language === 'ur' ? 'پروڈکشن بلڈ میں، اب آپ اپنے گوگل اکاؤنٹ کے ذریعے سائن ان ہوں گے۔' : 'In the production build, you would now be signed in via your Google account.'}
                {'\n\n'}{language === 'ur' ? 'اگلی ریلیز میں OAuth 2.0 + Firebase Authentication شامل کیا جائے گا۔' : 'OAuth 2.0 + Firebase Authentication will be integrated in the next release.'}
              </Text>
              <View style={modal.infoBadge}>
                <Text style={modal.infoBadgeText}>{language === 'ur' ? '🔜 ورژن 2.0 میں آ رہا ہے' : '🔜  Coming in v2.0'}</Text>
              </View>
              <TouchableOpacity style={modal.actionBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={modal.actionBtnText}>{language === 'ur' ? 'سمجھ گیا' : 'Got it'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={modal.centeredBlock}>
              {/* Google logo circle */}
              <View style={modal.googleLogoBox}>
                <GoogleGLogo size={40} />
              </View>
              <Text style={modal.modalTitle}>{language === 'ur' ? 'گوگل کے ساتھ سائن ان کریں' : 'Sign in with Google'}</Text>
              <Text style={modal.modalSub}>
                {language === 'ur' ? 'کراچی کمپلینٹ پورٹل میں تیزی سے سائن ان کرنے کے لیے اپنا گوگل اکاؤنٹ استعمال کریں۔' : 'Use your Google account to quickly sign in to Karachi Complaint Portal.'}
              </Text>

              {/* Fake account selector */}
              <View style={modal.accountRow}>
                <View style={modal.accountAvatar}>
                  <Text style={modal.accountAvatarTxt}>{language === 'ur' ? 'ڈ' : 'U'}</Text>
                </View>
                <View style={modal.accountInfo}>
                  <Text style={modal.accountName}>{language === 'ur' ? 'ڈیمو صارف' : 'Demo User'}</Text>
                  <Text style={modal.accountEmail}>demo@gmail.com</Text>
                </View>
                <View style={modal.accountCheck}>
                  <View style={modal.radioFill} />
                </View>
              </View>

              <TouchableOpacity
                style={[modal.actionBtn, step === 'loading' && { opacity: 0.7 }]}
                onPress={handleGoogleSignIn}
                disabled={step === 'loading'}
                activeOpacity={0.8}
              >
                {step === 'loading' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={modal.actionBtnText}>{language === 'ur' ? 'بطور ڈیمو صارف جاری رکھیں' : 'Continue as Demo User'}</Text>
                )}
              </TouchableOpacity>

              <Text style={modal.modalDisclaimer}>
                {language === 'ur' ? 'جاری رکھ کر، گوگل آپ کا نام، ای میل اور پروفائل تصویر کراچی کمپلینٹ پورٹل کے ساتھ شیئر کرے گا۔' : 'By continuing, Google will share your name, email, and profile picture with Karachi Complaint Portal.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Phone OTP Demo Modal ─────────────────────────────────────────────────────

const PhoneModal = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { language, toUrduNumerals } = useLanguage();
  const { signInWithPhone, verifyPhoneOTP } = useAuth();
  
  const [step, setStep]         = useState('phone'); // phone | otp | success
  const [phoneNum, setPhoneNum] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [sending, setSending]   = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const otpRefs = useRef([]);

  const handleSendOTP = useCallback(async () => {
    // Format Phone
    let digits = phoneNum.replace(/\D/g, '');
    if (digits.startsWith('92')) {
      // already has country code
    } else if (digits.startsWith('0')) {
      digits = '92' + digits.substring(1);
    } else {
      digits = '92' + digits;
    }
    const formattedPhone = '+' + digits;
    
    if (formattedPhone.length < 13) {
      Alert.alert(language === 'ur' ? 'غلط نمبر' : 'Invalid Number', language === 'ur' ? 'براہ کرم ایک درست فون نمبر درج کریں۔' : 'Please enter a valid 10-digit phone number (e.g. 300 1234567).');
      return;
    }
    setSending(true);
    const res = await signInWithPhone(formattedPhone);
    setSending(false);
    
    if (res.ok) {
      setConfirmation(res.confirmation);
      setStep('otp');
    } else {
      Alert.alert(language === 'ur' ? 'خرابی' : 'Error', res.error);
    }
  }, [phoneNum, language, signInWithPhone]);

  const handleOtpChange = useCallback((text, idx) => {
    setOtpDigits(prev => {
      const next = [...prev];
      next[idx] = text;
      return next;
    });
    if (text && idx < 5) otpRefs.current[idx + 1]?.focus();
  }, []);

  const handleVerify = useCallback(async () => {
    if (!confirmation) return;
    setSending(true);
    const code = otpDigits.join('');
    const res = await verifyPhoneOTP(confirmation, code);
    setSending(false);
    
    if (res.ok) {
      setStep('success');
      // RootNavigator will automatically pick up the login state
    } else {
      Alert.alert(language === 'ur' ? 'خرابی' : 'Error', res.error);
    }
  }, [confirmation, otpDigits, verifyPhoneOTP, language]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setStep('phone');
      setPhoneNum('');
      setOtpDigits(['', '', '', '', '', '']);
      setSending(false);
      setConfirmation(null);
    }, 400);
  }, [onClose]);

  const isOtpComplete = otpDigits.every(d => d.length === 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={modal.overlay}>
        <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[modal.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
          <TouchableOpacity style={[modal.closeBtn, language === 'ur' ? { left: 20 } : { right: 20 }]} onPress={handleClose} activeOpacity={0.7}>
            <X size={24} color="#111" strokeWidth={2.5} />
          </TouchableOpacity>

          {step === 'success' ? (
            <View style={modal.centeredBlock}>
              <View style={modal.successCircle}>
                <CheckCircle size={44} color="#1A7F37" strokeWidth={2} />
              </View>
              <Text style={modal.successTitle}>{language === 'ur' ? 'فون کی تصدیق ہو گئی!' : 'Phone Verified!'}</Text>
              <Text style={modal.successSub}>
                {language === 'ur' ? 'پروڈکشن میں، ایس ایم ایس او ٹی پی ٹویلیو / فائر بیس فون آتھ کے ذریعے بھیجا جاتا ہے اور سرور پر اس کی تصدیق کی جاتی ہے۔' : 'In production, SMS OTP is sent via Twilio / Firebase Phone Auth and verified server-side.'}
                {'\n\n'}{language === 'ur' ? 'اگلی ریلیز میں مکمل فون لاگ ان دستیاب ہوگا۔' : 'Full phone login will be available in the next release.'}
              </Text>
              <View style={modal.infoBadge}>
                <Text style={modal.infoBadgeText}>{language === 'ur' ? '🔜 ورژن 2.0 میں آ رہا ہے' : '🔜  Coming in v2.0'}</Text>
              </View>
              <TouchableOpacity style={modal.actionBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={modal.actionBtnText}>{language === 'ur' ? 'سمجھ گیا' : 'Got it'}</Text>
              </TouchableOpacity>
            </View>

          ) : step === 'otp' ? (
            <View style={modal.centeredBlock}>
              <View style={[modal.googleLogoBox, { backgroundColor: '#E8F5E9' }]}>
                <Smartphone size={32} color="#1e4620" />
              </View>
              <Text style={modal.modalTitle}>{language === 'ur' ? 'او ٹی پی درج کریں' : 'Enter OTP'}</Text>
              <Text style={modal.modalSub}>
                {language === 'ur' ? `ایک ${toUrduNumerals(6)} ہندسوں کا کوڈ بھیجا گیا ہے` : 'A 6-digit code was sent to'}{'\n'}
                <Text style={{ fontWeight: '800', color: '#000' }}>{language === 'ur' ? toUrduNumerals(phoneNum) : phoneNum}</Text>
              </Text>

              <View style={modal.otpRow}>
                {otpDigits.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    style={[modal.otpBox, digit ? modal.otpBoxFilled : {}]}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={language === 'ur' && digit ? toUrduNumerals(digit) : digit}
                    onChangeText={text => handleOtpChange(language === 'ur' ? text.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]) : text, i)}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <Text style={modal.demoHint}>
                {language === 'ur' ? <Text>💡 ڈیمو: کوڈ <Text style={{ fontWeight: '800' }}>{toUrduNumerals('123456')}</Text> کے طور پر خودکار بھرا گیا ہے</Text> : <Text>💡 Demo: code auto-filled as <Text style={{ fontWeight: '800' }}>123456</Text></Text>}
              </Text>

              <TouchableOpacity
                style={[modal.actionBtn, (!isOtpComplete || sending) && { opacity: 0.6 }]}
                onPress={handleVerify}
                disabled={!isOtpComplete || sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={modal.actionBtnText}>{language === 'ur' ? 'تصدیق کریں اور سائن ان کریں' : 'Verify & Sign In'}</Text>
                )}
              </TouchableOpacity>
            </View>

          ) : (
            <View style={modal.centeredBlock}>
              <View style={[modal.googleLogoBox, { backgroundColor: '#E8F5E9' }]}>
                <Phone size={32} color="#1e4620" />
              </View>
              <Text style={modal.modalTitle}>{language === 'ur' ? 'فون سائن ان' : 'Phone Sign In'}</Text>
              <Text style={modal.modalSub}>
                {language === 'ur' ? 'اپنا پاکستانی موبائل نمبر درج کریں۔ ہم ایک بار کا تصدیقی کوڈ بھیجیں گے۔' : "Enter your Pakistani mobile number. We'll send a one-time verification code."}
              </Text>

              <View style={modal.phoneRow}>
                <View style={modal.countryCode}>
                  <Text style={modal.countryCodeTxt}>{language === 'ur' ? '🇵🇰 +۹۲' : '🇵🇰 +92'}</Text>
                </View>
                <TextInput
                  style={[modal.phoneInput, { textAlign: language === 'ur' ? 'right' : 'left' }]}
                  placeholder={language === 'ur' ? toUrduNumerals('300 1234567') : "300 1234567"}
                  placeholderTextColor="#aaa"
                  keyboardType="phone-pad"
                  value={language === 'ur' && phoneNum ? toUrduNumerals(phoneNum) : phoneNum}
                  onChangeText={text => {
                    const englishNumbers = text.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
                    setPhoneNum(englishNumbers);
                  }}
                  maxLength={11}
                />
              </View>

              <TouchableOpacity
                style={[modal.actionBtn, (!phoneNum || sending) && { opacity: 0.5 }]}
                onPress={handleSendOTP}
                disabled={!phoneNum || sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={modal.actionBtnText}>{language === 'ur' ? 'او ٹی پی بھیجیں' : 'Send OTP'}</Text>
                )}
              </TouchableOpacity>

              <Text style={modal.modalDisclaimer}>
                {language === 'ur' ? 'ایس ایم ایس کے معیاری چارجز لاگو ہو سکتے ہیں۔ پروڈکشن میں، او ٹی پی ٹویلیو ایس ایم ایس گیٹ وے کے ذریعے بھیجا جاتا ہے۔' : 'Standard SMS rates may apply. In production, OTP is delivered via Twilio SMS Gateway.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Custom Error Modal ───────────────────────────────────────────────────────

const ErrorModal = ({ visible, title, message, onClose, language }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[modal.overlay, { justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[modal.sheet, { 
          paddingBottom: 24, 
          paddingTop: 24,
          minHeight: 280, 
          justifyContent: 'center',
          width: '85%',
          borderRadius: 28
        }]}>
          <View style={modal.centeredBlock}>
            <View style={[modal.successCircle, { backgroundColor: '#FEE2E2' }]}>
              <AlertCircle size={44} color="#DC2626" strokeWidth={2} />
            </View>
            <Text style={[modal.successTitle, { color: '#DC2626' }]}>{title}</Text>
            <Text style={modal.successSub}>{message}</Text>
            <TouchableOpacity style={[modal.actionBtn, { backgroundColor: '#DC2626', marginTop: 10 }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={modal.actionBtnText}>
                {language === 'ur' ? 'ٹھیک ہے' : language === 'ru' ? 'Theek hai' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 16, // overridden inline with safe-area insets
    paddingTop: 16,
    minHeight: 380,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centeredBlock: {
    alignItems: 'center',
    paddingTop: 8,
  },
  // Logo circle
  googleLogoBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    fontWeight: '500',
  },
  // Account row
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#1e4620',
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountAvatarTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  accountInfo: {
    flex: 1,
    marginStart: 12,
  },
  accountName: {
    fontWeight: '800',
    fontSize: 15,
    color: '#111',
  },
  accountEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  accountCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1e4620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1e4620',
  },
  // Main action button
  actionBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#1e4620',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#1e4620',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalDisclaimer: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  // Success
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DAFBE1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111',
    marginBottom: 10,
  },
  successSub: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    fontWeight: '500',
  },
  infoBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 99,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#795548',
  },
  // Phone
  phoneRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  countryCode: {
    height: 54,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F6F8FA',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  phoneInput: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    backgroundColor: '#F6F8FA',
  },
  // OTP
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#F6F8FA',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },
  otpBoxFilled: {
    borderColor: '#1e4620',
    backgroundColor: '#E8F5E9',
  },
  demoHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
});

// ─── Main LoginScreen ─────────────────────────────────────────────────────────

const LoginScreen = ({ navigation }) => {
  const { login, signInWithGoogle } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [emailFocused, setEmailFocused]       = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [loginSuccess, setLoginSuccess]       = useState(false);
  const [googleLoading, setGoogleLoading]     = useState(false);
  const [phoneModalVisible, setPhoneModal]    = useState(false);
  const [errorModalVisible, setErrorModal]    = useState(false);
  const [errorContent, setErrorContent]       = useState({ title: '', message: '' });

  const showError = (title, message) => {
    setErrorContent({ title, message });
    setErrorModal(true);
  };

  const handleLogin = useCallback(async () => {
    if (loading) return;
    if (!validateEmail(email)) {
      showError(
        language === 'ur' ? 'غلط ای میل' : language === 'ru' ? 'Ghalat Email' : 'Invalid Email',
        language === 'ur' ? 'براہ کرم ایک درست ای میل ایڈریس درج کریں۔' : language === 'ru' ? 'Baraye meharbani durust email address darj karein.' : 'Please enter a valid email address.'
      );
      return;
    }
    if (password.length < 1) {
      showError(
        language === 'ur' ? 'پاسورڈ درکار ہے' : language === 'ru' ? 'Password Darkar Hai' : 'Password Required',
        language === 'ur' ? 'براہ کرم اپنا پاسورڈ درج کریں۔' : language === 'ru' ? 'Baraye meharbani apna password darj karein.' : 'Please enter your password.'
      );
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    
    if (result.ok) {
      setLoginSuccess(true);
      // We do NOT set loading to false here. We let the button stay in the success
      // state while the RootNavigator cross-fades over 400ms to the MainTabNavigator.
    } else {
      setLoading(false);
      showError(
        language === 'ur' ? 'لاگ ان ناکام' : language === 'ru' ? 'Login Nakaam' : 'Login Failed',
        language === 'ur' ? 'براہ کرم اپنی اسناد چیک کریں اور دوبارہ کوشش کریں۔' : language === 'ru' ? 'Baraye meharbani apni tafseelaat check karein aur dobara koshish karein.' : result.error ?? 'Please check your credentials and try again.'
      );
    }
  }, [email, password, login, language, loading]);

  const handleGoogleAuth = useCallback(async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    
    if (!result.ok) {
      if (result.error !== 'Sign in action cancelled') { // ignore cancellation errors
        showError(
          language === 'ur' ? 'گوگل سائن ان ناکام' : 'Google Sign-In Failed',
          result.error
        );
      }
    }
  }, [signInWithGoogle, language, googleLoading]);

  return (
    <>
      <ImageBackground source={AUTH_BG} style={{ flex: 1 }} resizeMode="cover" imageStyle={{ opacity: 0.30 }}>
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
              <View style={styles.langPillGroup}>
                {[{ label: 'EN', code: 'en' }, { label: 'RU', code: 'ru' }, { label: 'اردو', code: 'ur' }].map((l) => (
                  <TouchableOpacity
                    key={l.code}
                    style={[styles.langChip, language === l.code && styles.langChipActive]}
                    onPress={() => setLanguage(l.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.langChipText, language === l.code && styles.langChipTextActive]}>{l.label}</Text>
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
                  <Text style={s.heading}>{t('welcomeBack')}</Text>
                  <Text style={s.subheading}>
                    {t('loginSubtitle')}
                  </Text>

                  {/* Email */}
                  <View style={s.inputGroup}>
                    <Text style={s.label}>{t('emailAddress')}</Text>
                    <View style={[s.inputWrapper, emailFocused && s.inputWrapperFocused]}>
                      <Mail size={16} color={emailFocused ? c.primary : '#111111'} strokeWidth={2} />
                      <TextInput
                        style={[s.input, { textAlign: language === 'ur' ? 'right' : 'left' }]}
                        placeholder={language === 'ur' ? "آپکا@ای میل.کام" : "you@example.com"}
                        placeholderTextColor="#999999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View style={s.inputGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, paddingRight: 4 }}>
                      <Text style={s.label}>{t('password')}</Text>
                      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={s.footerLink}>{t('forgotPassword')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[s.inputWrapper, passwordFocused && s.inputWrapperFocused]}>
                      <Lock size={16} color={passwordFocused ? c.primary : '#111111'} strokeWidth={2} />
                      <TextInput
                        style={[s.input, { textAlign: language === 'ur' ? 'right' : 'left' }]}
                        placeholder={language === 'ur' ? "آپ کا پاسورڈ" : "Your password"}
                        placeholderTextColor="#999999"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                        {showPassword
                          ? <EyeOff size={16} color={c.textSecondary} strokeWidth={2} />
                          : <Eye size={16} color={c.textSecondary} strokeWidth={2} />
                        }
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[s.primaryBtn, (loading || loginSuccess) && { opacity: 0.9 }, loginSuccess && { backgroundColor: '#10B981' }]}
                    activeOpacity={0.85}
                    onPress={handleLogin}
                    disabled={loading || loginSuccess}
                  >
                    {loginSuccess ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={20} color="#fff" />
                        <Text style={s.primaryBtnText}>{language === 'ur' ? 'خوش آمدید' : 'Welcome'}</Text>
                      </View>
                    ) : loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={s.primaryBtnText}>{t('login')}</Text>
                    )}
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={s.dividerRow}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerText}>{t('orContinueWith')}</Text>
                    <View style={s.dividerLine} />
                  </View>

                  {/* Social Buttons */}
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                    {/* Google */}
                    <TouchableOpacity
                      style={[s.ghostBtn, styles.socialBtn, googleLoading && { opacity: 0.7 }]}
                      activeOpacity={0.65}
                      onPress={handleGoogleAuth}
                      disabled={googleLoading}
                    >
                      {googleLoading ? (
                        <ActivityIndicator size="small" color="#4285F4" />
                      ) : (
                        <GoogleGLogo size={20} />
                      )}
                      <Text style={[s.ghostBtnText, { fontSize: 14 }]}>{language === 'ur' ? 'گوگل' : 'Google'}</Text>
                    </TouchableOpacity>

                    {/* Phone */}
                    <TouchableOpacity
                      style={[s.ghostBtn, styles.socialBtn]}
                      activeOpacity={0.65}
                      onPress={() => setPhoneModal(true)}
                    >
                      <Phone size={16} color="#1e4620" strokeWidth={2} />
                      <Text style={[s.ghostBtnText, { fontSize: 14 }]}>{language === 'ur' ? 'فون' : 'Phone'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sign up link */}
                  <View style={s.footerRow}>
                    <Text style={s.footerText}>{t('dontHaveAccount')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                      <Text style={s.footerLink}>{t('createOne')}</Text>
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

      {/* Modals rendered outside ImageBackground so they overlay correctly */}
      <PhoneModal  visible={phoneModalVisible}  onClose={() => setPhoneModal(false)} />
      <ErrorModal  visible={errorModalVisible}  onClose={() => setErrorModal(false)} language={language} title={errorContent.title} message={errorContent.message} />
    </>
  );
};

const styles = StyleSheet.create({
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 0,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
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

export default LoginScreen;
