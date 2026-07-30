import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

const AUTH_BG = require('../assets/images/auth_bg_2.jpg');

const LANGS = [
  { label: 'EN', code: 'en' },
  { label: 'RU', code: 'ru' },
  { label: 'اردو', code: 'ur' },
];

const WelcomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ImageBackground source={AUTH_BG} style={styles.bg} resizeMode="cover" imageStyle={{ opacity: 0.20, top: -120 }}>

        {/* ── Language Selector (top-right) ── */}
        <View style={styles.langBar}>
          <View style={styles.langPillGroup}>
            <Globe size={13} color="#1e4620" strokeWidth={2.5} />
            {LANGS.map((l) => {
              const active = language === l.code;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[
                    styles.langChip,
                    active && styles.langChipActive,
                  ]}
                  onPress={() => setLanguage(l.code)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.langChipText,
                    active && styles.langChipTextActive,
                  ]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Hero Text ── */}
        <View style={styles.heroArea}>
          <View style={[styles.accentPill, { backgroundColor: '#1e4620' }]}>
            <Text style={styles.accentPillText}>{t('welcomePill')}</Text>
          </View>

          <Text style={[styles.title, { color: '#000000' }]}>
            {t('welcomeTitle')}
          </Text>

          <Text style={[styles.subtitle, { color: '#000000' }]}>
            {t('welcomeSubtitle')}
          </Text>
        </View>

        {/* ── Actions ── */}
        <View
          style={[
            styles.buttonCard,
            { paddingBottom: 24 },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#1e4620', shadowColor: '#1e4620' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={[styles.primaryBtnText, { color: '#ffffff' }]}>
              {t('createAccount')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ghostBtn, { borderColor: '#1e4620' }]}
            activeOpacity={0.6}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.ghostBtnText, { color: '#1e4620' }]}>{t('login')}</Text>
          </TouchableOpacity>

          <Text style={[styles.termsText, { color: '#000000' }]}>
            {t('termsText')}{' '}
            <Text style={{ color: '#1e4620', fontWeight: '600' }}>{t('terms')}</Text>
            {' & '}
            <Text style={{ color: '#1e4620', fontWeight: '600' }}>{t('privacyPolicy')}</Text>
          </Text>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0ede6',
  },
  bg: {
    flex: 1,
  },

  /* Language selector bar */
  langBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  langPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(30,70,32,0.15)',
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  langChipActive: {
    backgroundColor: '#1e4620',
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e4620',
    letterSpacing: 0.3,
  },
  langChipTextActive: {
    color: '#fff',
  },

  heroArea: {
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 28,
  },
  accentPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    marginBottom: 20,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  accentPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: 60,
    marginBottom: 12,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  buttonCard: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 36,
    marginHorizontal: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
    // Soft drop shadow without Android elevation artifacts
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: 0.2,
  },
  ghostBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  ghostBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: 0.2,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    paddingHorizontal: 8,
  },
});

export default WelcomeScreen;
