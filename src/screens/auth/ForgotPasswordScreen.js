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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStyles as s, c, AUTH_BG } from './authStyles';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { validateEmail } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ForgotPasswordScreen = ({ navigation }) => {
  const { resetPassword } = useAuth();
  const { language, t } = useLanguage();

  const [email, setEmail]           = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    // Call the real Firebase password reset
    const result = await resetPassword(email);
    
    setLoading(false);

    if (!result.ok) {
      Alert.alert(language === 'ur' ? 'غلطی' : 'Error', result.error);
      return;
    }

    // Success! Firebase has sent the email
    setSubmitted(true);
  };

  if (submitted) {
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
            </View>
            <View style={[s.formArea, { justifyContent: 'center', alignItems: 'center' }]}>
              <View style={{
                width: 72, height: 72, borderRadius: 99,
                backgroundColor: '#DAFBE1', justifyContent: 'center',
                alignItems: 'center', marginBottom: 24,
              }}>
                <Mail size={32} color="#1A7F37" strokeWidth={2} />
              </View>
              <Text style={[s.heading, { textAlign: 'center' }]}>{language === 'ur' ? 'اپنا ان باکس چیک کریں' : 'Check your inbox'}</Text>
              <Text style={[s.subheading, { textAlign: 'center' }]}>
                {language === 'ur' ? 'ہم نے پاسورڈ ری سیٹ کرنے کا لنک آپ کے ای میل پر بھیج دیا ہے۔' : 'We have sent a password reset link to'}{'\n'}
                <Text style={{ color: c.text, fontWeight: '600' }}>{email}</Text>
              </Text>
              <TouchableOpacity
                style={[s.primaryBtn, { width: '100%' }]}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={s.primaryBtnText}>{language === 'ur' ? 'لاگ ان پر واپس جائیں' : 'Back to Login'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ghostBtn, { width: '100%' }]}
                activeOpacity={0.7}
                onPress={() => { setSubmitted(false); setEmail(''); }}
              >
                <Text style={s.ghostBtnText}>{language === 'ur' ? 'دوبارہ بھیجیں' : 'Send again'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

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
                <Text style={s.heading}>{language === 'ur' ? 'پاسورڈ بھول گئے؟' : 'Forgot password?'}</Text>
                <Text style={s.subheading}>
                  {language === 'ur' ? 'کوئی بات نہیں۔ اپنا ای میل درج کریں اور ہم آپ کو ایک ری سیٹ کوڈ بھیجیں گے۔' : 'No worries. Enter your email and we\'ll send you a reset code.'}
                </Text>

                <View style={s.inputGroup}>
                  <Text style={s.label}>{language === 'ur' ? 'ای میل ایڈریس' : 'Email Address'}</Text>
                  <View style={[s.inputWrapper, emailFocused && s.inputWrapperFocused]}>
                    <Mail size={16} color={emailFocused ? c.primary : '#111111'} strokeWidth={2} />
                    <TextInput
                      style={[s.input, language === 'ur' && { textAlign: 'right' }]}
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

                <TouchableOpacity
                  style={[s.primaryBtn, (!email || loading) && { opacity: 0.5 }]}
                  onPress={handleSubmit}
                  activeOpacity={0.7}
                  disabled={!email || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryBtnText}>{language === 'ur' ? 'ری سیٹ کوڈ بھیجیں' : 'Send reset code'}</Text>
                  )}
                </TouchableOpacity>

                <View style={s.footerRow}>
                  <Text style={s.footerText}>{language === 'ur' ? 'یاد آ گیا؟' : 'Remembered it?'}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={s.footerLink}>{language === 'ur' ? 'لاگ ان پر واپس جائیں' : 'Back to Login'}</Text>
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

export default ForgotPasswordScreen;
