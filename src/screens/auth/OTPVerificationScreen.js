import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStyles as s, c, AUTH_BG } from './authStyles';
import { ArrowLeft, MessageSquare } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

const OTP_LENGTH = 6;

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email, flow, name, phone, password, simulatedCode } = route.params;
  const { verifyOTP, register, generateOTP } = useAuth();

  const [otp, setOtp]       = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [showSimulatedCode, setShowSimulatedCode] = useState(simulatedCode || null);
  const inputs = useRef([]);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const isComplete = otp.every(d => d.length === 1);

  const handleVerify = async () => {
    if (loading) return;
    setLoading(true);
    const code = otp.join('');

    if (flow === 'signup') {
      const valid = await verifyOTP(email, code);
      if (!valid) {
        setLoading(false);
        Alert.alert('Invalid Code', 'The code you entered is incorrect or has expired. Please try again.');
        return;
      }

      const result = await register(name, email, phone, password);
      setLoading(false);

      if (!result.ok) {
        Alert.alert('Registration Failed', result.error ?? 'Email already in use.');
      }
      // On success, App.js's RootNavigator auto-switches to MainTabNavigator because user state updates
    } else {
      // forgot-password flow (still uses email OTP for now, or update later)
      const valid = await verifyOTP(email, code);
      setLoading(false);
      
      if (!valid) {
        Alert.alert('Invalid Code', 'The code you entered is incorrect or has expired. Please try again.');
        return;
      }
      navigation.navigate('ResetPassword', { email });
    }
  };

  const handleResend = async () => {
    if (loading) return;
    setLoading(true);
    const code = await generateOTP(email);
    setLoading(false);
    setShowSimulatedCode(code);
  };

  return (
    <ImageBackground source={AUTH_BG} style={{ flex: 1 }} resizeMode="cover" imageStyle={{ opacity: 0.40 }}>
      <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <View style={[s.sheet, { flex: 1 }]}>
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} activeOpacity={0.7} onPress={() => navigation.goBack()}>
              <ArrowLeft size={18} color={c.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={s.formArea}>
            <Text style={s.heading}>Enter code</Text>
            <Text style={s.subheading}>
              We sent a 6-digit verification code to{'\n'}
              <Text style={{ color: c.text, fontWeight: '600' }}>
                {flow === 'signup' ? phone : email}
              </Text>
            </Text>

            <View style={styles.otpRow}>
              {Array(OTP_LENGTH).fill(0).map((_, i) => (
                <TextInput
                  key={i}
                  ref={el => { inputs.current[i] = el; }}
                  style={[styles.otpBox, otp[i] ? styles.otpBoxFilled : {}]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={otp[i]}
                  onChangeText={text => handleChange(text, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, (!isComplete || loading) && { opacity: 0.5 }]}
              disabled={!isComplete || loading}
              onPress={handleVerify}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>Verify code</Text>
              )}
            </TouchableOpacity>

            <View style={s.footerRow}>
              <Text style={s.footerText}>Didn't receive the code?</Text>
              <TouchableOpacity onPress={handleResend}>
                <Text style={s.footerLink}>Resend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        )}

        <Modal
          visible={!!showSimulatedCode}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSimulatedCode(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.iconCircle}>
                  <MessageSquare size={28} color={c.primary} strokeWidth={2.5} />
                </View>
                <Text style={styles.modalTitle}>Verification Code</Text>
              </View>
              
              <Text style={styles.modalMessage}>
                {flow === 'signup' 
                  ? "Since real SMS delivery is bypassed, please use this simulated code to proceed:"
                  : "Please use this verification code to proceed:"}
              </Text>
              
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{showSimulatedCode}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowSimulatedCode(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  otpBox: {
    width: 45,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  otpBoxFilled: {
    borderColor: '#0B3B24',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(26,127,55,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B3B24',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeContainer: {
    backgroundColor: '#F4F8F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(26,127,55,0.2)',
    marginBottom: 24,
  },
  codeText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1A7F37',
    letterSpacing: 8,
  },
  modalButton: {
    backgroundColor: '#1A7F37',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OTPVerificationScreen;
