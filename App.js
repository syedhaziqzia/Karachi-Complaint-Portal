import React from 'react';
import { View, ActivityIndicator, Dimensions, Modal, Text, ImageBackground, StyleSheet } from 'react-native';
import { Smartphone, RotateCw } from 'lucide-react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import VideoSplashScreen from './src/screens/VideoSplashScreen';
import NotificationService from './src/services/NotificationService';

const Stack = createNativeStackNavigator();

export const SplashContext = React.createContext();

const RootNavigator = () => {
  const { isLoggedIn, isBooting } = useAuth();
  const [videoFinished, setVideoFinished] = React.useState(false);

  React.useEffect(() => {
    // Initialize NotificationService to ensure channels exist early on startup
    NotificationService.init().catch(console.warn);
  }, []);

  return (
    <SplashContext.Provider value={{ videoFinished }}>
      {/* 
        We only render the NavigationContainer after isBooting is false so we know 
        whether to show Auth or Main. But we render it UNDER the video splash screen! 
      */}
      {!isBooting && (
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 500,
              contentStyle: { backgroundColor: 'transparent' },
              customAnimationOnGesture: true,
            }}
          >
            {isLoggedIn ? (
              <Stack.Screen name="Main" component={MainTabNavigator} />
            ) : (
              <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}

      {/* The Video Splash Screen plays on top (absolute overlay) */}
      {(!videoFinished || isBooting) && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <VideoSplashScreen onVideoEnd={() => setVideoFinished(true)} />
        </View>
      )}
    </SplashContext.Provider>
  );
};

import { AppProvider } from './src/context/AppContext';
import { ReportingProvider } from './src/context/ReportingContext';
import { NetworkProvider } from './src/context/NetworkContext';

const OrientationOverlay = () => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  
  const [isLandscape, setIsLandscape] = React.useState(() => {
    const { width, height } = Dimensions.get('window');
    return width > height;
  });
  const [showPopup, setShowPopup] = React.useState(false);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    const onChange = ({ window: { width, height } }) => {
      const landscape = width > height;
      setIsLandscape(landscape);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  React.useEffect(() => {
    if (isLandscape) {
      timerRef.current = setTimeout(() => {
        setShowPopup(true);
      }, 2000);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setShowPopup(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLandscape]);

  if (!showPopup) return null;

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.98)' : 'rgba(255,255,255,0.98)', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primaryGlow, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '90deg' }] }}>
            <Smartphone size={44} color={colors.primary} strokeWidth={1.5} />
          </View>
          <View style={{ position: 'absolute', top: -10, right: -10, backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderRadius: 20, padding: 4, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4 }}>
            <RotateCw size={28} color={colors.primary} strokeWidth={2.5} />
          </View>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 12 }}>
          {language === 'ur' ? 'براہ کرم فون کو سیدھا کریں' : language === 'ru' ? 'Bara-e-meharbani phone seedha karein' : 'Please Rotate Device'}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 24, marginBottom: 16 }}>
          {language === 'ur' ? 'یہ ایپ لینڈ سکیپ موڈ کو سپورٹ نہیں کرتی۔ بہترین تجربے کے لیے اپنے فون کو پورٹریٹ موڈ (اوپر کی طرف) میں گھمائیں۔' : language === 'ru' ? 'Ye app landscape mode ko support nahi karti. Behtareen tajarbe ke liye apne phone ko portrait (seedha) mode mein rakhein.' : 'This app does not support landscape mode. Please rotate your phone back to portrait (upright) for the best experience.'}
        </Text>
      </View>
    </Modal>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppProvider>
                <ReportingProvider>
                  <NetworkProvider>
                    <RootNavigator />
                    <OrientationOverlay />
                  </NetworkProvider>
                </ReportingProvider>
              </AppProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
