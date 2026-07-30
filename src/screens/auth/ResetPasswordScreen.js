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
import { Eye, EyeOff, Lock, ArrowLeft, Check } from 'lucide-react-native';
import { validatePassword } from '../../utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Same djb2 hash as in AuthContext — must match exactly */
const hashPassword = (email, password) => {
  const raw = `${email.toLowerCase()}::${password}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash = hash & hash;
  }
  return `${(hash >>> 0).toString(16)}_${raw.length}`;
};

const ResetPasswordScreen = ({ navigation, route }) => {
  const { email } = route.params;

  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);

  const isStrong = validatePassword(password);
  const matches  = password === confirm && confirm.length > 0;

  const handleUpdate = async () => {
    if (loading) return;
    if (!isStrong) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    if (!matches) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem('@kcp_accounts');
      const accounts = raw ? JSON.parse(raw) : [];
      const idx = accounts.findIndex((a) => a.email === email.toLowerCase().trim());

      if (idx === -1) {
        Alert.alert('Error', 'Account not found. Please sign up again.');
        setLoading(false);
        return;
      }

      accounts[idx].passwordHash = hashPassword(email.toLowerCase().trim(), password);
      await AsyncStorage.setItem('@kcp_accounts', JSON.stringify(accounts));
      setDone(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <ImageBackground source={AUTH_BG} style={{ flex: 1 }} resizeMode="cover" imageStyle={{ opacity: 0.40 }}>
        <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          <View style={[s.sheet, { flex: 1 }]}>
            <View style={[s.formArea, { justifyContent: 'center', alignItems: 'center' }]}>
              <View style={{
                width: 80, height: 80, borderRadius: 99,
                backgroundColor: '#DAFBE1', justifyContent: 'center',
                alignItems: 'center', marginBottom: 28,
              }}>
                <Check size={38} color="#1A7F37" strokeWidth={2.5} />
              </View>
              <Text style={[s.heading, { textAlign: 'center' }]}>Password updated!</Text>
              <Text style={[s.subheading, { textAlign: 'center' }]}>
                Your password has been changed successfully.{'\n'}You can now log in with your new password.
              </Text>
              <TouchableOpacity
                style={[s.primaryBtn, { width: '100%' }]}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={s.primaryBtnText}>Go to Login</Text>
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
              <ArrowLeft size={18} color={c.text} strokeWidth={2.5} />
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
                <Text style={s.heading}>Set new password</Text>
                <Text style={s.subheading}>
                  Your new password must be at least 8 characters long.
                </Text>

                <View style={s.inputGroup}>
                  <Text style={s.label}>New Password</Text>
                  <View style={[s.inputWrapper, passwordFocused && s.inputWrapperFocused]}>
                    <Lock size={16} color={passwordFocused ? c.primary : '#111111'} strokeWidth={2} />
                    <TextInput
                      style={s.input}
                      placeholder="Min. 8 characters"
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

                <View style={s.inputGroup}>
                  <Text style={s.label}>Confirm New Password</Text>
                  <View style={[
                    s.inputWrapper,
                    confirmFocused && s.inputWrapperFocused,
                    matches && { borderColor: '#0B3B24' },
                  ]}>
                    <Lock size={16} color={confirmFocused ? c.primary : '#111111'} strokeWidth={2} />
                    <TextInput
                      style={s.input}
                      placeholder="Re-enter password"
                      placeholderTextColor="#999999"
                      secureTextEntry={!showConfirm}
                      value={confirm}
                      onChangeText={setConfirm}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                    />
                    {matches
                      ? <Check size={16} color="#0B3B24" strokeWidth={2.5} />
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
                  style={[s.primaryBtn, (!(isStrong && matches) || loading) && { opacity: 0.5 }]}
                  disabled={!(isStrong && matches) || loading}
                  onPress={handleUpdate}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryBtnText}>Update password</Text>
                  )}
                </TouchableOpacity>
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

export default ResetPasswordScreen;
