import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  Image, ScrollView, StatusBar, ActivityIndicator, Modal, Linking, Animated, AppState,
  TouchableWithoutFeedback, Vibration, PanResponder, Easing
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus, LocateFixed, CheckCircle2, Droplets, Hammer, Trash2, Zap, Layout,
  ChevronRight, ArrowLeft, ArrowRight, Wifi, WifiOff, ZoomIn, ZoomOut, Search, MapPin, Camera, Image as ImageIcon, X,
  MapPinOff, Navigation, AlertTriangle, Eye, Clock, User, Shield, Check
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAppContext, CATEGORY_DETAILS } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import LeafletMap from '../../components/main/LeafletMap';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, TextInput } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReporting } from '../../context/ReportingContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SplashContext } from '../../../App';
import firestore from '@react-native-firebase/firestore';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const SwipeDownModal = ({ visible, onClose, children }) => {
  const [modalVisible, setModalVisible] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const onCloseRef = useRef(onClose);
  const isClosingRef = useRef(false);
  const dragValueRef = useRef(0); // Track drag position reliably via ref
  const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.15;

  // Overlay dims as sheet moves down
  const overlayOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Subtle iOS-style scale-down while dragging
  const sheetScale = translateY.interpolate({
    inputRange: [-50, 0, SCREEN_HEIGHT * 0.3],
    outputRange: [1, 1, 0.97],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const animateOpen = useCallback(() => {
    translateY.setValue(SCREEN_HEIGHT);
    dragValueRef.current = 0;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: false,
      damping: 28,
      mass: 0.9,
      stiffness: 300,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
    }).start();
  }, [translateY]);

  const animateClose = useCallback((velocity = 0) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    // Faster flick → faster close
    const baseDuration = 280;
    const velocityFactor = Math.min(Math.abs(velocity) * 40, 150);
    const duration = Math.max(baseDuration - velocityFactor, 150);

    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setModalVisible(false);
      isClosingRef.current = false;
      dragValueRef.current = 0;
    });
    onCloseRef.current();
  }, [translateY]);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalVisible(true);
      requestAnimationFrame(() => animateOpen());
    } else if (modalVisible && !isClosingRef.current) {
      animateClose(0);
    }
  }, [visible, animateOpen, animateClose, modalVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Bubble phase — claim if vertical drag detected
      onMoveShouldSetPanResponder: (_evt, gs) => {
        return gs.dy > 4 && Math.abs(gs.dy) > Math.abs(gs.dx);
      },
      // Capture phase — steal from child TouchableOpacity on clear vertical drag
      onMoveShouldSetPanResponderCapture: (_evt, gs) => {
        return gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2;
      },
      onPanResponderGrant: (_evt, gs) => {
        dragValueRef.current = gs.dy; // We'll use this to offset the movement
        translateY.stopAnimation((value) => {
          // value is the current translateY position
          translateY.setOffset(value);
          translateY.setValue(0);
        });
      },
      onPanResponderMove: (_evt, gs) => {
        // gs.dy contains the total movement since the touch started.
        // We subtract the dy at the time of grant to avoid a sudden jump.
        const activeDy = gs.dy - dragValueRef.current;

        if (activeDy > 0) {
          translateY.setValue(activeDy);
        } else {
          // Rubber-band resistance when pulling up
          const resistance = Math.log10(Math.abs(activeDy) + 1) * 12;
          translateY.setValue(-resistance);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        translateY.flattenOffset();

        // Since we flattened the offset, the internal value of translateY is the true position.
        // But stopAnimation is async, so we'll just evaluate based on the current raw dy and velocity.
        const activeDy = gs.dy - dragValueRef.current;

        const shouldDismiss =
          activeDy > DISMISS_THRESHOLD ||       // Dragged past threshold
          gs.vy > 0.5 ||                        // Fast flick down
          (activeDy > 60 && gs.vy > 0.15);      // Moderate drag + some velocity

        if (shouldDismiss) {
          animateClose(gs.vy);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: false,
            damping: 22,
            mass: 0.8,
            stiffness: 350,
            restDisplacementThreshold: 0.5,
            restSpeedThreshold: 0.5,
          }).start();
          dragValueRef.current = 0;
        }
      },
      onPanResponderTerminate: () => {
        translateY.flattenOffset();
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
          damping: 22,
          mass: 0.8,
          stiffness: 350,
        }).start();
        dragValueRef.current = 0;
      },
    })
  ).current;

  if (!modalVisible) return null;

  return (
    <Modal visible={true} transparent animationType="none" onRequestClose={() => animateClose(0)}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Dimming overlay — tap to dismiss */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => animateClose(0)} />
        </Animated.View>
        {/* Sheet — draggable */}
        <Animated.View
          style={{
            transform: [
              { translateY },
              { scale: sheetScale },
            ],
          }}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

// Helper: returns true ONLY when the device's location service is turned off in Settings.
// Code 1 = PERMISSION_DENIED (the app lost permission — different modal needed)
// Code 2 = POSITION_UNAVAILABLE (the device location toggle is OFF — show "enable location" modal)
// Code 3 = TIMEOUT (location enabled but no fix yet — do NOT alarm the user)
const isLocationServiceDisabled = (err) => {
  if (!err) return false;
  // Code 1: Permission Denied, Code 2: Position Unavailable, Code 3: Timeout
  // Only Code 2 reliably indicates that the device location service is turned off.
  return err.code === 2;
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const { width } = Dimensions.get('window');

const KARACHI_DEFAULT = { lat: 24.9180, lng: 67.0971 }; // Gulshan-e-Iqbal

const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
    } catch (err) {
      console.warn(err);
    }
  }
};

const NakshaScreen = () => {
  const { colors, isDark } = useTheme();
  const { t, language, toUrduNumerals, translateLocation, translateName } = useLanguage();
  const { addComplaint, complaints, mapComplaints, isAnonymous, triggerHaptic, setLocalArea, showAppTutorial, complaintsLoaded } = useAppContext();
  const { user } = useAuth();
  const { isConnected, requireInternet } = useNetwork();
  const { startReporting, stopReporting, registerResetHandler } = useReporting();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const splashContext = React.useContext(SplashContext);
  const videoFinished = splashContext?.videoFinished ?? true;

  // Tab bar is typically ~60px + device bottom inset
  const TAB_HEIGHT = 60 + (insets.bottom || 0);

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState({ lat: 24.9180, lng: 67.0971 });
  const [selectedAddress, setSelectedAddress] = useState('Fetching address...');
  const [selectedAddressUr, setSelectedAddressUr] = useState('پتہ تلاش کیا جا رہا ہے...');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const hasInitialLocRef = useRef(false);
  const [mapFilter, setMapFilter] = useState('All');
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [isPinReportMode, setIsPinReportMode] = useState(false);
  const [isReportingPinVisible, setIsReportingPinVisible] = useState(false);
  const [hasDroppedPin, setHasDroppedPin] = useState(false);
  // Tracks whether the current report is using live GPS vs. dropped pin
  const [isUsingMyLocation, setIsUsingMyLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showReportOptionsModal, setShowReportOptionsModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialType, setTutorialType] = useState('pin'); // 'gps' | 'pin'
  const [showReportingTypesIntro, setShowReportingTypesIntro] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  // Per-method error modals
  const [showNoWifiGpsModal, setShowNoWifiGpsModal] = useState(false);
  const [showNoWifiPinModal, setShowNoWifiPinModal] = useState(false);
  const [showLocOffGpsModal, setShowLocOffGpsModal] = useState(false);
  const [showLocOffPinModal, setShowLocOffPinModal] = useState(false);
  // Search-error modal (replaces native Alert for search failures)
  const [showSearchErrorModal, setShowSearchErrorModal] = useState(false);
  const [searchErrorInfo, setSearchErrorInfo] = useState({ title: '', message: '' });
  const locationModalAnim = useRef(new Animated.Value(0)).current;
  const complaintPopupAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  // Track dropped pin location so it persists across map rebuilds (language/theme change)
  const droppedPinLocationRef = useRef(null);
  const locationAlertShown = useRef(false);
  const [shouldShowLocationError, setShouldShowLocationError] = useState(false);
  // Tracks whether location service was turned off while user is mid-report
  const locationLostDuringReport = useRef(false);
  const isLocationOff = useRef(false);
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);
  // Tracks whether the GPS tutorial was shown as a gate before starting the report
  const pendingGpsReport = useRef(false);
  const pinTutorialTimerRef = useRef(null);
  const pinAutoResetTimerRef = useRef(null);
  
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [showDistanceErrorModal, setShowDistanceErrorModal] = useState(false);
  const [duplicateComplaintId, setDuplicateComplaintId] = useState(null);
  const [showSelfDuplicateModal, setShowSelfDuplicateModal] = useState(false);

  const handleCloseReportingIntro = async () => {
    setShowReportingTypesIntro(false);
    try {
      const key = `@kcp_reporting_intro_shown_${user?.id || 'guest'}`;
      await AsyncStorage.setItem(key, 'true');
    } catch (e) { }
    // Automatically open the options after dismissing the intro
    setTimeout(() => {
      setShowReportOptionsModal(true);
    }, 400);
  };

  const handleTapReportIssue = async () => {
    try {
      const key = `@kcp_reporting_intro_shown_${user?.id || 'guest'}`;
      const hasSeen = await AsyncStorage.getItem(key);
      if (hasSeen !== 'true') {
        setShowReportingTypesIntro(true);
      } else {
        setShowReportOptionsModal(true);
      }
    } catch (e) {
      setShowReportOptionsModal(true);
    }
  };

  const renderStepIndicator = (currentStepIndex, isCamera = false) => (
    <View style={[styles.topStepContainer, {
      paddingHorizontal: isCamera ? 16 : 20,
      paddingBottom: isCamera ? 0 : 12,
      paddingTop: isCamera ? 16 : 0,
    }]}>
      <View style={styles.topStepRow}>
        {[0, 1, 2].map(i => {
          const isActive = i === currentStepIndex;
          const isPassed = i < currentStepIndex;
          let bgColor = isActive || isPassed ? colors.primary : (isDark || isCamera ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)');
          return (
            <View
              key={i}
              style={[
                styles.topStepPill,
                {
                  flex: isActive ? 2 : 1,
                  backgroundColor: bgColor,
                }
              ]}
            />
          );
        })}
      </View>
    </View>
  );

  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
    if (pinAutoResetTimerRef.current) clearTimeout(pinAutoResetTimerRef.current);
    if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);

    const uid = user?.id || 'guest';
    if (tutorialType === 'gps') {
      // Persist GPS tutorial seen — keyed by user ID so it survives reinstalls
      AsyncStorage.setItem(`@kcp_gps_tutorial_shown_${uid}`, 'true').catch(() => { });
      // If this tutorial was shown before starting a GPS report, resume now
      if (pendingGpsReport.current) {
        pendingGpsReport.current = false;
        setTimeout(() => handleReportAtMyLocation(), 300);
      }
    } else if (tutorialType === 'pin') {
      AsyncStorage.setItem(`@kcp_pin_tutorial_shown_${uid}`, 'true').catch(() => { });
      if (isPinReportMode && !isReportingPinVisible && !hasDroppedPin) {
        if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
        pinTutorialTimerRef.current = setTimeout(triggerHowToDropHelp, 10000);
      }
    } else if (tutorialType === 'how_to_drop') {
      AsyncStorage.setItem(`@kcp_how_to_drop_shown_${uid}`, 'true').catch(() => { });
      if (isPinReportMode && !hasDroppedPin) {
        if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
        pinTutorialTimerRef.current = setTimeout(() => {
          handleReset();
        }, 10000);
      }
    }
  };

  const triggerHowToDropHelp = async (forceShow = false) => {
    if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
    if (pinAutoResetTimerRef.current) clearTimeout(pinAutoResetTimerRef.current);

    // Always show the popup as a reminder if the user is idle
    setTutorialType('how_to_drop');
    setShowTutorialModal(true);

    pinAutoResetTimerRef.current = setTimeout(() => {
      setShowTutorialModal(false);
      pinTutorialTimerRef.current = setTimeout(() => {
        handleReset();
      }, 10000);
    }, 10000);
  };

  const categories = [
    { id: 'Sewerage', label: t('CatSewerage'), icon: Droplets, color: '#3B82F6' },
    { id: 'Broken Roads', label: t('CatBrokenRoads'), icon: Hammer, color: '#F59E0B' },
    { id: 'Waste', label: t('CatWaste'), icon: Trash2, color: '#22C55E' },
    { id: 'Kunda', label: t('CatKunda'), icon: Zap, color: '#EF4444' },
    { id: 'Encroachment', label: t('CatEncroachment'), icon: Layout, color: '#8B5CF6' },
  ];

  const CAT_COLORS = {
    'Sewerage': '#3B82F6', 'Broken Roads': '#F59E0B', 'Waste': '#22C55E', 'Kunda': '#EF4444', 'Encroachment': '#8B5CF6'
  };

  // Show the app-themed location modal instead of native Alert
  const showLocationError = useCallback(() => {
    if (!showLocationModal) {
      setShowLocationModal(true);
      Animated.spring(locationModalAnim, {
        toValue: 1, useNativeDriver: true, tension: 65, friction: 9
      }).start();
    }
  }, [showLocationModal, locationModalAnim]);

  useEffect(() => {
    if (shouldShowLocationError && videoFinished) {
      // Wait 2-3 seconds AFTER the video has already ended before showing the modal
      const timer = setTimeout(() => {
        showLocationError();
        setShouldShowLocationError(false);
      }, 2800); // 2.8s after video ends
      return () => clearTimeout(timer);
    }
  }, [shouldShowLocationError, videoFinished, showLocationError]);

  const hideLocationModal = useCallback(() => {
    Animated.timing(locationModalAnim, {
      toValue: 0, duration: 200, useNativeDriver: true
    }).start(() => setShowLocationModal(false));
  }, [locationModalAnim]);

  const openDeviceSettings = useCallback(() => {
    hideLocationModal();
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
        Linking.sendIntent('android.settings.SETTINGS').catch(() => {
          Linking.openSettings().catch(() => { });
        });
      });
    } else {
      Linking.openSettings().catch(() => { });
    }
  }, [hideLocationModal]);

  // Complaint popup animations
  const showComplaintPopup = useCallback((complaint) => {
    // Reset animation value for fresh entrance even when switching complaints
    complaintPopupAnim.setValue(0);
    setSelectedComplaint(complaint);
    Animated.spring(complaintPopupAnim, {
      toValue: 1, useNativeDriver: true, tension: 80, friction: 10
    }).start();
  }, [complaintPopupAnim]);

  const hideComplaintPopup = useCallback(() => {
    Animated.timing(complaintPopupAnim, {
      toValue: 0, duration: 180, useNativeDriver: true
    }).start(() => setSelectedComplaint(null));
  }, [complaintPopupAnim]);

  const clearComplaintPopup = useCallback(() => {
    complaintPopupAnim.setValue(0);
    setSelectedComplaint(null);
  }, [complaintPopupAnim]);

  const handleComplaintClick = useCallback((complaintId, coords) => {
    // Require internet to view complaint details
    if (!isConnected) {
      requireInternet(() => { }); // triggers the no-internet modal
      return;
    }
    const found = mapComplaints.find(c => c.id === complaintId);
    if (!found) return;
    // If same complaint is already open, do nothing
    if (selectedComplaint && selectedComplaint.id === complaintId) return;
    // Show new popup (animation resets internally)
    showComplaintPopup(found);
  }, [mapComplaints, isConnected, selectedComplaint, requireInternet, showComplaintPopup]);

  const handleMapInteraction = useCallback(() => {
    if (selectedComplaint) {
      clearComplaintPopup();
    }
  }, [selectedComplaint, clearComplaintPopup]);


  // Known landmark & area points for instant fallback
  const KNOWN_POINTS = useMemo(() => [
    // Gulshan-e-Iqbal Landmarks
    { name: 'NIPA Chowrangi', area: 'Gulshan-e-Iqbal', lat: 24.9184, lng: 67.0980 },
    { name: 'Hassan Square', area: 'Gulshan-e-Iqbal', lat: 24.9080, lng: 67.0700 },
    { name: 'Disco Bakery', area: 'Gulshan-e-Iqbal', lat: 24.9250, lng: 67.0850 },
    { name: 'Maskan Chowrangi', area: 'Gulshan-e-Iqbal', lat: 24.9490, lng: 67.1080 },
    { name: 'Aziz Bhatti Park', area: 'Gulshan-e-Iqbal', lat: 24.9140, lng: 67.0900 },
    { name: 'NED University', area: 'Gulshan-e-Iqbal', lat: 24.9320, lng: 67.1150 },
    { name: 'Patel Hospital', area: 'Gulshan-e-Iqbal', lat: 24.9220, lng: 67.1000 },
    { name: 'Sir Syed University', area: 'Gulshan-e-Iqbal', lat: 24.9160, lng: 67.0940 },
    { name: 'Lucky One Mall', area: 'Gulshan-e-Iqbal', lat: 24.9272, lng: 67.0883 },
    { name: 'Expo Center', area: 'Gulshan-e-Iqbal', lat: 24.9189, lng: 67.0701 },
    { name: 'Safari Park', area: 'Gulshan-e-Iqbal', lat: 24.9218, lng: 67.1190 },

    // Gulistan-e-Jauhar Landmarks
    { name: 'Jauhar Chowrangi', area: 'Gulistan-e-Jauhar', lat: 24.9130, lng: 67.1270 },
    { name: 'Kamran Chowrangi', area: 'Gulistan-e-Jauhar', lat: 24.9260, lng: 67.1320 },
    { name: 'Munawar Chowrangi', area: 'Gulistan-e-Jauhar', lat: 24.9350, lng: 67.1350 },
    { name: 'Samama Shopping Mall', area: 'Gulistan-e-Jauhar', lat: 24.9200, lng: 67.1220 },
    { name: 'Darul Sehat Hospital', area: 'Gulistan-e-Jauhar', lat: 24.9220, lng: 67.1300 },
    { name: 'Perfume Chowk', area: 'Gulistan-e-Jauhar', lat: 24.9150, lng: 67.1290 },
    { name: 'Millennium Mall', area: 'Gulistan-e-Jauhar', lat: 24.9031, lng: 67.1120 },

    { name: 'Dolmen Mall', area: 'Clifton', lat: 24.8037, lng: 67.0309 },
    { name: 'Sea View Beach', area: 'Clifton', lat: 24.7960, lng: 67.0450 },
    { name: 'Mazar-e-Quaid', area: 'Saddar', lat: 24.8746, lng: 67.0394 },
    { name: 'Atrium Mall', area: 'Saddar', lat: 24.8560, lng: 67.0260 },
    { name: 'Hyperstar', area: 'Clifton', lat: 24.8150, lng: 67.0350 },
    { name: 'Five Star Chowrangi', area: 'North Nazimabad', lat: 24.9380, lng: 67.0500 },
    { name: 'Burns Road', area: 'Saddar', lat: 24.8600, lng: 67.0120 },
    { name: 'Aga Khan Hospital', area: 'Stadium Road', lat: 24.8920, lng: 67.0750 },
    { name: 'Karachi University', area: 'Gulshan-e-Iqbal', lat: 24.9450, lng: 67.1150 },
    { name: 'Gulshan-e-Iqbal', lat: 24.9168, lng: 67.0890 },
    { name: 'Clifton', lat: 24.8094, lng: 67.0289 },
    { name: 'DHA Phase 2', lat: 24.7914, lng: 67.0537 },
    { name: 'Saddar', lat: 24.8578, lng: 67.0105 },
    { name: 'North Nazimabad', lat: 24.9387, lng: 67.0631 },
    { name: 'Nazimabad', lat: 24.9214, lng: 67.0423 },
    { name: 'Malir', lat: 24.8936, lng: 67.2047 },
    { name: 'Korangi', lat: 24.8292, lng: 67.1270 },
    { name: 'Lyari', lat: 24.8576, lng: 66.9940 },
    { name: 'Gulistan-e-Jauhar', lat: 24.9167, lng: 67.1307 },
    { name: 'FB Area', lat: 24.9503, lng: 67.0693 },
    { name: 'Kemari', lat: 24.8320, lng: 66.9840 },
    { name: 'Hawkes Bay', area: 'West Karachi', lat: 24.8670, lng: 66.8550 },
    { name: 'Manora Island', area: 'Kemari', lat: 24.7930, lng: 66.9730 },
    { name: 'Ibrahim Hyderi', area: 'Korangi', lat: 24.7910, lng: 67.1580 },
    { name: 'Sandspit', area: 'Hawkes Bay', lat: 24.8420, lng: 66.9070 },
    // Karachi University Specific Locations (for accurate demonstration)
    { name: 'UBIT (Computer Science), KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9457, lng: 67.1145 },
    { name: 'UBIT (Computer Science), KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9459, lng: 67.1143 }, // UBIT North-West
    { name: 'UBIT (Computer Science), KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9455, lng: 67.1147 }, // UBIT South-East
    { name: 'UBIT (Computer Science), KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9460, lng: 67.1145 }, // UBIT North (Parking/Gate)
    { name: 'UBIT (Computer Science), KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9454, lng: 67.1145 }, // UBIT South
    { name: 'UBIT (Computer Science), KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9458, lng: 67.1147 }, // UBIT East
    { name: 'Pharmacy Department, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9470, lng: 67.1160 },
    { name: 'Chemistry Department, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9440, lng: 67.1130 },
    { name: 'Physics Department, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9465, lng: 67.1125 },
    { name: 'English Department, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9415, lng: 67.1170 },
    { name: 'Business School (KUBS), KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9430, lng: 67.1185 },
    { name: 'Visual Studies, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9420, lng: 67.1120 },
    { name: 'HEJ Research Institute, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9475, lng: 67.1130 },
    { name: 'ICCBS, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9480, lng: 67.1140 },
    { name: 'Main Cafeteria, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9430, lng: 67.1140 },
    { name: 'Teachers Canteen, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9435, lng: 67.1150 },
    { name: 'PG Canteen, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9460, lng: 67.1155 },
    { name: 'Science Canteen, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9455, lng: 67.1135 },
    { name: 'Masjid-e-Ibrahim, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9415, lng: 67.1155 },
    { name: 'IBA Main Campus, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9390, lng: 67.1150 },
    { name: 'Mahmud Husain Library, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9445, lng: 67.1180 },
    { name: 'Arts Lobby, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9435, lng: 67.1165 },
    { name: 'Silver Jubilee Gate, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9335, lng: 67.1165 },
    { name: 'Maskan Gate, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9485, lng: 67.1085 },
    { name: 'Staff Gate, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9460, lng: 67.1230 },
    { name: 'Sheikh Zayed Islamic Centre, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9410, lng: 67.1110 },
    { name: 'Botanical Garden, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9455, lng: 67.1220 },
    { name: 'Zoology Department, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9425, lng: 67.1135 },
    { name: 'Gymnasium, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9400, lng: 67.1130 },
    { name: 'Valika Cricket Ground, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9405, lng: 67.1180 },
    { name: 'Administration Block, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9450, lng: 67.1170 },
    { name: 'Clinic, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9442, lng: 67.1175 },
    { name: 'Azadi Chowk, KU, Gulshan-e-Iqbal', area: 'Gulshan-e-Iqbal', lat: 24.9440, lng: 67.1155 },
  ], []);

  // Detect if a coordinate is in the ocean/sea (south of Karachi's coastline)
  const isOceanLocation = useCallback((lat, lng) => {
    // Karachi coast runs roughly along these latitudes
    // Below these points is the Arabian Sea
    const coastline = [
      { lng: 66.80, maxLat: 24.85 },
      { lng: 66.90, maxLat: 24.82 },
      { lng: 66.95, maxLat: 24.82 },
      { lng: 67.00, maxLat: 24.83 },
      { lng: 67.03, maxLat: 24.80 },
      { lng: 67.05, maxLat: 24.79 },
      { lng: 67.10, maxLat: 24.79 },
      { lng: 67.15, maxLat: 24.79 },
      { lng: 67.20, maxLat: 24.78 },
      { lng: 67.30, maxLat: 24.78 },
      { lng: 67.40, maxLat: 24.78 },
    ];
    // If latitude is very low (clearly in water)
    if (lat < 24.70) return true;
    // Find the two nearest coastline segments and interpolate
    for (let i = 0; i < coastline.length - 1; i++) {
      if (lng >= coastline[i].lng && lng <= coastline[i + 1].lng) {
        const ratio = (lng - coastline[i].lng) / (coastline[i + 1].lng - coastline[i].lng);
        const maxLat = coastline[i].maxLat + ratio * (coastline[i + 1].maxLat - coastline[i].maxLat);
        return lat < maxLat;
      }
    }
    // Outside our coastline data range, check if below general threshold
    if (lng < coastline[0].lng) return lat < coastline[0].maxLat;
    if (lng > coastline[coastline.length - 1].lng) return lat < coastline[coastline.length - 1].maxLat;
    return false;
  }, []);

  // Find the nearest known point to given coordinates
  const findNearestPoint = useCallback((lat, lng) => {
    let nearest = KNOWN_POINTS[0], minDist = Infinity;
    KNOWN_POINTS.forEach(p => {
      const dist = Math.hypot(p.lat - lat, p.lng - lng);
      if (dist < minDist) { minDist = dist; nearest = p; }
    });
    return nearest;
  }, [KNOWN_POINTS]);

  const updateLocalAreaFromCoords = useCallback((lat, lng) => {
    const nearest = findNearestPoint(lat, lng);
    const detectedArea = nearest.area || nearest.name;
    const mainZoneMap = {
      'Karachi University': 'Gulshan-e-Iqbal',
      'Stadium Road': 'Gulshan-e-Iqbal',
      'North Nazimabad': 'Nazimabad',
      'West Karachi': 'Lyari',
      'Kemari': 'Lyari',
      'Hawkes Bay': 'Lyari',
      'FB Area': 'Gulshan-e-Iqbal',
      'DHA Phase 2': 'DHA',
      'Sandspit': 'Lyari',
      'Manora Island': 'Lyari',
      'Ibrahim Hyderi': 'Korangi'
    };
    const finalArea = mainZoneMap[detectedArea] || detectedArea;
    setLocalArea(finalArea);
  }, [findNearestPoint, setLocalArea]);

  const fetchAddress = useCallback(async (lat, lng) => {
    const acceptLang = 'en'; // always use english for canonical address

    // Build a short, readable place name from Nominatim's address object
    const parseAddr = (address) => {
      const street = address.road || address.pedestrian || address.path || address.footway;
      const area = address.neighbourhood || address.residential || address.hamlet
        || address.suburb || address.city_district || address.village
        || address.town || address.city;
      if (street && area && street !== area) return `${street}, ${area}`;
      if (street) return street;
      if (area) return area;
      return null;
    };

    const formatLocationString = (locName) => {
      const vars = ['Near', 'Close to', 'Around', 'Vicinity of', 'Just by'];
      return `${vars[Math.floor(Math.random() * vars.length)]} ${locName}`;
    };

    const buildLocationName = (nearestPoint) => {
      const tName = nearestPoint.name;
      const tArea = nearestPoint.area ? nearestPoint.area : null;
      if (tArea && tArea !== tName) return `${tName}, ${tArea}`;
      return tName;
    };

    const updateAddresses = async (locName) => {
      const enLoc = formatLocationString(locName);
      setSelectedAddress(enLoc);
      try {
        const rTrans = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=${encodeURIComponent(enLoc)}`);
        const tData = await rTrans.json();
        const urLoc = tData[0][0][0];
        setSelectedAddressUr(urLoc);
      } catch (e) {
        setSelectedAddressUr(translateLocation(enLoc));
      }
    };

    // If the pin is in the ocean/sea, always show "Near [closest land location]"
    if (isOceanLocation(lat, lng)) {
      const nearest = findNearestPoint(lat, lng);
      updateAddresses(buildLocationName(nearest));
      return; // Don't try API — ocean coords return bad results
    }

    // 0. Immediate Speed Fallback (Instant UI update)
    const nearest = findNearestPoint(lat, lng);
    updateAddresses(buildLocationName(nearest));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second max wait

    try {
      // 1st try — Nominatim (OpenStreetMap)
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${acceptLang}`,
        {
          headers: { 'User-Agent': 'KarachiComplaintPortal/1.0', 'Accept-Language': acceptLang },
          signal: controller.signal
        }
      );
      if (r.ok) {
        const d = await r.json();
        clearTimeout(timeoutId);
        // Check if the API returned an ocean/water result
        if (d?.address && (d.address.water || d.address.sea || d.address.ocean
          || (d.display_name && d.display_name.toLowerCase().includes('arabian sea')))) {
          // Keep the nearest-land fallback already set above
          return;
        }
        if (d?.address) {
          const name = parseAddr(d.address);
          if (name) {
            updateAddresses(name);
            return;
          }
        }
        if (d?.display_name) {
          const parts = d.display_name.split(',').map(s => s.trim()).filter(Boolean);
          // If display_name mentions ocean/sea, keep fallback
          if (parts.some(p => p.toLowerCase().includes('arabian') || p.toLowerCase().includes('sea') || p.toLowerCase().includes('ocean'))) {
            return; // Keep the nearest-point fallback
          }
          const name = parts.slice(0, 2).join(', ');
          updateAddresses(name);
          return;
        }
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Nominatim API Error:', error?.message ?? error);
      }
    }

    // 2nd try — Photon / Komoot (no rate limiting)
    try {
      const r2 = await fetch(
        `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&lang=${acceptLang}`,
        { signal: controller.signal }
      );
      if (r2.ok) {
        const d2 = await r2.json();
        clearTimeout(timeoutId);
        const p = d2?.features?.[0]?.properties;
        if (p) {
          const street = p.street || p.name;
          const area = p.district || p.locality || p.suburb || p.city;
          let name;
          if (street && area && street !== area) { name = `${street}, ${area}`; }
          else if (street) { name = street; }
          else if (area) { name = area; }

          if (name) {
            updateAddresses(name);
            return;
          }
        }
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Photon API Error:', error?.message ?? error);
      }
    }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [isOceanLocation, findNearestPoint, translateLocation]);

  // Re-fetch address when language changes to instantly update the geocoded name
  useEffect(() => {
    if (hasDroppedPin && selectedLocation) {
      fetchAddress(selectedLocation.lat, selectedLocation.lng);
    }
  }, [language, hasDroppedPin, selectedLocation, fetchAddress]);

  useEffect(() => {
    let watchId;
    const startWatching = async () => {
      await requestLocationPermission();
      watchId = Geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const loc = { lat: latitude, lng: longitude, accuracy };
          setUserLocation(loc);
          isLocationOff.current = false;
          // Location came back — reset alert guard so it can fire again if needed later
          locationAlertShown.current = false;
          locationLostDuringReport.current = false;
          hideLocationModal();

          // Auto-pan once on the very first location fix
          if (!hasInitialLocRef.current) {
            hasInitialLocRef.current = true;
            setSelectedLocation(loc);
            fetchAddress(loc.lat, loc.lng);
            if (mapRef.current) mapRef.current.panToUser(loc);
            updateLocalAreaFromCoords(loc.lat, loc.lng);
          }
        },
        (err) => {
          // ONLY code 2 (POSITION_UNAVAILABLE) means the device location switch is OFF.
          // code 1 = permission denied (different issue), code 3 = timeout (harmless).
          if (!isLocationServiceDisabled(err)) return;
          isLocationOff.current = true;
          if (locationAlertShown.current) return; // Already showed once — don't repeat
          locationAlertShown.current = true;

          // If user is mid-report (step > 0), show the modal immediately (no video delay)
          const currentStep = stepRef.current;
          if (currentStep > 0) {
            // Mid-report: show location error right away
            locationLostDuringReport.current = true;
            showLocationError();
          } else {
            // On map view: respect the video-finish delay
            setShouldShowLocationError(true);
            fetchAddress(KARACHI_DEFAULT.lat, KARACHI_DEFAULT.lng);
          }
        },
        { enableHighAccuracy: true, distanceFilter: 5, interval: 5000, fastestInterval: 2000 }
      );
    };

    startWatching();
    return () => {
      if (watchId !== undefined) Geolocation.clearWatch(watchId);
    };
  }, [fetchAddress, showLocationError, hideLocationModal, updateLocalAreaFromCoords]);

  // Re-probe location when app returns to foreground (e.g. after user enables location in Settings).
  // The watchPosition watcher may not fire immediately, so this provides instant feedback.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isLocationOff.current) {
        // App came to foreground — only check if we currently think it's offline
        Geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const loc = { lat: latitude, lng: longitude, accuracy };
            setUserLocation(loc);
            isLocationOff.current = false;
            locationAlertShown.current = false;
            locationLostDuringReport.current = false;
            // Auto-dismiss the location modal if it's showing
            hideLocationModal();
          },
          (err) => {
            if (isLocationServiceDisabled(err)) {
              isLocationOff.current = true;
            }
          },
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 1000 }
        );
      }
    });
    return () => subscription.remove();
  }, [hideLocationModal]);



  // Re-center map to user's current location every time this screen gains focus
  // (tab switch, app reopen, "go back to map" button, etc.)
  // NOTE: Use refs inside the callback so deps stay [] — useFocusEffect re-runs
  // the effect whenever the callback reference changes, so a changing dep like
  // userLocation would pan the map on every GPS tick while the screen is focused.
  const userLocationRef = useRef(userLocation);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  const fetchAddressRef = useRef(fetchAddress);
  useEffect(() => { fetchAddressRef.current = fetchAddress; }, [fetchAddress]);
  const updateLocalAreaRef = useRef(updateLocalAreaFromCoords);
  useEffect(() => { updateLocalAreaRef.current = updateLocalAreaFromCoords; }, [updateLocalAreaFromCoords]);

  useFocusEffect(
    useCallback(() => {
      const loc = userLocationRef.current;
      if (loc && mapRef.current) {
        mapRef.current.panToUser(loc);
      } else if (!loc) {
        // If we don't have a GPS fix yet, try getting one now
        Geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const newLoc = { lat: latitude, lng: longitude, accuracy };
            setUserLocation(newLoc);
            setSelectedLocation(newLoc);
            fetchAddressRef.current(newLoc.lat, newLoc.lng);
            if (mapRef.current) mapRef.current.panToUser(newLoc);
            updateLocalAreaRef.current(newLoc.lat, newLoc.lng);
          },
          (err) => {
            // Only show modal if device location switch is genuinely OFF (code 2)
            if (isLocationServiceDisabled(err) && !locationAlertShown.current) {
              locationAlertShown.current = true;
              setShouldShowLocationError(true);
            }
            // Always fall back to the default map center
            if (mapRef.current) mapRef.current.panToUser(KARACHI_DEFAULT);
            fetchAddressRef.current(KARACHI_DEFAULT.lat, KARACHI_DEFAULT.lng);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
        );
      }
    }, [])
  );

  useEffect(() => {
    if (isConnected) {
      if (showNoWifiGpsModal) setShowNoWifiGpsModal(false);
      if (showNoWifiPinModal) setShowNoWifiPinModal(false);
    }
  }, [isConnected, showNoWifiGpsModal, showNoWifiPinModal]);

  const handleLocateMe = () => {
    // Dismiss any open complaint popup before panning
    if (selectedComplaint) clearComplaintPopup();
    setIsLocating(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setIsLocating(false);
        const loc = { lat: latitude, lng: longitude, accuracy };

        setUserLocation(loc);
        if (mapRef.current) { mapRef.current.panToUser(loc); }
        updateLocalAreaFromCoords(loc.lat, loc.lng);
      },
      (err) => {
        setIsLocating(false);
        // Only show the modal when device location switch is OFF (code 2)
        if (isLocationServiceDisabled(err)) {
          showLocationError();
        }
        if (mapRef.current) { mapRef.current.panToUser(userLocation || KARACHI_DEFAULT); }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
    );
  };

  const handleStartReport = async () => {
    // Clear any idle timers
    if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
    if (pinAutoResetTimerRef.current) clearTimeout(pinAutoResetTimerRef.current);

    // Immediate guard: if the watcher already flagged location as off, block instantly
    if (isLocationOff.current && !isPinReportMode) { showLocationError(); return; }
    triggerHaptic();
    if (selectedComplaint) clearComplaintPopup();

    if (!isReportingPinVisible || !hasDroppedPin) {
      // If user clicks Confirm without dropping a pin, show the old tutorial modal
      setShowTutorialModal(true);
      return;
    }

    // If in Pin Report mode, bypass GPS location check completely!
    if (isPinReportMode) {

      setStep(1);
      startReporting();
      return;
    }

    // Synchronous location probe — catches the case where user just turned off
    // location but the watchPosition watcher hasn't fired its error callback yet
    // (it polls every 5s). This ensures we NEVER start reporting without location.
    Geolocation.getCurrentPosition(
      () => {
        // Location is confirmed available — proceed to report

        setStep(1);
        startReporting();
      },
      (err) => {
        if (isLocationServiceDisabled(err)) {
          isLocationOff.current = true;
          showLocationError();
        } else {
          // Permission denied or timeout — still allow reporting since GPS may just be slow

          setStep(1);
          startReporting();
        }
      },
      { enableHighAccuracy: false, timeout: 2000, maximumAge: 5000 }
    );
  };

  // ─── "Report at My Location" ─── Quick-report using current GPS position.
  const handleReportAtMyLocation = () => {
    triggerHaptic();
    // Guard: require internet
    if (!isConnected) { requireInternet(() => { }); return; }
    // Guard: location watcher says location is off
    if (isLocationOff.current) { showLocationError(); return; }
    // Dismiss any open complaint popup
    if (selectedComplaint) clearComplaintPopup();

    setIsGettingLocation(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingLocation(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const loc = { lat: latitude, lng: longitude, accuracy };
        // Set the report location to the live GPS position
        setUserLocation(loc);
        setSelectedLocation(loc);
        fetchAddress(loc.lat, loc.lng);
        updateLocalAreaFromCoords(loc.lat, loc.lng);
        // Mark this report as "my location" (no pin needed)
        setIsUsingMyLocation(true);
        // Pan map to user for visual feedback before transitioning
        if (mapRef.current) mapRef.current.panToUser(loc);
        // Go straight to category selection

        setStep(1);
        startReporting();
      },
      (err) => {
        setIsGettingLocation(false);
        if (isLocationServiceDisabled(err)) {
          isLocationOff.current = true;
          showLocationError();
        } else {
          // GPS timeout or permission issue — show informative error
          showSearchError(
            t('locationNeededTitle', { defaultValue: 'Location Required' }),
            t('gpsUnavailable', { defaultValue: 'Could not get your current location. Please make sure GPS is enabled and try again, or use the Drop Pin method instead.' })
          );
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
    );
  };

  const handleSelectCategory = (cat) => {
    if (!isConnected) { requireInternet(() => { }); return; }
    if ((isLocationOff.current || locationLostDuringReport.current) && !isPinReportMode) { showLocationError(); return; }

    setSelectedCategory(cat);
    setStep(2);
  };
  const handleTakePhoto = () => {
    if (!isConnected) { requireInternet(() => { }); return; }
    if ((isLocationOff.current || locationLostDuringReport.current) && !isPinReportMode) { showLocationError(); return; }
    setShowPhotoSourceModal(true);
  };

  // Show the app-themed search/info error modal (replaces native Alert everywhere)
  const showSearchError = useCallback((title, message) => {
    setSearchErrorInfo({ title, message });
    setShowSearchErrorModal(true);
  }, []);

  const handleCameraSource = async () => {
    setShowPhotoSourceModal(false);
    if (!isConnected) { requireInternet(() => { }); return; }
    if ((isLocationOff.current || locationLostDuringReport.current) && !isPinReportMode) { showLocationError(); return; }
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: t('cameraPermTitle'),
            message: t('cameraPermMsg'),
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          showSearchError(t('permDenied', { defaultValue: 'Permission Denied' }), t('cameraPermRequired', { defaultValue: 'Camera permission is required to take a photo.' }));
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }

    launchCamera({ mediaType: 'photo', cameraType: 'back', quality: 0.8, saveToPhotos: false }, (response) => {
      if (!response.didCancel && !response.errorCode && response.assets && response.assets.length > 0) {

        setCapturedImage(response.assets[0].uri);
        setStep(3);
      }
    });
  };

  const handleGallerySource = () => {
    setShowPhotoSourceModal(false);
    if (!isConnected) { requireInternet(() => { }); return; }
    if ((isLocationOff.current || locationLostDuringReport.current) && !isPinReportMode) { showLocationError(); return; }
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (!response.didCancel && !response.errorCode && response.assets && response.assets.length > 0) {

        setCapturedImage(response.assets[0].uri);
        setStep(3);
      }
    });
  };
  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submit
    setIsSubmitting(true);
    // Guard: require internet to submit
    if (!isConnected) {
      requireInternet(() => { });
      setIsSubmitting(false);
      return;
    }
    // Guard: require location service (warn if it went offline mid-report)
    if ((isLocationOff.current || locationLostDuringReport.current) && !isPinReportMode) {
      showLocationError();
      setIsSubmitting(false);
      return;
    }
    
    // --- Constraints Check ---
    
    // 1. Rate Limit (10 per day via Firestore)
    const today = new Date().toISOString().split('T')[0];
    let todayCount = 0;
    try {
      if (user?.id) {
        const rateDoc = await firestore().collection('rate_limits').doc(user.id).get();
        if (rateDoc.exists) {
          const data = rateDoc.data();
          if (data.date === today) {
            todayCount = data.count || 0;
          }
        }
      }
    } catch(e) {
      console.warn("Failed to fetch rate limit from firestore:", e);
    }
    
    if (todayCount >= 10) {
      setIsSubmitting(false);
      setShowRateLimitModal(true);
      return;
    }

    // 2. Distance Constraint (200m + GPS accuracy buffer) if pin mode
    if (isPinReportMode && userLocation && selectedLocation) {
      const distance = getDistance(userLocation.lat, userLocation.lng, selectedLocation.lat, selectedLocation.lng);
      const allowedDistance = 200 + (userLocation.accuracy || 0);
      if (distance > allowedDistance) {
        setIsSubmitting(false);
        setShowDistanceErrorModal(true);
        return;
      }
    }

    // 3. Duplicate Pin Check (< 30m for same category, ignore resolved)
    if (selectedLocation && selectedCategory) {
      const duplicate = complaints.find(c => 
        c.category === selectedCategory.id && 
        c.status !== 'Resolved' &&
        c.coords &&
        getDistance(c.coords.lat, c.coords.lng, selectedLocation.lat, selectedLocation.lng) <= 30
      );
      if (duplicate) {
        setIsSubmitting(false);
        if (duplicate.userId && user?.id && duplicate.userId === user.id) {
          setShowSelfDuplicateModal(true);
        } else {
          setDuplicateComplaintId(duplicate.id);
        }
        return;
      }
    }

    // --- End Constraints ---


    // Determine reporter name based on anonymous mode
    const reporterName = isAnonymous
      ? 'Anonymous Citizen'
      : (user?.name || 'You');
    const detailsArray = CATEGORY_DETAILS[selectedCategory.id] || [];
    const randomDetail = detailsArray.length > 0
      ? detailsArray[Math.floor(Math.random() * detailsArray.length)]
      : `Reported issue in ${selectedCategory.label} category.`;

    // addComplaint is async (uploads image to Firebase Storage before writing Firestore doc).
    // Always await it so any rejection is caught here rather than becoming an uncaught promise.
    try {
      await addComplaint({
        category: selectedCategory.id,
        location: selectedAddress,
        location_en: selectedAddress,
        location_ur: selectedAddressUr,
        coords: selectedLocation,
        description: randomDetail,
        image: capturedImage,
        severity: 'Very Low',
        reporterName,
        todayCount,
        todayDate: today,
      });

      setStep(4);
    } catch (e) {
      console.warn('handleSubmit: addComplaint error:', e);
      showSearchError(
        t('submitErrorTitle', { defaultValue: 'Submission Failed' }),
        t('submitErrorDesc', { defaultValue: 'Failed to submit your complaint. Please check your connection and try again.' })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!isConnected) {
      requireInternet(() => { });
      return;
    }
    setIsSearching(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const q = encodeURIComponent(`${searchQuery}, Karachi`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
        { headers: { 'User-Agent': 'KCP-App/1.0' }, signal: controller.signal }
      );
      clearTimeout(timeout);
      const data = await response.json();
      if (data && data.length > 0) {
        const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setSelectedLocation(loc);
        // Guard: display_name may be missing on some Nominatim results
        const rawName = data[0].display_name;
        const addressLabel = rawName
          ? rawName.split(',').slice(0, 3).join(',').trim()
          : `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        setSelectedAddress(addressLabel);
        if (mapRef.current) { mapRef.current.panTo(loc, 16); }
      } else {
        showSearchError(
          t('noResults', { defaultValue: 'No Results' }),
          t('noSearchResults', { defaultValue: 'No location found. Try a different search term.' })
        );
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.warn('Search error', e);
      }
      // Check if it's a network issue or a timeout
      const isOffline = !isConnected;
      showSearchError(
        isOffline
          ? t('noInternet', { defaultValue: 'No Internet' })
          : t('searchFailed', { defaultValue: 'Search Failed' }),
        isOffline
          ? t('searchRequiresInternet', { defaultValue: 'Search requires an internet connection.' })
          : t('searchErrorMsg', { defaultValue: 'Could not search right now. Please try again.' })
      );
    } finally {
      setIsSearching(false);
    }
  };

  const filteredMapComplaints = useMemo(() => {
    if (mapFilter === 'All') return mapComplaints;
    return mapComplaints.filter(c => c.category === mapFilter);
  }, [mapComplaints, mapFilter]);

  const handleReset = () => {

    setStep(0);
    setSelectedCategory(null);
    setCapturedImage(null);
    setIsUsingMyLocation(false);
    setIsPinReportMode(false);
    setIsReportingPinVisible(false);
    setHasDroppedPin(false);
    droppedPinLocationRef.current = null;
    if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
    if (pinAutoResetTimerRef.current) clearTimeout(pinAutoResetTimerRef.current);
    stopReporting();
  };

  // Register handleReset so the tab navigator can call it remotely
  useEffect(() => {
    registerResetHandler(handleReset);
  });

  const CARD_BG = isDark ? colors.glass : colors.surface;
  const CARD_BORDER = isDark ? colors.glassBorder : colors.border;
  const MUTED = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,59,36,0.55)';

  /* ── MAP VIEW ── */
  const renderMap = () => (
    <View style={styles.content}>
      {/* Compact header */}
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surface, borderColor: CARD_BORDER }]}>
          <TouchableOpacity
            style={styles.searchIcon}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Search size={18} color={colors.primary} />
            }
          </TouchableOpacity>
          <View style={styles.searchInputWrap}>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('searchInKarachi')}
              placeholderTextColor={isDark ? MUTED : '#111111'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Map Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mapFilterScroll}
        >
          {['All', ...categories.map(c => c.id)].map(cat => {
            const active = mapFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.mapFilterChip,
                  { backgroundColor: active ? colors.primary : CARD_BG, borderColor: active ? colors.primary : CARD_BORDER }
                ]}
                onPress={() => {
                  setMapFilter(cat);
                  // Dismiss complaint popup when changing filter
                  if (selectedComplaint) clearComplaintPopup();
                }}
              >
                <Text style={[styles.mapFilterText, { color: active ? '#fff' : (isDark ? 'rgba(255,255,255,0.75)' : '#111111') }]}>
                  {cat === 'All' ? t('filterAll') :
                    cat === 'Sewerage' ? t('filterSewerage') :
                      cat === 'Broken Roads' ? t('filterRoads') :
                        cat === 'Waste' ? t('filterWaste') :
                          cat === 'Kunda' ? t('filterKunda') :
                            cat === 'Encroachment' ? t('filterEncroachment') : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Map shell — takes most of the screen */}
      <View style={[styles.mapShell, { borderColor: CARD_BORDER }]}>
        <LeafletMap
          ref={mapRef}
          isDark={isDark}
          complaints={filteredMapComplaints}
          userLocation={userLocation}
          showReportingPin={isReportingPinVisible}
          droppedPinLocation={droppedPinLocationRef.current}
          onLocationSelect={(loc) => {
            setHasDroppedPin(true);
            droppedPinLocationRef.current = loc;
            setSelectedLocation(loc);
            fetchAddress(loc.lat, loc.lng);
            // Dismiss any open complaint popup when user taps to drop pin
            if (selectedComplaint) clearComplaintPopup();

            // Auto-reset timer if user doesn't hit submit within 10s of dropping
            if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
            if (pinAutoResetTimerRef.current) clearTimeout(pinAutoResetTimerRef.current);
            pinAutoResetTimerRef.current = setTimeout(() => {
              handleReset();
            }, 10000);
          }}
          onComplaintClick={handleComplaintClick}
          onMapInteraction={handleMapInteraction}
        />

        <View style={[styles.liveBadge, {
          backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(11,94,43,0.08)',
          borderColor: colors.primary,
          flexDirection: 'row',
          ...(language === 'ur' ? { right: 12 } : { left: 12 })
        }]}>
          {!complaintsLoaded ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: (language === 'ur') ? 0 : 5, marginLeft: (language === 'ur') ? 5 : 0 }} />
          ) : (
            <View style={[styles.liveDot, {
              backgroundColor: colors.primary,
              marginRight: (language === 'ur') ? 0 : 5,
              marginLeft: (language === 'ur') ? 5 : 0
            }]} />
          )}
          <Text style={[styles.liveText, { color: colors.primary }]}>
            {complaintsLoaded ? t('live') : t('syncing', { defaultValue: 'Syncing' })} · {toUrduNumerals(mapComplaints.length > 0 ? mapComplaints.length : complaints.length)}
          </Text>
        </View>

        {isPinReportMode && (
          <View style={[styles.togglePinContainer, {
            ...(language === 'ur' ? { left: 12 } : { right: 12 })
          }]}>
            <TouchableOpacity
              style={[styles.togglePinBtn, {
                backgroundColor: isReportingPinVisible ? colors.primary : CARD_BG,
                borderColor: isReportingPinVisible ? colors.primary : CARD_BORDER,
                flexDirection: 'row'
              }]}
              onPress={() => requireInternet(() => {
                const nextState = !isReportingPinVisible;
                setIsReportingPinVisible(nextState);
                if (nextState) {
                  if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
                  if (pinAutoResetTimerRef.current) clearTimeout(pinAutoResetTimerRef.current);
                } else {
                  setHasDroppedPin(false);
                  droppedPinLocationRef.current = null;
                  if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
                  pinTutorialTimerRef.current = setTimeout(triggerHowToDropHelp, 10000);
                }

                // Dismiss complaint popup when toggling pin
                if (selectedComplaint) clearComplaintPopup();
              })}
              activeOpacity={0.8}
            >
              <MapPin size={18} color={isReportingPinVisible ? '#fff' : colors.primary} />
              <Text style={[styles.togglePinText, { color: isReportingPinVisible ? '#fff' : colors.text }]}>
                {isReportingPinVisible ? t('removePin', { defaultValue: 'Remove Pin' }) : t('dropPin', { defaultValue: 'Drop Pin' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Right-side (or Left-side for Urdu) control panel — tightly grouped, zIndex keeps it above WebView */}
        <View style={[styles.controlPanel, {
          backgroundColor: isDark ? '#1a2e1c' : '#fff',
          borderColor: isDark ? colors.glassBorder : colors.border,
          borderWidth: 1,
          ...(language === 'ur' ? { left: 12 } : { right: 12 })
        }]}>
          <TouchableOpacity
            style={[styles.controlBtn]}
            onPress={handleLocateMe}
            disabled={isLocating}
            activeOpacity={0.7}
          >
            {isLocating
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <LocateFixed size={18} color={colors.primary} />}
          </TouchableOpacity>

          <View style={[styles.dividerLine, { backgroundColor: isDark ? colors.glassBorder : '#e0e0e0' }]} />

          <TouchableOpacity
            style={[styles.controlBtn]}
            onPress={() => mapRef.current?.zoomIn()}
            activeOpacity={0.7}
          >
            <ZoomIn size={18} color={colors.primary} />
          </TouchableOpacity>

          <View style={[styles.dividerLine, { backgroundColor: isDark ? colors.glassBorder : '#e0e0e0' }]} />

          <TouchableOpacity
            style={[styles.controlBtn]}
            onPress={() => mapRef.current?.zoomOut()}
            activeOpacity={0.7}
          >
            <ZoomOut size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Selection info overlay inside mapShell */}
        {isReportingPinVisible && hasDroppedPin && (
          <View style={[styles.addressOverlay, {
            backgroundColor: CARD_BG,
            borderColor: CARD_BORDER,
            // Adjust margins based on where the control panel is
            ...(language === 'ur' ? { left: 72, right: 12 } : { left: 12, right: 72 })
          }]}>
            <View style={styles.addressIcon}>
              <MapPin size={18} color={colors.primary} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={[styles.addressLabel, { color: MUTED }]}>{t('droppedPin')}</Text>
              <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={3}>
                {toUrduNumerals(language === 'ur' ? selectedAddressUr : selectedAddress)}
              </Text>
            </View>
          </View>
        )}

        {/* Complaint Detail Popup — sleek minimal card shown when tapping a complaint dot */}
        {selectedComplaint && (
          <Animated.View style={[
            styles.complaintPopup,
            {
              backgroundColor: isDark ? '#0F1912' : '#FFFFFF',
              borderColor: isDark ? 'rgba(74,222,128,0.12)' : 'rgba(22,163,74,0.1)',
              transform: [{
                translateY: complaintPopupAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] })
              }],
              opacity: complaintPopupAnim,
            }
          ]}>

            {/* Top row: colour dot + category + reporter + location + close */}
            <View style={styles.cpRow}>
              <View style={[styles.cpCatDot, { backgroundColor: CAT_COLORS[selectedComplaint.category] || '#EF4444' }]} />
              <View style={{ flex: 1, marginRight: 4 }}>
                <Text style={[styles.cpCatLabel, { color: colors.text }]} numberOfLines={1}>
                  {selectedComplaint.category === 'Sewerage' ? t('CatSewerage') :
                    selectedComplaint.category === 'Broken Roads' ? t('CatBrokenRoads') :
                      selectedComplaint.category === 'Waste' ? t('CatWaste') :
                        selectedComplaint.category === 'Kunda' ? t('CatKunda') :
                          selectedComplaint.category === 'Encroachment' ? t('CatEncroachment') :
                            selectedComplaint.category}
                </Text>
                {/* Reporter name */}
                {selectedComplaint.reporter && (
                  <View style={styles.cpReporterRow}>
                    <User size={9} color={MUTED} />
                    <Text style={[styles.cpReporterText, { color: MUTED }]} numberOfLines={1}>
                      {translateName(selectedComplaint.reporter) ?? selectedComplaint.reporter}
                    </Text>
                  </View>
                )}
                <View style={styles.cpLocRow}>
                  <MapPin size={10} color={colors.primary} />
                  <Text style={[styles.cpLocText, { color: MUTED }]} numberOfLines={1}>
                    {language === 'ur' ? (selectedComplaint.location_ur || translateLocation(selectedComplaint.location)) : (selectedComplaint.location_en || translateLocation(selectedComplaint.location))}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.cpCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]} onPress={hideComplaintPopup} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={MUTED} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={[styles.cpDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />

            {/* Meta row: verifications + status badge */}
            <View style={styles.cpMetaRow}>
              <View style={styles.cpMetaItem}>
                <Shield size={11} color={selectedComplaint.verifiedCount >= 10 ? colors.primary : MUTED} />
                <Text style={[styles.cpMetaText, { color: selectedComplaint.verifiedCount >= 10 ? colors.primary : MUTED }]}>
                  {toUrduNumerals(String(selectedComplaint.verifiedCount))} {t('verifications')}
                </Text>
              </View>
              <View style={[styles.cpStatusBadge, {
                backgroundColor: selectedComplaint.status === 'Verified'
                  ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)'
              }]}>
                <View style={[styles.cpStatusDot, {
                  backgroundColor: selectedComplaint.status === 'Verified' ? '#22C55E' : '#F59E0B'
                }]} />
                <Text style={[styles.cpStatusText, {
                  color: selectedComplaint.status === 'Verified' ? '#22C55E' : '#F59E0B'
                }]}>
                  {selectedComplaint.status === 'Verified' ? t('Verified') : t('open')}
                </Text>
              </View>
            </View>

            {/* Redirect button */}
            <TouchableOpacity
              style={[styles.cpViewBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                const id = selectedComplaint?.id;
                hideComplaintPopup();
                // Plain navigate — React Navigation v6 bubbles up to the tab navigator
                requestAnimationFrame(() => {
                  navigation.navigate('Shikayat', { highlightId: id, ts: Date.now() });
                });
              }}
              activeOpacity={0.85}
            >
              <Eye size={13} color="#fff" strokeWidth={2.5} />
              <Text style={styles.cpViewBtnText}>{t('viewDetails')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

      </View>

      {/* Report FAB */}
      <View style={styles.fabContainer}>
        {isPinReportMode && hasDroppedPin ? (
          <TouchableOpacity
            style={[styles.reportBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => requireInternet(handleStartReport)}
            activeOpacity={0.85}
          >
            <Check size={24} color="#fff" strokeWidth={3} />
            <Text style={styles.reportBtnText}>{t('ConfirmReport', { defaultValue: 'Confirm & Submit' })}</Text>
          </TouchableOpacity>
        ) : isPinReportMode && !hasDroppedPin ? (
          <TouchableOpacity
            style={[styles.reportBtn, { backgroundColor: isDark ? '#374151' : '#9CA3AF', elevation: 0, shadowOpacity: 0 }]}
            activeOpacity={0.85}
            onPress={() => triggerHowToDropHelp(true)}
          >
            <MapPin size={24} color="#fff" strokeWidth={3} />
            <Text style={styles.reportBtnText}>{t('ConfirmReport', { defaultValue: 'Confirm & Submit' })}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.reportBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={handleTapReportIssue}
            activeOpacity={0.85}
          >
            <Plus size={24} color="#fff" strokeWidth={3} />
            <Text style={styles.reportBtnText}>{t('ReportIssue')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  /* ── CATEGORY SELECTION ── */
  const renderCategorySelection = () => (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHeader, { paddingBottom: 8 }]}>
        <TouchableOpacity onPress={handleReset} style={[styles.backBtn, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
          {language === 'ur' ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
        </TouchableOpacity>
        <View style={styles.modalTitleBlock}>
          <Text style={[styles.modalStepLabel, { color: colors.primary }]}>{toUrduNumerals(t('step1of3'))}</Text>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t('SelectCategory')}</Text>
        </View>
      </View>

      {renderStepIndicator(0)}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.categoryGrid, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryCard, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}
            onPress={() => handleSelectCategory(cat)}
            activeOpacity={0.8}
          >
            <View style={[styles.categoryIcon, { backgroundColor: cat.color + '22' }]}>
              <cat.icon size={26} color={cat.color} />
            </View>
            <Text style={[styles.categoryLabel, { color: colors.text }]}>{cat.label}</Text>
            <View style={language === 'ur' ? { transform: [{ rotate: '180deg' }] } : {}}>
              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

    </View>
  );

  /* ── PHOTO CAPTURE ── */
  const renderPhotoCapture = () => (
    <View style={[styles.overlay, { backgroundColor: '#000' }]}>
      <View style={[styles.cameraHeaderWrap, { paddingTop: insets.top + 10 }]}>
        <View style={styles.cameraHeaderInner}>
          <TouchableOpacity onPress={() => {

            setStep(1);
          }} style={styles.backBtnDark}>
            {language === 'ur' ? <ArrowRight size={20} color="#fff" /> : <ArrowLeft size={20} color="#fff" />}
          </TouchableOpacity>
          <View>
            <Text style={styles.cameraStepLabel}>{toUrduNumerals(t('step2of3'))}</Text>
            <Text style={styles.cameraTitle}>{selectedCategory?.label}</Text>
          </View>
        </View>
        {renderStepIndicator(1, true)}
      </View>

      <View style={styles.cameraView}>
        <View style={styles.cameraFocusBox}>
          <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
        </View>
        <Text style={[styles.cameraHint, { marginTop: 40 }]}>{t('alignIssue')}</Text>
      </View>

      <View style={[styles.cameraFooter, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={[styles.shutterBtn, { borderColor: colors.primary }]} onPress={handleTakePhoto}>
          <View style={[styles.shutterInner, { backgroundColor: colors.primary }]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ── CONFIRMATION ── */
  const renderConfirmation = () => (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHeader, { paddingBottom: 8 }]}>
        <TouchableOpacity onPress={() => {

          setStep(2);
        }} style={[styles.backBtn, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
          {language === 'ur' ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
        </TouchableOpacity>
        <View style={styles.modalTitleBlock}>
          <Text style={[styles.modalStepLabel, { color: colors.primary }]}>{toUrduNumerals(t('step3of3'))}</Text>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t('ConfirmReport')}</Text>
        </View>
      </View>

      {renderStepIndicator(2)}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.confirmContent, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />

        <View style={[styles.infoCard, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
          {[
            { label: t('category'), value: selectedCategory?.label },
            { label: t('location'), value: language === 'ur' ? selectedAddressUr : selectedAddress },
            { label: t('coordinates'), value: toUrduNumerals(`${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`) },
            { label: t('severity'), value: t('verylow') },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.text, flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={3}>{row.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: CARD_BORDER }]} />}
            </View>
          ))}
        </View>

        <View style={[styles.xpNotice, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
          <Text style={[styles.xpNoticeText, { color: colors.primary }]}>{t('xpOnSubmit')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{t('ConfirmReport')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

    </View>
  );

  /* ── SUCCESS ── */
  const renderSuccess = () => (
    <View style={[styles.overlay, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
      <View style={[styles.successCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
        <CheckCircle2 size={64} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.successTitle, { color: colors.text }]}>{t('reported')}</Text>
      <Text style={[styles.successSubtitle, { color: MUTED }]}>
        {t('complaintSubmitted')}{'\n'}
        <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('xpAdded')}</Text> {t('addedToAccount')}
      </Text>

      <TouchableOpacity
        style={[styles.doneBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleReset}
        activeOpacity={0.85}
      >
        <Text style={styles.doneBtnText}>{t('backToMap')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: step === 2 ? '#000' : colors.background }]}>
      <StatusBar barStyle={(step === 2 || isDark) ? 'light-content' : 'dark-content'} />
      {step === 0 && <SafeAreaView style={styles.safeArea} edges={['top']}>{renderMap()}</SafeAreaView>}
      {step === 1 && <SafeAreaView style={styles.safeArea} edges={['top']}>{renderCategorySelection()}</SafeAreaView>}
      {step === 2 && renderPhotoCapture()}
      {step === 3 && <SafeAreaView style={styles.safeArea} edges={['top']}>{renderConfirmation()}</SafeAreaView>}
      {step === 4 && <SafeAreaView style={styles.safeArea} edges={['top']}>{renderSuccess()}</SafeAreaView>}

      {/* Photo Source Modal */}
      <Modal visible={showPhotoSourceModal} transparent animationType="slide" onRequestClose={() => setShowPhotoSourceModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0, paddingBottom: 0 }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowPhotoSourceModal(false)} activeOpacity={1} />
          <View style={[
            styles.modalCard,
            {
              width: '100%',
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
              borderWidth: 1,
              borderRadius: 0,
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              paddingTop: 32,
              paddingHorizontal: 24,
              paddingBottom: insets.bottom ? insets.bottom + 16 : 32,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 20,
              elevation: 24,
            }
          ]}>
            <View style={{ flexDirection: language === 'ur' ? 'row' : 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: colors.text,
                    flex: 1,
                    textAlign: language === 'ur' ? 'auto' : 'left',
                    paddingRight: language === 'ur' ? 16 : 0
                  }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {t('attachPhoto')}
              </Text>
              <TouchableOpacity
                style={{
                  zIndex: 99,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 20,
                  padding: 8,
                  [language === 'ur' ? 'marginRight' : 'marginLeft']: 16
                }}
                onPress={() => setShowPhotoSourceModal(false)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <X size={20} color={MUTED} />
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', gap: 12 }}>
              <TouchableOpacity style={[styles.sourceBtn, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]} onPress={handleCameraSource}>
                <View style={[styles.sourceIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                  <Camera size={24} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sourceBtnText, { color: colors.text }]}>{t('takePhoto')}</Text>
                  <Text style={{ fontSize: 13, color: MUTED }}>{t('useYourCamera')}</Text>
                </View>
                <View style={language === 'ur' ? { transform: [{ rotate: '180deg' }] } : {}}>
                  <ChevronRight size={18} color={MUTED} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sourceBtn, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]} onPress={handleGallerySource}>
                <View style={[styles.sourceIconBox, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                  <ImageIcon size={24} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sourceBtnText, { color: colors.text }]}>{t('chooseFromGallery')}</Text>
                  <Text style={{ fontSize: 13, color: MUTED }}>{t('pickExistingPhoto')}</Text>
                </View>
                <View style={language === 'ur' ? { transform: [{ rotate: '180deg' }] } : {}}>
                  <ChevronRight size={18} color={MUTED} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportOptionsModal} transparent animationType="slide" onRequestClose={() => setShowReportOptionsModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0, paddingBottom: 0 }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowReportOptionsModal(false)} activeOpacity={1} />

          <View
            style={{
              width: '100%',
              backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              paddingTop: 0,
              paddingBottom: insets.bottom ? insets.bottom + 12 : 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 20,
              elevation: 24,
            }}
          >
            {/* Title & Close Btn */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 }}>
              <Text
                style={{ color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'auto', letterSpacing: -0.5, flex: 1 }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {t('reportIssueTitle')}
              </Text>
              <TouchableOpacity onPress={() => setShowReportOptionsModal(false)} style={{ padding: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', borderRadius: 24, marginLeft: 16 }} activeOpacity={0.7}>
                <X size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Options Group Container */}
            <View style={{
              marginHorizontal: 20,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F4F4F5',
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
            }}>
              {/* Option 1: GPS */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  paddingVertical: 16, paddingHorizontal: 20,
                  alignItems: 'center',
                }}
                onPress={async () => {
                  setShowReportOptionsModal(false);
                  // Check internet first
                  if (!isConnected) {
                    setTimeout(() => setShowNoWifiGpsModal(true), 350);
                    return;
                  }
                  // Check location
                  if (isLocationOff.current) {
                    setTimeout(() => setShowLocOffGpsModal(true), 350);
                    return;
                  }
                  // Show GPS tutorial on first use, then auto-start report when dismissed
                  try {
                    const gpsTutorialSeen = await AsyncStorage.getItem(`@kcp_gps_tutorial_shown_${user?.id || 'guest'}`);
                    if (gpsTutorialSeen !== 'true') {
                      pendingGpsReport.current = true;
                      setTutorialType('gps');
                      setTimeout(() => setShowTutorialModal(true), 400);
                      return;
                    }
                  } catch { }
                  handleReportAtMyLocation();
                }}
                activeOpacity={0.6}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)',
                  justifyContent: 'center', alignItems: 'center',
                  marginEnd: 16,
                }}>
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color="#22C55E" />
                  ) : (
                    <LocateFixed size={24} color="#22C55E" />
                  )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
                  <Text
                    style={{ color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'left', letterSpacing: -0.3 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {t('reportHere')}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.85)' : '#374151', marginTop: 4, textAlign: 'left', lineHeight: (language === 'ur') ? 22 : 18 }}
                  >
                    {t('reportHereDesc')}
                  </Text>
                </View>
                <View style={(language === 'ur') ? { transform: [{ rotate: '180deg' }] } : {}}>
                  <ChevronRight size={20} color={MUTED} />
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={{
                height: 1,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                marginStart: 88,
                marginEnd: 24,
              }} />

              {/* Option 2: Pin */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  paddingVertical: 16, paddingHorizontal: 20,
                  alignItems: 'center',
                }}
                onPress={async () => {
                  setShowReportOptionsModal(false);
                  // Check internet first
                  if (!isConnected) {
                    setTimeout(() => setShowNoWifiPinModal(true), 350);
                    return;
                  }

                  // Activate pin mode but wait for user to toggle drop pin
                  setIsPinReportMode(true);
                  setIsReportingPinVisible(false);
                  setHasDroppedPin(false);
                  droppedPinLocationRef.current = null;
                  startReporting(); // Block tab navigation immediately

                  if (pinTutorialTimerRef.current) clearTimeout(pinTutorialTimerRef.current);
                  if (pinAutoResetTimerRef.current) clearTimeout(pinAutoResetTimerRef.current);

                  try {
                    const seen = await AsyncStorage.getItem(`@kcp_pin_tutorial_shown_${user?.id || 'guest'}`);
                    if (seen !== 'true') {
                      setTutorialType('pin');
                      setTimeout(() => setShowTutorialModal(true), 400);
                      return; // Timer starts on close
                    }
                  } catch { }

                  pinTutorialTimerRef.current = setTimeout(triggerHowToDropHelp, 10000);
                }}
                activeOpacity={0.6}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)',
                  justifyContent: 'center', alignItems: 'center',
                  marginEnd: 16,
                }}>
                  <MapPin size={24} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
                  <Text
                    style={{ color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'left', letterSpacing: -0.3 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {t('pinReport')}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.85)' : '#374151', marginTop: 4, textAlign: 'left', lineHeight: (language === 'ur') ? 22 : 18 }}
                  >
                    {t('pinReportDesc')}
                  </Text>
                </View>
                <View style={(language === 'ur') ? { transform: [{ rotate: '180deg' }] } : {}}>
                  <ChevronRight size={20} color={MUTED} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tutorial Modal — rich step-by-step, GPS or Pin mode */}
      <Modal visible={showTutorialModal} transparent animationType={tutorialType === 'how_to_drop' ? 'fade' : 'slide'} onRequestClose={handleCloseTutorial}>
        <View style={[styles.modalOverlay, tutorialType === 'how_to_drop' ? { justifyContent: 'center', padding: 24, alignItems: 'center' } : { justifyContent: 'flex-end', padding: 0, paddingBottom: 0 }]}>
          <View style={[styles.modalCard, tutorialType === 'how_to_drop' ? {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: isDark ? '#374151' : '#E5E7EB',
            paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24,
            borderRadius: 24,
            elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20,
            alignItems: 'center',
            width: '92%'
          } : {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderColor: isDark ? '#374151' : '#E5E7EB',
            paddingHorizontal: 24, paddingTop: 28, paddingBottom: insets.bottom ? insets.bottom + 20 : 32,
            borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
            borderTopLeftRadius: 32, borderTopRightRadius: 32,
            elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20,
          }]}>

            {tutorialType === 'how_to_drop' ? (
              <>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                  <MapPin size={30} color={colors.primary} />
                </View>

                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center', marginBottom: 16, paddingHorizontal: 12, width: '100%' }} numberOfLines={1} adjustsFontSizeToFit>
                  {t('howToDropPinTitle', { defaultValue: 'How to Drop a Pin' })}
                </Text>
                <Text style={{ color: isDark ? 'rgba(255,255,255,0.95)' : '#111827', fontSize: 17, lineHeight: 26, textAlign: 'center', fontWeight: '500', marginBottom: 28, paddingHorizontal: 8 }}>
                  {t('howToDropPinStep1_desc', { defaultValue: 'Tap the "Drop Pin" button on the map, then tap anywhere to select the exact location of the issue.' })}
                </Text>
              </>
            ) : (
              <>
                {/* Header icon + title */}
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: tutorialType === 'gps' ? (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)') : (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)'), justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    {tutorialType === 'gps'
                      ? <LocateFixed size={32} color="#22C55E" />
                      : <MapPin size={32} color="#3B82F6" />
                    }
                  </View>
                  <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' }}>
                    {tutorialType === 'gps' ? t('reportHere_tutorial_title', { defaultValue: 'Report at Your Location' }) : t('pinReport_tutorial_title', { defaultValue: 'Pin Report Guide' })}
                  </Text>
                </View>

                {/* Steps */}
                {[
                  {
                    step: tutorialType === 'gps' ? t('reportHere_tutorial_step1', { defaultValue: '📍 Step 1' }) : t('pinReport_tutorial_step1', { defaultValue: '📌 Step 1' }),
                    desc: tutorialType === 'gps' ? t('reportHere_tutorial_step1_desc', { defaultValue: 'Tap "Report Here" to instantly use your current GPS position.' }) : t('pinReport_tutorial_step1_desc', { defaultValue: 'Tap "Drop Pin", then tap the map to place your pin.' }),
                    accent: tutorialType === 'gps' ? '#22C55E' : '#3B82F6',
                  },
                  {
                    step: tutorialType === 'gps' ? t('reportHere_tutorial_step2', { defaultValue: '📷 Step 2' }) : t('pinReport_tutorial_step2', { defaultValue: '✅ Step 2' }),
                    desc: tutorialType === 'gps' ? t('reportHere_tutorial_step2_desc', { defaultValue: 'Choose a category for the issue you see.' }) : t('pinReport_tutorial_step2_desc', { defaultValue: 'Once pinned, tap "Confirm & Submit" to proceed.' }),
                    accent: tutorialType === 'gps' ? '#22C55E' : '#3B82F6',
                  },
                  {
                    step: tutorialType === 'gps' ? t('reportHere_tutorial_step3', { defaultValue: '✅ Step 3' }) : t('pinReport_tutorial_step3', { defaultValue: '📷 Step 3' }),
                    desc: tutorialType === 'gps' ? t('reportHere_tutorial_step3_desc', { defaultValue: 'Take a photo and confirm — it goes live instantly!' }) : t('pinReport_tutorial_step3_desc', { defaultValue: 'Select category, take a photo, and complete your report!' }),
                    accent: tutorialType === 'gps' ? '#22C55E' : '#3B82F6',
                  },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: item.accent + '22', justifyContent: 'center', alignItems: 'center', marginEnd: 14 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: item.accent }}>{toUrduNumerals(i + 1)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: item.accent, fontSize: 14, fontWeight: '800', textAlign: 'left', marginBottom: 4 }}>{item.step}</Text>
                      <Text style={{ color: isDark ? 'rgba(255,255,255,0.95)' : '#111827', fontSize: 14, lineHeight: 22, textAlign: 'left', fontWeight: '500' }}>{item.desc}</Text>
                    </View>
                  </View>
                ))}

                {/* Tip */}
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB', borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E5E7EB' }}>
                  <Text style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#1F2937', fontSize: 13, lineHeight: 18, textAlign: 'left', fontWeight: '500' }}>
                    {tutorialType === 'gps'
                      ? t('reportHere_tutorial_tip', { defaultValue: '💡 Best used when you are standing at or near the issue location.' })
                      : t('pinReport_tutorial_tip', { defaultValue: '💡 Tip: Useful for reporting issues you saw earlier or in a different area.' })}
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: tutorialType === 'gps' ? '#22C55E' : colors.primary, width: '100%', marginTop: 0, paddingVertical: 18, borderRadius: 20 }]}
              onPress={handleCloseTutorial}
            >
              <Text style={[styles.doneBtnText, { textAlign: 'center', fontSize: 17 }]}>
                {tutorialType === 'gps'
                  ? t('gpsStartReport', { defaultValue: 'Got It — Start Report' })
                  : t('gotIt')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Reporting Types Intro Modal ── */}
      <Modal visible={showReportingTypesIntro} transparent animationType="fade" onRequestClose={() => setShowReportingTypesIntro(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, width: '100%', borderRadius: 24, padding: 24, overflow: 'hidden' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 24, textAlign: 'center' }}>
              {t('reportingIntroTitle', { defaultValue: 'How to Report' })}
            </Text>
            
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center', marginEnd: 16 }}>
                  <MapPin color="#10B981" size={24} />
                </View>
                <View style={{ flex: 1, alignItems: language === 'ur' ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: language === 'ur' ? 'right' : 'left' }} numberOfLines={1}>{t('reportingIntroGPS', { defaultValue: '1. Report Here (GPS)' })}</Text>
                </View>
              </View>
              <View style={{ 
                paddingLeft: language === 'ur' ? 0 : 60, 
                paddingRight: language === 'ur' ? 60 : 0,
                alignItems: language === 'ur' ? 'flex-end' : 'flex-start',
                width: '100%'
              }}>
                <Text style={{ fontSize: 15, color: colors.text, opacity: 0.7, lineHeight: 22, textAlign: language === 'ur' ? 'right' : 'left' }}>
                  {t('reportingIntroGPSDesc', { defaultValue: 'Instantly report issues at your current location. Fast and accurate.' })}
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginEnd: 16 }}>
                  <LocateFixed color="#3B82F6" size={24} />
                </View>
                <View style={{ flex: 1, alignItems: language === 'ur' ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: language === 'ur' ? 'right' : 'left' }} numberOfLines={1}>{t('reportingIntroPin', { defaultValue: '2. Pin Report' })}</Text>
                </View>
              </View>
              <View style={{ 
                paddingLeft: language === 'ur' ? 0 : 60, 
                paddingRight: language === 'ur' ? 60 : 0,
                alignItems: language === 'ur' ? 'flex-end' : 'flex-start',
                width: '100%'
              }}>
                <Text style={{ fontSize: 15, color: colors.text, opacity: 0.7, lineHeight: 22, textAlign: language === 'ur' ? 'right' : 'left' }}>
                  {t('reportingIntroPinDesc', { defaultValue: 'Drop a pin anywhere on the map. Useful for reporting issues you saw earlier or at a different location.' })}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
              onPress={handleCloseReportingIntro}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('reportingIntroGotIt', { defaultValue: 'Got it!' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Constraints Modals */}
      
      {/* 1. Rate Limit Modal */}
      <Modal visible={showRateLimitModal} transparent animationType="fade" onRequestClose={() => setShowRateLimitModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, width: '100%', borderRadius: 24, padding: 24, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(245, 158, 11, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Clock color="#F59E0B" size={32} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: language === 'ur' ? 'left' : 'center', width: '100%' }}>
              {t('rateLimitTitle', { defaultValue: 'Daily Limit Reached' })}
            </Text>
            <Text style={{ fontSize: 15, color: colors.text, opacity: 0.7, textAlign: language === 'ur' ? 'left' : 'center', marginBottom: 24, lineHeight: 22, width: '100%' }}>
              {t('rateLimitDesc', { defaultValue: 'You can only submit 10 reports per day. Please try again tomorrow.' })}
            </Text>
            <TouchableOpacity 
              style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
              onPress={() => {
                setShowRateLimitModal(false);
                handleReset();
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{t('closeBtn', { defaultValue: 'Close' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Distance Error Modal */}
      <Modal visible={showDistanceErrorModal} transparent animationType="fade" onRequestClose={() => setShowDistanceErrorModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, width: '100%', borderRadius: 24, padding: 24, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <MapPinOff color="#EF4444" size={32} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: language === 'ur' ? 'left' : 'center', width: '100%' }}>
              {t('distanceErrorTitle', { defaultValue: 'Too Far' })}
            </Text>
            <Text style={{ fontSize: 15, color: colors.text, opacity: 0.7, textAlign: language === 'ur' ? 'left' : 'center', marginBottom: 24, lineHeight: 22, width: '100%' }}>
              {t('distanceErrorDesc', { defaultValue: 'You can only report issues within 150 meters of your current location.' })}
            </Text>
            <TouchableOpacity 
              style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
              onPress={() => {
                setShowDistanceErrorModal(false);
                handleReset();
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{t('closeBtn', { defaultValue: 'Close' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. Duplicate Prevention Modal */}
      <Modal visible={!!duplicateComplaintId} transparent animationType="fade" onRequestClose={() => setDuplicateComplaintId(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, width: '100%', borderRadius: 24, padding: 24, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Eye color="#3B82F6" size={32} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: language === 'ur' ? 'left' : 'center', width: '100%' }}>
              {t('duplicateErrorTitle', { defaultValue: 'Issue Already Reported' })}
            </Text>
            <Text style={{ fontSize: 15, color: colors.text, opacity: 0.7, textAlign: language === 'ur' ? 'left' : 'center', marginBottom: 24, lineHeight: 22, width: '100%' }}>
              {t('duplicateErrorDesc', { defaultValue: 'Someone already reported an issue near here! Would you like to verify it instead?' })}
            </Text>
            <View style={{ width: '100%', flexDirection: 'column', gap: 12 }}>
              <TouchableOpacity 
                style={{ width: '100%', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
                onPress={() => {
                  const id = duplicateComplaintId;
                  setDuplicateComplaintId(null);
                  handleReset();
                  navigation.navigate('Shikayat', { complaintId: id });
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('verifyInsteadBtn', { defaultValue: 'Verify Instead' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
                onPress={() => {
                  setDuplicateComplaintId(null);
                  handleReset();
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{t('closeBtn', { defaultValue: 'Close' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Self Duplicate Prevention Modal */}
      <Modal visible={showSelfDuplicateModal} transparent animationType="fade" onRequestClose={() => setShowSelfDuplicateModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, width: '100%', borderRadius: 24, padding: 24, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <AlertTriangle color="#EF4444" size={32} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: language === 'ur' ? 'left' : 'center', width: '100%' }}>
              {t('selfDuplicateErrorTitle', { defaultValue: 'Already Reported' })}
            </Text>
            <Text style={{ fontSize: 15, color: colors.text, opacity: 0.7, textAlign: language === 'ur' ? 'left' : 'center', marginBottom: 24, lineHeight: 22, width: '100%' }}>
              {t('selfDuplicateErrorDesc', { defaultValue: 'You have already reported this exact issue at this location. Please wait for the authorities to resolve it.' })}
            </Text>
            <TouchableOpacity 
              style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
              onPress={() => {
                setShowSelfDuplicateModal(false);
                handleReset();
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{t('closeBtn', { defaultValue: 'Close' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Location Off Modal ── App-themed, replaces native Alert */}
      <Modal visible={showLocationModal} transparent animationType="none" onRequestClose={hideLocationModal}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <Animated.View style={[
            styles.locationModalCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: CARD_BORDER,
              transform: [{ scale: locationModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
              opacity: locationModalAnim,
            }
          ]}>
            {/* Icon */}
            <View style={[styles.locationModalIcon, {
              backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
              borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
            }]}>
              <MapPinOff size={42} color="#EF4444" />
            </View>

            <Text style={[styles.locationModalTitle, { color: colors.text }]}>
              {t('locationOffTitle')}
            </Text>
            <Text style={[styles.locationModalDesc, { color: MUTED }]}>
              {t('locationOffDesc')}
            </Text>

            {/* Hint box */}
            <View style={[styles.locationModalHint, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}>
              <Navigation size={14} color={colors.primary} />
              <Text style={[styles.locationModalHintText, { color: colors.text }]}>
                {t('locationOffHint')}
              </Text>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              style={[styles.locationModalPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={openDeviceSettings}
              activeOpacity={0.85}
            >
              <Text style={styles.locationModalPrimaryBtnText}>{t('enableLocation')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationModalSecondaryBtn, { borderColor: CARD_BORDER }]}
              onPress={hideLocationModal}
              activeOpacity={0.7}
            >
              <Text style={[styles.locationModalSecondaryBtnText, { color: MUTED }]}>
                {t('continueWithout')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Search Error Modal ── Replaces native Alert for all search failures */}
      <Modal visible={showSearchErrorModal} transparent animationType="fade" onRequestClose={() => setShowSearchErrorModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
            {/* Icon */}
            <View style={[styles.locationModalIcon, {
              backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
              borderColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)',
              marginBottom: 16,
            }]}>
              <Search size={38} color="#F59E0B" />
            </View>
            <Text style={[styles.locationModalTitle, { color: colors.text }]}>
              {searchErrorInfo.title}
            </Text>
            <Text style={[styles.locationModalDesc, { color: MUTED }]}>
              {searchErrorInfo.message}
            </Text>
            <TouchableOpacity
              style={[styles.locationModalPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowSearchErrorModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.locationModalPrimaryBtnText}>{t('gotIt', { defaultValue: 'Got It' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── No WiFi – GPS Report ── */}
      <Modal visible={showNoWifiGpsModal} transparent animationType="fade" onRequestClose={() => setShowNoWifiGpsModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.locationModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
            <View style={[styles.locationModalIcon, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', borderColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)' }]}>
              <WifiOff size={40} color="#EF4444" />
            </View>
            <Text style={[styles.locationModalTitle, { color: colors.text }]}>{t('noWifi_reportHere_title', { defaultValue: 'Internet Required' })}</Text>
            <Text style={[styles.locationModalDesc, { color: MUTED }]}>{t('noWifi_reportHere_desc', { defaultValue: 'Connect to Wi-Fi or mobile data to report here.' })}</Text>
            <View style={[styles.locationModalHint, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Wifi size={14} color={colors.primary} />
              <Text style={[styles.locationModalHintText, { color: colors.text }]}>{language === 'ur' ? 'سیٹنگز ← وائی فائی / ڈیٹا' : language === 'ru' ? 'Settings → WiFi / Mobile Data' : 'Settings → Wi-Fi or Mobile Data'}</Text>
            </View>
            <TouchableOpacity style={[styles.locationModalPrimaryBtn, { backgroundColor: '#EF4444' }]} onPress={() => { setShowNoWifiGpsModal(false); if (Platform.OS === 'android') { Linking.sendIntent('android.settings.panel.action.INTERNET_CONNECTIVITY').catch(() => { Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(() => { Linking.sendIntent('android.settings.SETTINGS').catch(() => { Linking.openSettings().catch(() => { }); }); }); }); } else { Linking.openSettings().catch(() => { }); } }} activeOpacity={0.85}>
              <Text style={styles.locationModalPrimaryBtnText}>{t('openSettings', { defaultValue: 'Open Settings' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.locationModalSecondaryBtn, { borderColor: CARD_BORDER }]} onPress={() => setShowNoWifiGpsModal(false)} activeOpacity={0.7}>
              <Text style={[styles.locationModalSecondaryBtnText, { color: MUTED }]}>{t('dismiss', { defaultValue: 'Dismiss' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── No WiFi – Pin Report ── */}
      <Modal visible={showNoWifiPinModal} transparent animationType="fade" onRequestClose={() => setShowNoWifiPinModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.locationModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
            <View style={[styles.locationModalIcon, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', borderColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)' }]}>
              <WifiOff size={40} color="#EF4444" />
            </View>
            <Text style={[styles.locationModalTitle, { color: colors.text }]}>{t('noWifi_pinReport_title', { defaultValue: 'Internet Required' })}</Text>
            <Text style={[styles.locationModalDesc, { color: MUTED }]}>{t('noWifi_pinReport_desc', { defaultValue: 'Connect to Wi-Fi or mobile data to use Pin Report.' })}</Text>
            <View style={[styles.locationModalHint, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Wifi size={14} color={colors.primary} />
              <Text style={[styles.locationModalHintText, { color: colors.text }]}>{language === 'ur' ? 'سیٹنگز ← وائی فائی / ڈیٹا' : language === 'ru' ? 'Settings → WiFi / Mobile Data' : 'Settings → Wi-Fi or Mobile Data'}</Text>
            </View>
            <TouchableOpacity style={[styles.locationModalPrimaryBtn, { backgroundColor: '#EF4444' }]} onPress={() => { setShowNoWifiPinModal(false); if (Platform.OS === 'android') { Linking.sendIntent('android.settings.panel.action.INTERNET_CONNECTIVITY').catch(() => { Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(() => { Linking.sendIntent('android.settings.SETTINGS').catch(() => { Linking.openSettings().catch(() => { }); }); }); }); } else { Linking.openSettings().catch(() => { }); } }} activeOpacity={0.85}>
              <Text style={styles.locationModalPrimaryBtnText}>{t('openSettings', { defaultValue: 'Open Settings' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.locationModalSecondaryBtn, { borderColor: CARD_BORDER }]} onPress={() => setShowNoWifiPinModal(false)} activeOpacity={0.7}>
              <Text style={[styles.locationModalSecondaryBtnText, { color: MUTED }]}>{t('dismiss', { defaultValue: 'Dismiss' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Location Off – GPS Report (BLOCKING) ── */}
      <Modal visible={showLocOffGpsModal} transparent animationType="fade" onRequestClose={() => setShowLocOffGpsModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.locationModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
            <View style={[styles.locationModalIcon, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', borderColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)' }]}>
              <MapPinOff size={40} color="#EF4444" />
            </View>
            <Text style={[styles.locationModalTitle, { color: colors.text }]}>{t('locOff_reportHere_title', { defaultValue: 'Location is Off' })}</Text>
            <Text style={[styles.locationModalDesc, { color: MUTED }]}>{t('locOff_reportHere_desc', { defaultValue: '"Report Here" uses your live GPS. Please enable location to continue.' })}</Text>
            <View style={[styles.locationModalHint, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Navigation size={14} color={colors.primary} />
              <Text style={[styles.locationModalHintText, { color: colors.text }]}>{t('locOff_reportHere_hint', { defaultValue: 'Settings → Location → Turn On' })}</Text>
            </View>
            <TouchableOpacity style={[styles.locationModalPrimaryBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowLocOffGpsModal(false); if (Platform.OS === 'android') { Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => { Linking.sendIntent('android.settings.SETTINGS').catch(() => { Linking.openSettings().catch(() => { }); }); }); } else { Linking.openSettings().catch(() => { }); } }} activeOpacity={0.85}>
              <Text style={styles.locationModalPrimaryBtnText}>{t('enableLocation', { defaultValue: 'Open Settings' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.locationModalSecondaryBtn, { borderColor: CARD_BORDER }]} onPress={() => setShowLocOffGpsModal(false)} activeOpacity={0.7}>
              <Text style={[styles.locationModalSecondaryBtnText, { color: MUTED }]}>{t('dismiss', { defaultValue: 'Dismiss' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Location Off – Pin Report (SOFT WARNING — can continue with pin) ── */}
      <Modal visible={showLocOffPinModal} transparent animationType="fade" onRequestClose={() => setShowLocOffPinModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.locationModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
            <View style={[styles.locationModalIcon, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)', borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)' }]}>
              <MapPin size={40} color="#F59E0B" />
            </View>
            <Text style={[styles.locationModalTitle, { color: colors.text }]}>{t('locOff_pinReport_title', { defaultValue: 'Location Recommended' })}</Text>
            <Text style={[styles.locationModalDesc, { color: MUTED }]}>{t('locOff_pinReport_desc', { defaultValue: 'Your location is off. You can still drop a pin manually — turning on location gives more accurate results.' })}</Text>
            <View style={[styles.locationModalHint, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <MapPin size={14} color="#F59E0B" />
              <Text style={[styles.locationModalHintText, { color: colors.text }]}>{t('locOff_pinReport_hint', { defaultValue: 'Tap anywhere on the map to set the issue location' })}</Text>
            </View>
            <TouchableOpacity style={[styles.locationModalPrimaryBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowLocOffPinModal(false); if (Platform.OS === 'android') { Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => { Linking.sendIntent('android.settings.SETTINGS').catch(() => { Linking.openSettings().catch(() => { }); }); }); } else { Linking.openSettings().catch(() => { }); } }} activeOpacity={0.85}>
              <Text style={styles.locationModalPrimaryBtnText}>{t('enableLocation', { defaultValue: 'Open Settings' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.locationModalSecondaryBtn, { borderColor: isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.35)', backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)' }]}
              onPress={async () => {
                setShowLocOffPinModal(false);
                if (!isReportingPinVisible) setIsReportingPinVisible(true);
                if (!hasDroppedPin) {
                  try {
                    const shown = await AsyncStorage.getItem(`@kcp_pin_tutorial_shown_${user?.id || 'guest'}`);
                    if (shown !== 'true') { setTutorialType('pin'); setTimeout(() => setShowTutorialModal(true), 400); }
                  } catch { setTutorialType('pin'); setTimeout(() => setShowTutorialModal(true), 400); }
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.locationModalSecondaryBtnText, { color: '#F59E0B', fontWeight: '700' }]}>{t('locOff_pinReport_continue', { defaultValue: 'Continue with Pin' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1,
    height: 52, paddingHorizontal: 12,
  },
  searchIcon: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  searchInputWrap: { flex: 1, marginStart: 8 },
  searchInput: { fontSize: 15, fontWeight: '600', height: '100%' },

  /* Map Filters */
  mapFilterScroll: { gap: 8, paddingVertical: 8, paddingRight: 16 },
  mapFilterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1,
  },
  mapFilterText: { fontSize: 11, fontWeight: '700' },

  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },

  /* Map shell — overlays (badge, controls) are positioned absolutely inside */
  mapShell: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
    position: 'relative',
  },
  /* Map overlay controls */
  controlPanel: {
    position: 'absolute',
    bottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 8,
    zIndex: 20,                        // must be above WebView
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  controlBtn: {
    width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  dividerLine: { height: StyleSheet.hairlineWidth, width: '100%' },
  liveBadge: {
    position: 'absolute', top: 12,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    elevation: 8, zIndex: 20,          // must be above WebView
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
  liveText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },

  /* Address overlay inside mapShell */
  addressOverlay: {
    position: 'absolute',
    bottom: 16, // Margins injected dynamically depending on language
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 16, borderWidth: 1,
    elevation: 10, zIndex: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10,
    gap: 12,
  },
  addressIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.12)', justifyContent: 'center', alignItems: 'center' },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  addressText: { fontSize: 13, fontWeight: '800', marginTop: 1 },

  /* FAB */
  fabContainer: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 20, gap: 10,
    elevation: 12, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12,
  },
  reportBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 16, borderRadius: 20, gap: 8,
    borderWidth: 1.5,
  },
  reportBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  /* Toggle Pin Button */
  togglePinContainer: {
    position: 'absolute', top: 12, zIndex: 20,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
  },
  togglePinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1,
  },
  togglePinText: { fontSize: 14, fontWeight: '700' },

  /* Overlays */
  overlay: { flex: 1, zIndex: 100 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  backBtnDark: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitleBlock: { flex: 1 },
  modalStepLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },

  /* Category grid */
  categoryGrid: { paddingHorizontal: 20, paddingVertical: 8, gap: 10 },
  categoryCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 18, borderWidth: 1, gap: 12,
  },
  categoryIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  categoryLabel: { flex: 1, fontSize: 16, fontWeight: '700' },

  /* Step pills */
  topStepContainer: {
    width: '100%',
  },
  topStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topStepPill: {
    height: 4,
    borderRadius: 2,
  },

  /* Camera */
  cameraHeaderWrap: {
    width: '100%', zIndex: 10,
  },
  cameraHeaderInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 14,
  },
  cameraStepLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  cameraTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  cameraView: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraFocusBox: { width: width * 0.8, height: width * 0.8, position: 'relative', direction: 'ltr' },
  corner: { position: 'absolute', width: 28, height: 28, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  cameraHint: { color: 'rgba(255,255,255,0.7)', marginTop: 32, fontSize: 14, fontWeight: '600' },
  cameraFooter: { paddingTop: 16, alignItems: 'center' },
  shutterBtn: {
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 4, justifyContent: 'center', alignItems: 'center',
  },
  shutterInner: { width: 68, height: 68, borderRadius: 34 },

  /* Confirmation */
  confirmContent: { padding: 20, paddingBottom: 40 },
  previewImage: { width: '100%', height: 280, borderRadius: 20, marginBottom: 16 },
  infoCard: { borderRadius: 20, padding: 4, borderWidth: 1, marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  infoValue: { fontSize: 14, fontWeight: '800', lineHeight: 22 },
  divider: { height: 1, marginHorizontal: 14 },
  xpNotice: {
    flexDirection: 'row', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  xpNoticeText: { fontSize: 13, fontWeight: '700' },
  submitBtn: {
    paddingVertical: 18, borderRadius: 18, alignItems: 'center',
    elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  /* Success */
  successCircle: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 24,
  },
  successTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  successSubtitle: { fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 24 },
  doneBtn: {
    marginTop: 36, paddingHorizontal: 40, paddingVertical: 16,
    borderRadius: 18, elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  /* Modal Base */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 16, paddingBottom: 32 },
  modalCard: { width: '100%', padding: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },

  /* Photo Source Modal */
  sourceBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, borderWidth: 1, gap: 16
  },
  sourceIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  sourceBtnText: { fontSize: 16, fontWeight: '700', marginBottom: 2 },

  /* Complaint Popup — minimal sleek redesign */
  complaintPopup: {
    position: 'absolute',
    bottom: 16, left: 12, right: 12,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
    borderRadius: 18, borderWidth: 1,
    elevation: 16, zIndex: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22, shadowRadius: 16,
  },
  /* Top row */
  cpRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cpCatDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  cpCatLabel: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  cpReporterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cpReporterText: { fontSize: 11, fontWeight: '600', flex: 1 },
  cpLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cpLocText: { fontSize: 11, fontWeight: '600', flex: 1 },
  cpCloseBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  /* Divider */
  cpDivider: { height: 1, marginVertical: 9 },
  /* Meta */
  cpMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cpMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cpMetaText: { fontSize: 11, fontWeight: '700' },
  cpStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cpStatusDot: { width: 5, height: 5, borderRadius: 3 },
  cpStatusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  /* Redirect button */
  cpViewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 9, borderRadius: 12,
    elevation: 4, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  cpViewBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },

  /* Location Off Modal */
  locationModalCard: {
    width: '100%', padding: 28, borderRadius: 28, borderWidth: 1.5,
    alignItems: 'center',
    elevation: 20, shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  locationModalIcon: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 20,
  },
  locationModalTitle: {
    fontSize: 22, fontWeight: '900', letterSpacing: -0.3,
    textAlign: 'center', marginBottom: 10,
  },
  locationModalDesc: {
    fontSize: 14, fontWeight: '500', lineHeight: 21,
    textAlign: 'center', marginBottom: 16, paddingHorizontal: 4,
  },
  locationModalHint: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, width: '100%',
    marginBottom: 20,
  },
  locationModalHintText: {
    fontSize: 13, fontWeight: '700',
  },
  locationModalPrimaryBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10,
    marginBottom: 10,
  },
  locationModalPrimaryBtnText: {
    color: '#fff', fontSize: 16, fontWeight: '800',
  },
  locationModalSecondaryBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  locationModalSecondaryBtnText: {
    fontSize: 14, fontWeight: '700',
  },

});

export default NakshaScreen;
