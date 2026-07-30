import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ScrollView, StatusBar, TextInput, RefreshControl, Modal,
  InteractionManager, Alert, Platform, ToastAndroid, ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import {
  ShieldCheck, MapPin, Clock, CheckCircle2, X,
  Flame, AlertTriangle, Search, Trash2, User, AlertOctagon,
  ArrowUp, ArrowDown, Crosshair, Info
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAppContext } from '../../context/AppContext';
import { useNetwork } from '../../context/NetworkContext';
import { useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';

// ── Local category images (4 per category, rotate so same-category cards never repeat) ──
const CATEGORY_IMAGES = {
  'Waste': [
    require('../../assets/images/waste_1.jpg'),
    require('../../assets/images/waste_2.jpg'),
    require('../../assets/images/waste_3.jpeg'),
    require('../../assets/images/waste_4.jpg'),
    require('../../assets/images/waste_new_1.jpg'),
    require('../../assets/images/waste_new_2.jpg'),
    require('../../assets/images/waste_new_3.jpg'),
    require('../../assets/images/waste_new_4.jpg'),
  ],
  'Broken Roads': [
    require('../../assets/images/road_1.jpeg'),
    require('../../assets/images/road_2.jpg'),
    require('../../assets/images/road_3.webp'),
    require('../../assets/images/road_4.jpeg'),
    require('../../assets/images/road_new_1.jpg'),
    require('../../assets/images/road_new_2.jpg'),
    require('../../assets/images/road_new_3.jpg'),
    require('../../assets/images/road_new_4.jpg'),
  ],
  'Sewerage': [
    require('../../assets/images/sewage_1.jpeg'),
    require('../../assets/images/sewage_2.jpeg'),
    require('../../assets/images/sewage_3.jpeg'),
    require('../../assets/images/sewage_4.jpeg'),
    require('../../assets/images/sewage_new_1.jpg'),
    require('../../assets/images/sewage_new_2.jpg'),
    require('../../assets/images/sewage_new_3.jpg'),
    require('../../assets/images/sewage_new_4.jpg'),
  ],
  'Kunda': [
    require('../../assets/images/kunda_1.jpg'),
    require('../../assets/images/kunda_2.jpg'),
    require('../../assets/images/kunda_3.jpg'),
    require('../../assets/images/kunda_4.jpg'),
    require('../../assets/images/kunda_new_1.jpg'),
    require('../../assets/images/kunda_new_2.jpg'),
    require('../../assets/images/kunda_new_3.jpg'),
    require('../../assets/images/kunda_new_4.jpg'),
  ],
  'Encroachment': [
    require('../../assets/images/encroachment_1.jpg'),
    require('../../assets/images/encroachment_2.jpg'),
    require('../../assets/images/encroachment_3.jpg'),
    require('../../assets/images/encroachment_4.jpg'),
    require('../../assets/images/encroachment_new_1.jpg'),
    require('../../assets/images/encroachment_new_2.jpg'),
    require('../../assets/images/encroachment_new_3.jpg'),
    require('../../assets/images/encraochment_new_4.jpg'),
  ],
};

// Pre-flatten all images into a single resolved lookup map (keyed by category + index)
// so require() assets are already resolved before any card renders.
const RESOLVED_IMAGES = {};
for (const [cat, imgs] of Object.entries(CATEGORY_IMAGES)) {
  RESOLVED_IMAGES[cat] = imgs;
}

/**
 * Pick a local category image deterministically from the pre-resolved map.
 * Uses a fast hash on the complaint ID so the same complaint always gets the same image.
 */
const getCategoryImage = (complaint) => {
  const imgs = RESOLVED_IMAGES[complaint.category];
  if (!imgs || imgs.length === 0) return null;
  let hash = 0;
  const idStr = String(complaint.id || '');
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return imgs[Math.abs(hash) % imgs.length];
};

// Cache image sources per complaint ID so getCategoryImage is never called twice for same item
const IMAGE_SOURCE_CACHE = new Map();

const timeAgo = (iso, t, toUrduNumerals) => {
  if (!iso) return t('recently', { defaultValue: 'Recently' });
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${toUrduNumerals(diff)}${t('secAgo', { defaultValue: 's' })}`;
  if (diff < 3600) return `${toUrduNumerals(Math.floor(diff / 60))}${t('minAgo', { defaultValue: 'm' })}`;
  if (diff < 86400) return `${toUrduNumerals(Math.floor(diff / 3600))}${t('hourAgo', { defaultValue: 'h' })}`;
  return `${toUrduNumerals(Math.floor(diff / 86400))}${t('dayAgo', { defaultValue: 'd' })}`;
};

const FILTERS = ['All', 'Sewerage', 'Roads', 'Waste', 'Kunda', 'Encroachment'];

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

  return R * c; // in metres
};

const getSeverityByVerifications = (count) => {
  if (!count) return 'Very Low';
  if (count <= 5) return 'Very Low';
  if (count <= 15) return 'Low';
  if (count <= 24) return 'Medium';
  if (count <= 30) return 'High';
  return 'Very High';
};

const SEVERITY_CONFIG = {
  'Very High': { border: '#991B1B', bg: 'rgba(153,27,27,0.13)', text: '#EF4444', Icon: AlertOctagon },
  'High':      { border: '#EF4444', bg: 'rgba(239,68,68,0.13)', text: '#EF4444', Icon: Flame },
  'Medium':    { border: '#F59E0B', bg: 'rgba(245,158,11,0.13)', text: '#F59E0B', Icon: AlertTriangle },
  'Low':       { border: '#10B981', bg: 'rgba(16,185,129,0.13)', text: '#10B981', Icon: CheckCircle2 },
  'Very Low':  { border: '#3B82F6', bg: 'rgba(59,130,246,0.13)', text: '#3B82F6', Icon: ShieldCheck },
};

const CAT_COLORS = {
  'Sewerage': '#3B82F6',
  'Broken Roads': '#F59E0B',
  'Waste': '#22C55E',
  'Kunda': '#EF4444',
  'Encroachment': '#8B5CF6',
};

const ComplaintCard = React.memo((
  { item, isHighlighted, onPress, onVerify, onRemove, onResolve,
    isDark, primaryColor, primaryGlow, textColor, surfaceColor,
    glassBorder, borderColor, t, FILTER_LABELS, toUrduNumerals, translateLocation, translateName, requireInternet, language, now, currentLocation, isVerifiedByMe }
) => {
  const MUTED    = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,59,36,0.55)';
  const CARD_BG   = isDark ? 'rgba(255,255,255,0.04)' : surfaceColor;
  const CARD_BORDER = isDark ? glassBorder : borderColor;

  const calculatedSeverity = getSeverityByVerifications(item.verifiedCount);
  const sev = SEVERITY_CONFIG[calculatedSeverity] ?? SEVERITY_CONFIG.Medium;
  const SevIcon = sev.Icon;
  const isMyComplaint = item.isOwnReport === true;
  // Use module-level cache to avoid re-computing image source on every render
  let imageSource;
  if (item.image) {
    imageSource = { uri: item.image };
  } else {
    if (!IMAGE_SOURCE_CACHE.has(item.id)) {
      IMAGE_SOURCE_CACHE.set(item.id, getCategoryImage(item));
    }
    imageSource = IMAGE_SOURCE_CACHE.get(item.id);
  }
  const isFullyVerified = (item.verifiedCount ?? 0) >= 31;
  const verifyDisabled = isVerifiedByMe || isFullyVerified;

  const distance = currentLocation && item.coords ? getDistance(currentLocation.latitude, currentLocation.longitude, item.coords.lat, item.coords.lng) : 0;
  const isOutOfRange = currentLocation && item.coords && distance > 3000;

  const hasCat = !!CAT_COLORS[item.category];
  const headerBg = hasCat ? CAT_COLORS[item.category] : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
  const headerTextColor = hasCat ? '#FFFFFF' : textColor;
  const headerMetaColor = hasCat ? 'rgba(255,255,255,0.8)' : MUTED;
  const severityBgColor = isDark ? 'rgba(0,0,0,0.5)' : '#FFFFFF';
  const severityTextColor = isDark ? 'rgba(255,255,255,0.85)' : '#1F2937';
  const severityIconColor = sev.text;
  const avatarBg = hasCat ? 'rgba(0,0,0,0.2)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)');
  const primaryGlowColor = primaryGlow;

  const cardBorderWidth = isHighlighted ? 2 : 1;
  const outerBorderColor = isHighlighted ? primaryColor : CARD_BORDER;
  const outerShadow = isHighlighted 
    ? { shadowColor: primaryColor, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 };

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={() => onPress(item)}
      style={[
        {
          marginBottom: 10,
          borderRadius: 16,
          borderWidth: cardBorderWidth,
          borderColor: outerBorderColor,
          backgroundColor: outerBorderColor, // Magic fix: Fills any Android sub-pixel gaps with the border color!
        },
        outerShadow
      ]}
    >
      <View style={{ borderRadius: 16 - cardBorderWidth, overflow: 'hidden', backgroundColor: CARD_BG, width: '100%', flexDirection: 'column' }}>
        {/* Header */}
        <View style={[styles.cardHeader, { backgroundColor: headerBg }]}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            {item.reporter ? (
              <Text style={[styles.avatarText, { color: headerTextColor }]}>
                {(translateName(item.reporter) ?? item.reporter)[0]}
              </Text>
            ) : (
              <User size={16} color={headerTextColor} />
            )}
          </View>
          <View style={[styles.reporterBlock, { alignItems: 'flex-start' }]}>
            <Text style={[styles.reporterName, { color: headerTextColor, textAlign: 'left', writingDirection: 'ltr' }]} numberOfLines={1}>
              {translateName(item.reporter) ?? item.reporter}
            </Text>
            <View style={[styles.metaRow, { flexDirection: 'row' }]}>
              <Clock size={11} color={headerMetaColor} />
              <Text style={[styles.metaText, { color: headerMetaColor, textAlign: 'left', writingDirection: 'ltr' }]}>{timeAgo(item.timestamp, t, toUrduNumerals)}</Text>
              {item.category && (
                <>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: headerMetaColor, marginHorizontal: 4 }} />
                  <Text style={{ color: headerTextColor, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', textAlign: 'left', writingDirection: 'ltr' }}>
                    {item.category === 'Broken Roads' ? t('filterRoads') : FILTER_LABELS[item.category] || t(item.category, { defaultValue: item.category })}
                  </Text>
                </>
              )}
            </View>
          </View>
          <View style={[styles.severityChip, { backgroundColor: severityBgColor, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: isDark ? 0 : 0.1, shadowRadius: 2, elevation: isDark ? 0 : 1 }]}>
            <SevIcon size={12} color={severityIconColor} strokeWidth={2.5} />
            <Text style={[styles.severityText, { color: severityTextColor }]}>{t(calculatedSeverity.replace(' ', '').toLowerCase(), { defaultValue: calculatedSeverity })}</Text>
          </View>
        </View>

        {/* Media */}
        {imageSource && (
          <View style={[styles.cardImageContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <Image 
              source={imageSource} 
              style={[styles.cardImage, { transform: [{ scale: 1.12 }] }]} 
              resizeMode="cover" 
              resizeMethod="resize"
              fadeDuration={0}
            />
          </View>
        )}

        <View style={[styles.locationRow, { flexDirection: 'row' }]}>
          <MapPin size={13} color={primaryColor} />
          <Text style={[styles.locationText, { color: MUTED, textAlign: 'left', writingDirection: 'ltr' }]} numberOfLines={1}>
            {toUrduNumerals(language === 'ur' ? (item.location_ur || translateLocation(item.location)) : (item.location_en || translateLocation(item.location)))}
          </Text>
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: CARD_BORDER }]}>
          <View style={styles.verifyCount}>
            <ShieldCheck size={15} color={item.verifiedCount > 0 ? primaryColor : MUTED} />
            <Text style={[styles.verifyCountText, { color: textColor }]}>
              {toUrduNumerals(item.verifiedCount ?? 0)} {t('Verified').toLowerCase()}
            </Text>
          </View>
          {isMyComplaint ? (
            <View style={{ flexDirection: 'row', gap: 6, flexShrink: 1 }}>
              {(item.verifiedCount >= 20 && item.status !== 'Resolved') && (
                <TouchableOpacity
                  style={[styles.verifyBtn, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 8 }]}
                  onPress={() => requireInternet(() => onResolve(item.id))}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={14} color="#22C55E" strokeWidth={2.5} />
                  <Text style={[styles.verifyBtnText, { color: '#22C55E' }]} numberOfLines={1}>{t('markResolved', { defaultValue: 'Resolve' })}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.verifyBtn, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', paddingHorizontal: 8 }]}
                onPress={() => requireInternet(() => onRemove(item.id))}
                activeOpacity={0.8}
              >
                <Trash2 size={14} color="#EF4444" strokeWidth={2.5} />
                <Text style={[styles.verifyBtnText, { color: '#EF4444' }]} numberOfLines={1}>{t('Remove', { defaultValue: 'Remove' })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.verifyBtn, { 
                backgroundColor: verifyDisabled ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(11,59,36,0.05)') : (isOutOfRange ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : primaryGlowColor), 
                borderColor: verifyDisabled || isOutOfRange ? CARD_BORDER : primaryColor 
              }]}
              onPress={() => requireInternet(() => onVerify(item.id))}
              disabled={verifyDisabled}
              activeOpacity={0.8}
            >
              <CheckCircle2 size={14} color={verifyDisabled || isOutOfRange ? MUTED : primaryColor} strokeWidth={2.5} />
              <Text style={[styles.verifyBtnText, { color: verifyDisabled || isOutOfRange ? MUTED : primaryColor }]}>
                {isFullyVerified ? t('fullyVerified', { defaultValue: 'Fully Verified' }) : isVerifiedByMe ? t('Verified') : t('Verify')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => {
  // Only re-render when data that visually affects this specific card changes.
  // `now` is a minute-resolution tick so timestamp labels refresh every 60s.
  return prev.item.id === next.item.id &&
         prev.isHighlighted === next.isHighlighted &&
         prev.item.verifiedCount === next.item.verifiedCount &&
         prev.item.verifiedBy === next.item.verifiedBy &&
         prev.isDark === next.isDark &&
         prev.primaryColor === next.primaryColor &&
         prev.language === next.language &&
         prev.currentLocation === next.currentLocation &&
         prev.isVerifiedByMe === next.isVerifiedByMe &&
         prev.translateName === next.translateName &&
         prev.now === next.now;  // <-- re-render when the minute changes
});

const SkeletonCard = ({ isDark, surfaceColor, glassBorder }) => {
  const CARD_BG = isDark ? 'rgba(255,255,255,0.04)' : surfaceColor;
  const BORDER  = isDark ? glassBorder : 'rgba(0,0,0,0.05)';
  // Base and peak shimmer colours for the pulse animation
  const shimmerBase = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const shimmerPeak = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.13)';

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [anim]);

  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [shimmerBase, shimmerPeak] });

  const Box = ({ w, h, br = 4, mb = 0, style }) => (
    <Animated.View style={[{ width: w, height: h, borderRadius: br, backgroundColor: bg, marginBottom: mb }, style]} />
  );

  return (
    <View style={{ marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD_BG, overflow: 'hidden' }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}>
        <Box w={36} h={36} br={18} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Box w='60%' h={14} mb={6} />
          <Box w='40%' h={10} />
        </View>
        <Box w={60} h={20} br={10} />
      </View>
      {/* Image placeholder */}
      <Box w='100%' h={180} br={0} />
      {/* Body */}
      <View style={{ padding: 16 }}>
        <Box w='80%' h={14} mb={8} />
        <Box w='50%' h={14} mb={16} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Box w={100} h={36} br={8} />
          <Box w={100} h={36} br={8} />
        </View>
      </View>
    </View>
  );
};

// Compact skeleton used in the footer when fetching more
const MiniSkeletonCard = ({ isDark, surfaceColor, glassBorder }) => {
  const CARD_BG = isDark ? 'rgba(255,255,255,0.04)' : surfaceColor;
  const BORDER  = isDark ? glassBorder : 'rgba(0,0,0,0.05)';
  const shimmerBase = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const shimmerPeak = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.13)';
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [anim]);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [shimmerBase, shimmerPeak] });
  return (
    <View style={{ marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD_BG, overflow: 'hidden', padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: bg, marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Animated.View style={{ width: '55%', height: 12, borderRadius: 4, backgroundColor: bg, marginBottom: 5 }} />
          <Animated.View style={{ width: '35%', height: 9, borderRadius: 4, backgroundColor: bg }} />
        </View>
        <Animated.View style={{ width: 50, height: 18, borderRadius: 9, backgroundColor: bg }} />
      </View>
    </View>
  );
};

const ShikayatScreen = () => {
  const { colors, isDark } = useTheme();
  const { t, toUrduNumerals, language, translateLocation, translateName } = useLanguage();
  const { complaints, verifyComplaint, removeComplaint, resolveComplaint, triggerHaptic, locationHistory, recordLocation, localArea, showFeedTutorial, closeFeedTutorial, isComplaintVerifiedByMe, complaintsLoaded, fetchMoreComplaints, isFetchingMore, hasMoreComplaints, feedError, retryFeedLoad, mapComplaints } = useAppContext();
  const { isConnected, requireInternet } = useNetwork();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyReports, setShowMyReports] = useState(false);
  const [proximityFilter, setProximityFilter] = useState('all'); // 'all' | 'onsite' | 'local' | 'history'
  const [verifiedSort, setVerifiedSort] = useState(null); // 'top' | 'bottom' | null
  const [highlightedId, setHighlightedId] = useState(null);
  const [injectedComplaints, setInjectedComplaints] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [verificationPopup, setVerificationPopup] = useState({ visible: false, type: '', title: '', message: '' });
  const [currentLocation, setCurrentLocation] = useState(null);
  const flatListRef = useRef(null);
  const route = useRoute();
  const filteredComplaintsRef = useRef([]);

  const handleVerifyPress = useCallback((complaintId) => {
    const complaint = complaints.find(c => c.id === complaintId);
    
    const attemptVerify = (weight, title, desc, type) => {
      const res = verifyComplaint(complaintId, weight);
      if (res?.success === false) {
        if (res.reason === 'same_device') {
          setVerificationPopup({ visible: true, type: 'error_far', title: t('verifyPopupCheatTitle', { defaultValue: 'Action Blocked' }), message: t('verifyPopupCheatDesc', { defaultValue: 'Suspicious activity detected. You cannot verify reports originating from the same physical device.' }) });
        } else if (res.reason === 'already_verified') {
          setVerificationPopup({ visible: true, type: 'error_far', title: t('verifyPopupAlreadyTitle', { defaultValue: 'Already Verified' }), message: t('verifyPopupAlreadyDesc', { defaultValue: 'You have already verified this report.' }) });
        } else if (res.reason === 'own_report') {
          setVerificationPopup({ visible: true, type: 'error_far', title: t('verifyPopupOwnTitle', { defaultValue: 'Own Report' }), message: t('verifyPopupOwnDesc', { defaultValue: 'You cannot verify your own report.' }) });
        }
      } else {
        setVerificationPopup({ visible: true, type, title, message: desc });
      }
    };

    if (!complaint || !complaint.coords) {
      attemptVerify(1, t('verifyPopupFallbackTitle'), t('verifyPopupFallbackDesc'), 'success_1');
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistance(latitude, longitude, complaint.coords.lat, complaint.coords.lng);

        if (distance <= 500) {
          attemptVerify(2, t('verifyPopupOnSiteTitle'), t('verifyPopupOnSiteDesc'), 'success_2');
        } else if (distance <= 3000) {
          attemptVerify(1, t('verifyPopupLocalTitle'), t('verifyPopupLocalDesc'), 'success_1');
        } else {
          const passedBy = locationHistory?.some(loc => {
            const timeDiff = Date.now() - new Date(loc.timestamp).getTime();
            if (timeDiff <= 86400000) { // Within 24 hours
               const histDist = getDistance(loc.latitude, loc.longitude, complaint.coords.lat, complaint.coords.lng);
               return histDist <= 3000;
            }
            return false;
          });

          if (passedBy) {
            attemptVerify(1, t('timeDelayedVerifyTitle', { defaultValue: 'Time-Delayed Proximity' }), t('timeDelayedVerifyDesc', { defaultValue: 'You were near this location recently. +1 Verification added!' }), 'success_1');
          } else {
            setVerificationPopup({ visible: true, type: 'error_far', title: t('verifyPopupTooFarTitle'), message: t('verifyPopupTooFarDesc') });
          }
        }
      },
      (error) => {
        // Fallback if location fails
        attemptVerify(1, t('verifyPopupFallbackTitle'), t('verifyPopupFallbackDesc'), 'success_1');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [complaints, verifyComplaint, t, locationHistory]);

  // Minute-resolution tick so complaint card timestamps refresh every 60 seconds.
  // Truncating to the minute means the value only changes once per minute, which
  // is coarse enough to avoid unnecessary re-renders but fine enough for the UI.
  const [nowMinute, setNowMinute] = useState(() => Math.floor(Date.now() / 60000));
  useEffect(() => {
    const id = setInterval(() => setNowMinute(Math.floor(Date.now() / 60000)), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position.coords);
        if (recordLocation) recordLocation(position.coords);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [recordLocation]); // Run once on mount

  const onRefresh = useCallback(() => {
    requireInternet(() => {
      triggerHaptic();
      setRefreshing(true);
      setInjectedComplaints([]); // Clear injected complaints to reset the feed
      // Simulate network request delay for refresh
      setTimeout(() => {
        setRefreshing(false);
      }, 1200);
    });
  }, [requireInternet, triggerHaptic]);

  // Handle navigation from map with highlightId
  useEffect(() => {
    const hId = route.params?.highlightId;
    if (!hId) return;
    setHighlightedId(hId);
    // Clear filter so the item is always visible
    setActiveFilter('All');
    setSearchQuery('');
    setShowMyReports(false);
    
    const tryScroll = () => {
      // Calculate index synchronously based on the target state (All filter, Newest sort)
      const targetList = [...filteredComplaintsRef.current].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const idx = targetList.findIndex(c => c.id === hId);
      
      if (idx >= 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
      }
    };

    // Check if we already have it in the feed
    const exists = complaints.some(c => c.id === hId) || injectedComplaints.some(c => c.id === hId);
    if (!exists) {
      // Fetch it specifically
      firestore().collection('complaints').doc(hId).get().then(doc => {
        if (doc.exists) {
          const newComplaint = { ...doc.data(), id: doc.id };
          setInjectedComplaints(prev => {
            if (prev.find(c => c.id === hId)) return prev;
            return [...prev, newComplaint];
          });
          // Wait for state to update, then scroll
          setTimeout(tryScroll, 600);
        }
      }).catch(err => console.warn('Failed to fetch highlighted complaint:', err));
    } else {
      // Wait longer for React Navigation's 400ms transition to fully complete
      setTimeout(tryScroll, 600);
    }
    
    // Clear highlight after 3.5 seconds
    const clear = setTimeout(() => setHighlightedId(null), 3500);
    return () => clearTimeout(clear);
  // ts is used as a trigger — a new timestamp means a new tap, even for the same complaint
  }, [route.params?.highlightId, route.params?.ts, complaints]);

  // Muted secondary colour — 55% opacity white in dark, forest green in light
  const MUTED   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,59,36,0.55)';
  const CARD_BG   = isDark ? 'rgba(255,255,255,0.04)' : colors.surface;
  const CHIP_INACTIVE_BG = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,59,36,0.07)';
  const CARD_BORDER = isDark ? colors.glassBorder : colors.border;

  const filteredComplaints = useMemo(() => {
    const combined = [...injectedComplaints];
    complaints.forEach(c => {
      if (!combined.find(ic => ic.id === c.id)) combined.push(c);
    });
    
    // Sort combined by timestamp descending to ensure injected older complaints
    // fall naturally to the bottom, rather than staying stuck at the top.
    combined.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    let result = combined;
    
    // 0. Filter by My Reports
    if (showMyReports) {
      result = result.filter(c => c.isOwnReport === true);
    }
    
    // 0.5 Filter by Proximity
    if (proximityFilter !== 'all') {
      result = result.filter(c => {
        // Exclude own reports when using proximity filter (since you cannot verify your own reports),
        // UNLESS the user explicitly has "My Reports" toggled on.
        if (!showMyReports && c.isOwnReport) return false;

        if (!c.coords) return false;
        const dist = currentLocation ? getDistance(currentLocation.latitude, currentLocation.longitude, c.coords.lat, c.coords.lng) : Infinity;
        
        if (proximityFilter === 'onsite') return dist <= 500;
        if (proximityFilter === 'local') return dist <= 3000;
        if (proximityFilter === 'history') {
          if (dist <= 3000) return true;
          return locationHistory?.some(loc => {
            const timeDiff = Date.now() - new Date(loc.timestamp).getTime();
            if (timeDiff <= 86400000) {
              const histDist = getDistance(loc.latitude, loc.longitude, c.coords.lat, c.coords.lng);
              return histDist <= 3000;
            }
            return false;
          });
        }
        return true;
      });
    }
    
    // 1. Filter by category
    if (activeFilter !== 'All') {
      result = result.filter(c =>
        (c.category?.toLowerCase() || '').includes(activeFilter.toLowerCase()) ||
        activeFilter.toLowerCase().includes((c.category?.toLowerCase() || ''))
      );
    }
    


    // 2. Filter by location search query
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.location && c.location.toLowerCase().includes(lowerQuery)) ||
        (c.description && c.description.toLowerCase().includes(lowerQuery))
      );
    }
    
    // 3. Sort by most verified
    // Javascript's sort is stable, so tied verifiedCounts will retain the mix-up order!
    if (verifiedSort === 'top') {
      result = [...result].sort((a, b) => (b.verifiedCount || 0) - (a.verifiedCount || 0));
    } else if (verifiedSort === 'bottom') {
      result = [...result].sort((a, b) => (a.verifiedCount || 0) - (b.verifiedCount || 0));
    }
    // if null (newest), it either retains the mixed order (if All) or the timestamp order (if specific category)
    
    return result;
  }, [complaints, injectedComplaints, activeFilter, searchQuery, showMyReports, proximityFilter, currentLocation, locationHistory, verifiedSort]);

  // Keep ref up to date for scrolling
  useEffect(() => {
    filteredComplaintsRef.current = filteredComplaints;
  }, [filteredComplaints]);

  // Filter labels map: internal ID → translated display label
  const FILTER_LABELS = useMemo(() => ({
    'All': t('filterAll'),
    'Sewerage': t('filterSewerage'),
    'Roads': t('filterRoads'),
    'Waste': t('filterWaste'),
    'Kunda': t('filterKunda'),
    'Encroachment': t('filterEncroachment'),
  }), [t]);

  const renderFilterBar = () => (
    <View style={styles.filterWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTERS.map(f => {
          const active = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : CHIP_INACTIVE_BG,
                  borderColor: active ? colors.primary : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(11,59,36,0.18)'),
                },
              ]}
              onPress={() => { triggerHaptic(); setActiveFilter(f); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, { color: active ? '#fff' : (isDark ? 'rgba(255,255,255,0.75)' : '#111111') }]}>
                {FILTER_LABELS[f] || f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const handleCardPress = useCallback((item) => {
    InteractionManager.runAfterInteractions(() => {
      setSelectedComplaint(item);
      setShowComplaintModal(true);
    });
  }, []);

  const renderComplaintItem = useCallback(({ item }) => (
    <ComplaintCard
      item={item}
      isHighlighted={item.id === highlightedId}
      onPress={handleCardPress}
      onVerify={handleVerifyPress}
      onRemove={removeComplaint}
      onResolve={resolveComplaint}
      isDark={isDark}
      primaryColor={colors.primary}
      primaryGlow={colors.primaryGlow}
      textColor={colors.text}
      surfaceColor={colors.surface}
      glassBorder={colors.glassBorder}
      borderColor={colors.border}
      t={t}
      FILTER_LABELS={FILTER_LABELS}
      toUrduNumerals={toUrduNumerals}
      translateLocation={translateLocation}
      translateName={translateName}
      requireInternet={requireInternet}
      language={language}
      now={nowMinute}
      currentLocation={currentLocation}
      isVerifiedByMe={isComplaintVerifiedByMe(item)}
    />
  ), [highlightedId, handleCardPress, handleVerifyPress, removeComplaint, resolveComplaint, isDark,
      colors.primary, colors.primaryGlow, colors.text, colors.surface, colors.glassBorder, colors.border,
      t, FILTER_LABELS, toUrduNumerals, translateLocation, translateName, requireInternet, language, nowMinute, currentLocation, isComplaintVerifiedByMe]);

  const PROXIMITY_FILTERS = [
    { id: 'all', labelKey: 'proxAll', defaultLabel: 'All Locations', Icon: MapPin },
    { id: 'onsite', labelKey: 'proxOnsite', defaultLabel: 'On-Site (<500m)', Icon: Crosshair },
    { id: 'local', labelKey: 'proxLocal', defaultLabel: 'Local (<3km)', Icon: MapPin },
    { id: 'history', labelKey: 'proxHistory', defaultLabel: 'Passed By (24h)', Icon: Clock }
  ];
  const currentProxObj = PROXIMITY_FILTERS.find(p => p.id === proximityFilter);
  const ProxIcon = currentProxObj.Icon;

  // No getItemLayout — cards have variable heights (with/without image, varying location text)
  // Using it with an inaccurate estimate causes cards to vanish during fast scrolling

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.screenLabel, { color: colors.primary }]}>{t('kcpLiveFeed')}</Text>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{t('Shikayat')}</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
            {/* Total count — always from mapComplaints so it shows the real number instantly */}
            {(activeFilter !== 'All' || searchQuery.trim() || showMyReports) ? (
              // Filter is active: show "X of Y"
              <Text style={[styles.countText, { color: colors.primary }]}>
                {toUrduNumerals(filteredComplaints.length)}
                <Text style={{ fontSize: 11, fontWeight: '600', opacity: 0.7 }}>
                  {' / '}{toUrduNumerals(mapComplaints.length > 0 ? mapComplaints.length : complaints.length)}
                </Text>
              </Text>
            ) : (
              // No filter: show grand total immediately
              <Text style={[styles.countText, { color: colors.primary }]}>
                {toUrduNumerals(mapComplaints.length > 0 ? mapComplaints.length : filteredComplaints.length)}
              </Text>
            )}
            <Text style={[styles.countLabel, { color: colors.primary }]}>{t('open')}</Text>
          </View>
        </View>

        {/* Location Search - Full Width */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surface, borderColor: CARD_BORDER }]}>
            <Search size={16} color={colors.primary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={isDark ? MUTED : '#111111'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={isConnected}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Action Toggles */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 10 }}>
          <TouchableOpacity
            style={[
              styles.myReportsBtn,
              { 
                flex: 1.5,
                backgroundColor: showMyReports ? colors.primary : (isDark ? 'rgba(255,255,255,0.06)' : colors.surface), 
                borderColor: showMyReports ? colors.primary : CARD_BORDER,
              }
            ]}
            onPress={() => { triggerHaptic(); setShowMyReports(!showMyReports); }}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="switch"
            accessibilityState={{ checked: showMyReports }}
          >
            <User size={18} color={showMyReports ? '#fff' : colors.primary} strokeWidth={showMyReports ? 2.5 : 2} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: showMyReports ? '#fff' : colors.primary }}>
              {t('myReports')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.myReportsBtn,
              { 
                flex: 1,
                backgroundColor: verifiedSort ? colors.primary : (isDark ? 'rgba(255,255,255,0.06)' : colors.surface), 
                borderColor: verifiedSort ? colors.primary : CARD_BORDER,
              }
            ]}
            onPress={() => {
              triggerHaptic();
              // Cycle: null (Newest) -> top -> bottom -> null
              setVerifiedSort(prev => prev === null ? 'top' : (prev === 'top' ? 'bottom' : null));
            }}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
          >
            {verifiedSort === 'top' ? (
              <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
            ) : verifiedSort === 'bottom' ? (
              <ArrowDown size={18} color="#fff" strokeWidth={2.5} />
            ) : (
              <Clock size={18} color={colors.primary} strokeWidth={2} />
            )}
            <Text style={{ fontSize: 14, fontWeight: '800', color: verifiedSort ? '#fff' : colors.primary }}>
              {verifiedSort === 'top' ? t('top', { defaultValue: 'Top' }) : verifiedSort === 'bottom' ? t('bottom', { defaultValue: 'Bottom' }) : t('newest', { defaultValue: 'Newest' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Local Area Filter */}
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <TouchableOpacity
            style={[
              styles.myReportsBtn,
              { 
                width: '100%',
                backgroundColor: proximityFilter !== 'all' ? colors.primaryGlow : (isDark ? 'rgba(255,255,255,0.06)' : colors.surface), 
                borderColor: proximityFilter !== 'all' ? colors.primary : CARD_BORDER,
              }
            ]}
            onPress={() => { 
              triggerHaptic(); 
              const nextIdx = (PROXIMITY_FILTERS.findIndex(p => p.id === proximityFilter) + 1) % PROXIMITY_FILTERS.length;
              setProximityFilter(PROXIMITY_FILTERS[nextIdx].id);
            }}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
          >
            <ProxIcon size={18} color={colors.primary} strokeWidth={proximityFilter !== 'all' ? 2.5 : 2} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, flexShrink: 1 }} numberOfLines={1}>
              {t(currentProxObj.labelKey, { defaultValue: currentProxObj.defaultLabel })}
            </Text>
          </TouchableOpacity>
        </View>

        {renderFilterBar()}

        <FlatList
          ref={flatListRef}
          data={filteredComplaints}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderComplaintItem}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primary]} 
              tintColor={colors.primary} 
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={15}
          windowSize={21}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={20}
          keyboardShouldPersistTaps="handled"
          decelerationRate="normal"
          onEndReached={fetchMoreComplaints}
          onEndReachedThreshold={0.8}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={{ paddingVertical: 4 }}>
                {[1, 2].map(key => (
                  <MiniSkeletonCard
                    key={key}
                    isDark={isDark}
                    surfaceColor={colors.surface}
                    glassBorder={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(11,59,36,0.18)'}
                  />
                ))}
              </View>
            ) : !hasMoreComplaints && complaints.length > 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ShieldCheck size={20} color={MUTED} strokeWidth={1.5} />
                <Text style={{ color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                  {t('allCaughtUp', { defaultValue: "You're all caught up!" })}
                </Text>
              </View>
            ) : null
          }
          onScrollToIndexFailed={(info) => {
            const offset = 320 * info.index;
            flatListRef.current?.scrollToOffset({ offset, animated: false });
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
            }, 100);
          }}
          ListEmptyComponent={
            feedError ? (
              // ── Error State ──────────────────────────────────────
              <View style={[styles.emptyContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface, borderColor: CARD_BORDER }]}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <AlertTriangle size={28} color='#EF4444' strokeWidth={2} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {feedError === 'network'
                    ? t('errorNoNetwork', { defaultValue: 'No Internet Connection' })
                    : feedError === 'permission'
                    ? t('errorPermission', { defaultValue: 'Access Denied' })
                    : t('errorGeneric', { defaultValue: 'Something Went Wrong' })}
                </Text>
                <Text style={[styles.emptyText, { color: MUTED, marginBottom: 20 }]}>
                  {feedError === 'network'
                    ? t('errorNoNetworkDesc', { defaultValue: 'Please check your internet and try again.' })
                    : feedError === 'permission'
                    ? t('errorPermissionDesc', { defaultValue: "You don't have access to view reports. Please sign in again." })
                    : t('errorGenericDesc', { defaultValue: 'An unexpected error occurred. Please try again.' })}
                </Text>
                <TouchableOpacity
                  onPress={retryFeedLoad}
                  style={{ backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                    {t('retryBtn', { defaultValue: 'Try Again' })}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : !complaintsLoaded ? (
              // ── Skeleton Loading State ────────────────────────────
              <View style={{ paddingVertical: 10 }}>
                {[1, 2, 3, 4, 5].map(key => (
                  <SkeletonCard
                    key={key}
                    isDark={isDark}
                    surfaceColor={colors.surface}
                    glassBorder={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(11,59,36,0.18)'}
                  />
                ))}
              </View>
            ) : (
              // ── All Clear (empty) State ──────────────────────────
              <View style={[styles.emptyContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface, borderColor: CARD_BORDER }]}>
                <ShieldCheck size={36} color={MUTED} strokeWidth={1.5} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('allClear')}</Text>
                <Text style={[styles.emptyText, { color: MUTED }]}>
                  {t('noComplaints')}
                </Text>
              </View>
            )
          }
        />
      </SafeAreaView>

      {/* Detail Popup Modal */}
      <Modal visible={showComplaintModal} transparent animationType="fade" onRequestClose={() => setShowComplaintModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          {selectedComplaint && (() => {
            const currentComplaint = complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint;
            const isVerifiedByMe = isComplaintVerifiedByMe(currentComplaint);
            const isMyComplaint = currentComplaint.isOwnReport === true;
            const verifiedCount = Math.max(currentComplaint.verifiedCount || 0, selectedComplaint.verifiedCount || 0);
            const isFullyVerified = verifiedCount >= 31;
            const verifyDisabled = isVerifiedByMe || isFullyVerified;

            const distance = currentLocation && currentComplaint.coords ? getDistance(currentLocation.latitude, currentLocation.longitude, currentComplaint.coords.lat, currentComplaint.coords.lng) : 0;
            const isOutOfRange = currentLocation && currentComplaint.coords && distance > 3000;

            return (
            <View style={{ 
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface, 
              borderRadius: 20, 
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: CAT_COLORS[currentComplaint.category] || CARD_BORDER 
            }}>
              {/* Header Strip with Color */}
              <View style={{ 
                backgroundColor: CAT_COLORS[currentComplaint.category] || colors.primary, 
                padding: 16, 
                flexDirection: 'row', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' }}>
                  {currentComplaint.category === 'Broken Roads' ? t('filterRoads') : FILTER_LABELS[currentComplaint.category] || t(currentComplaint.category, { defaultValue: currentComplaint.category })}
                </Text>
                <TouchableOpacity onPress={() => setShowComplaintModal(false)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: 6, borderRadius: 20 }}>
                  <X size={20} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ paddingBottom: 20 }} bounces={false} showsVerticalScrollIndicator={false}>
                {/* Image */}
                <View style={{ width: '100%', height: 160, overflow: 'hidden' }}>
                  <Image 
                    source={currentComplaint.image ? { uri: currentComplaint.image } : getCategoryImage(currentComplaint)} 
                    style={{ width: '100%', height: '100%', transform: [{ scale: 1.12 }] }} 
                    resizeMode="cover"
                  />
                </View>
                
                <View style={{ padding: 16, gap: 12 }}>
                  {/* Meta Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 10 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }}>
                        <User size={16} color={colors.text} />
                      </View>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', textAlign: language === 'ur' ? 'right' : 'left' }} numberOfLines={1}>
                        {translateName(currentComplaint.reporter) ?? currentComplaint.reporter}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Clock size={14} color={MUTED} />
                      <Text style={{ color: MUTED, fontSize: 13, fontWeight: '600' }}>{timeAgo(currentComplaint.timestamp, t, toUrduNumerals)}</Text>
                    </View>
                  </View>

                  {/* Location */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: 10, borderRadius: 12 }}>
                    <MapPin size={18} color={CAT_COLORS[currentComplaint.category] || colors.primary} style={{ marginTop: 2 }} />
                    <Text style={{ color: colors.text, fontSize: 14, flex: 1, lineHeight: 20, fontWeight: '500', textAlign: language === 'ur' ? 'right' : 'left' }}>
                      {toUrduNumerals(language === 'ur' ? (currentComplaint.location_ur || translateLocation(currentComplaint.location)) : (currentComplaint.location_en || translateLocation(currentComplaint.location)))}
                    </Text>
                  </View>

                  {/* Description */}
                  {currentComplaint.description && (
                    <View>
                      <Text style={{ color: MUTED, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 }}>{t('details', { defaultValue: 'Details' })}</Text>
                      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, textAlign: language === 'ur' ? 'right' : 'left', writingDirection: language === 'ur' ? 'rtl' : 'ltr' }}>
                        {t(currentComplaint.description, { defaultValue: currentComplaint.description })}
                      </Text>
                    </View>
                  )}

                  {/* Status & Verifications */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: CARD_BORDER }}>
                    <View>
                      <Text style={{ color: MUTED, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 }}>{t('status', { defaultValue: 'Status' })}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={16} color={currentComplaint.status === 'Verified' ? '#10B981' : '#F59E0B'} />
                        <Text style={{ color: currentComplaint.status === 'Verified' ? '#10B981' : '#F59E0B', fontSize: 15, fontWeight: '800' }}>
                          {currentComplaint.status === 'Verified' ? t('Verified') : t('open', { defaultValue: 'Open' })}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: MUTED, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 }}>{t('verifications')}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={16} color={colors.primary} />
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>
                          {toUrduNumerals(verifiedCount)}
                        </Text>
                      </View>
                    </View>
                  </View>


                  {/* Verification / Action Button */}
                  <View style={{ marginTop: 8 }}>
                    {isMyComplaint ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(currentComplaint.verifiedCount >= 20 && currentComplaint.status !== 'Resolved') && (
                          <TouchableOpacity
                            style={{
                              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                              paddingVertical: 12, borderRadius: 12, borderWidth: 1,
                              backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)'
                            }}
                            onPress={() => {
                              requireInternet(() => resolveComplaint(currentComplaint.id));
                              setShowComplaintModal(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <CheckCircle2 size={18} color="#22C55E" strokeWidth={2.5} />
                            <Text style={{ color: '#22C55E', fontSize: 16, fontWeight: '800', includeFontPadding: false }} numberOfLines={1}>
                              {t('markResolved', { defaultValue: 'Resolve' })}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                            paddingVertical: 12, borderRadius: 12, borderWidth: 1,
                            backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)'
                          }}
                          onPress={() => {
                            requireInternet(() => removeComplaint(currentComplaint.id));
                            setShowComplaintModal(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <Trash2 size={18} color="#EF4444" strokeWidth={2.5} />
                          <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '800', includeFontPadding: false }} numberOfLines={1}>
                            {t('Remove', { defaultValue: 'Remove' })}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                          paddingVertical: 12, borderRadius: 12, borderWidth: 1,
                          backgroundColor: isVerifiedByMe ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(11,59,36,0.05)') : (isOutOfRange ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : colors.primaryGlow),
                          borderColor: isVerifiedByMe || isOutOfRange ? CARD_BORDER : colors.primary
                        }}
                        onPress={() => requireInternet(() => {
                          handleVerifyPress(currentComplaint.id);
                        })}
                        disabled={verifyDisabled}
                        activeOpacity={0.8}
                      >
                        <CheckCircle2 size={18} color={verifyDisabled || isOutOfRange ? MUTED : colors.primary} strokeWidth={2.5} />
                        <Text style={{ color: verifyDisabled || isOutOfRange ? MUTED : colors.primary, fontSize: 16, fontWeight: '800', includeFontPadding: false }}>
                          {isFullyVerified ? t('fullyVerified', { defaultValue: 'Fully Verified' }) : isVerifiedByMe ? t('Verified') : t('Verify')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                </View>
              </ScrollView>
            </View>
            );
          })()}
        </View>
      </Modal>

      {/* Verification Feedback Modal */}
      <Modal visible={verificationPopup.visible} transparent animationType="fade" onRequestClose={() => setVerificationPopup({ ...verificationPopup, visible: false })}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ 
            backgroundColor: isDark ? colors.surfaceElevated : colors.surface, 
            borderRadius: 20, 
            padding: 24,
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: verificationPopup.type.startsWith('success') ? '#10B981' : '#EF4444' 
          }}>
            <View style={{
              width: 60, height: 60, borderRadius: 30, marginBottom: 16,
              backgroundColor: verificationPopup.type.startsWith('success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              justifyContent: 'center', alignItems: 'center'
            }}>
              {verificationPopup.type.startsWith('success') ? 
                <CheckCircle2 size={32} color="#10B981" strokeWidth={2.5} /> :
                <AlertOctagon size={32} color="#EF4444" strokeWidth={2.5} />
              }
            </View>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>
              {verificationPopup.title}
            </Text>
            <Text style={{ color: MUTED, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              {verificationPopup.message}
            </Text>
            
            <TouchableOpacity 
              style={{
                width: '100%',
                backgroundColor: verificationPopup.type.startsWith('success') ? '#10B981' : colors.primary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center'
              }}
              onPress={() => setVerificationPopup({ ...verificationPopup, visible: false })}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('okayBtn', { defaultValue: 'Got it' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feed Tutorial Modal */}
      <Modal visible={showFeedTutorial} transparent animationType="fade" onRequestClose={closeFeedTutorial}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          {(() => {
            const popupTextColor = isDark ? 'rgba(255,255,255,0.95)' : '#111111';
            const alignStyle = { textAlign: 'left', writingDirection: language === 'ur' ? 'rtl' : 'ltr' };
            return (
          <View style={{ 
            backgroundColor: isDark ? colors.surfaceElevated : colors.surface, 
            borderRadius: 24, 
            padding: 24,
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: CARD_BORDER 
          }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28, marginBottom: 16,
              backgroundColor: colors.primaryGlow,
              justifyContent: 'center', alignItems: 'center'
            }}>
              <Info size={28} color={colors.primary} strokeWidth={2.5} />
            </View>
            
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 20, textAlign: 'center', width: '100%' }}>
              {t('feedTutorialTitle', { defaultValue: 'Welcome to the Live Feed!' })}
            </Text>
            
            <View style={{ gap: 14, marginBottom: 26, width: '100%' }}>
              <Text style={[{ color: popupTextColor, fontSize: 16, fontWeight: '600', lineHeight: 24 }, alignStyle]}>
                {t('feedTutorialDesc1', { defaultValue: '• Use the Proximity Filter to find issues near you!' })}
              </Text>
              <Text style={[{ color: popupTextColor, fontSize: 16, fontWeight: '600', lineHeight: 24 }, alignStyle]}>
                {t('feedTutorialDesc2', { defaultValue: '• On-Site (< 500m) grants +2 Verifications.' })}
              </Text>
              <Text style={[{ color: popupTextColor, fontSize: 16, fontWeight: '600', lineHeight: 24 }, alignStyle]}>
                {t('feedTutorialDesc3', { defaultValue: '• Local (< 3km) & Passed By (Last 24h) grant +1 Verification.' })}
              </Text>
              <Text style={[{ color: popupTextColor, fontSize: 16, fontWeight: '600', lineHeight: 24 }, alignStyle]}>
                {t('feedTutorialDesc4', { defaultValue: '• Too far (> 3km) cannot be verified. You cannot verify your own reports.' })}
              </Text>
              <Text style={[{ color: '#EF4444', fontSize: 16, fontWeight: '800', lineHeight: 24, marginTop: 4 }, alignStyle]}>
                {t('feedTutorialDesc5', { defaultValue: '• Be a responsible citizen! Cheating the location system will result in severe penalties or permanent app bans.' })}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={{
                width: '100%',
                backgroundColor: colors.primary,
                paddingVertical: 15,
                borderRadius: 14,
                alignItems: 'center'
              }}
              onPress={() => {
                triggerHaptic();
                closeFeedTutorial();
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('feedTutorialBtn', { defaultValue: 'Got it, let\'s go!' })}</Text>
            </TouchableOpacity>
          </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea:  { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
  },
  screenLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  pageTitle:   { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  countBadge:  { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  countText:   { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  countLabel:  { fontSize: 9,  fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  /* Search Bar & Toggles */
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    height: 48, paddingHorizontal: 16, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 0, height: '100%' },
  myReportsBtn: {
    height: 44, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center'
  },

  /* Filter — let it size naturally + add vertical breathing room */
  filterWrap:  { paddingVertical: 8 },
  filterScroll: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },

  /* Card — left accent border replaces floating badge visual weight */
  card: {
    borderRadius: 16, marginBottom: 10, borderWidth: 1,
    overflow: 'hidden', flexDirection: 'column',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },
  cardInner: { width: '100%' },

  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, gap: 10,
  },
  avatar:        { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', direction: 'ltr' },
  avatarText:    { fontSize: 14, fontWeight: '900', textAlign: 'center', includeFontPadding: false },
  reporterBlock: { flex: 1 },
  reporterName:  { fontSize: 13, fontWeight: '800' },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  metaText:      { fontSize: 11, fontWeight: '600' },
  catPill:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  catPillText:   { fontSize: 10, fontWeight: '700' },
  severityChip:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  severityText:  { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  /* Media */
  cardImageContainer: { width: '100%', height: 180, overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },

  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 7 },
  locationText: { fontSize: 13, fontWeight: '600', flex: 1 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 10, paddingTop: 7, borderTopWidth: 1,
    gap: 8,
  },
  verifyCount:     { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  verifyCountText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
    flexShrink: 1,
  },
  verifyBtnText:  { fontSize: 12, fontWeight: '800', flexShrink: 1, includeFontPadding: false },

  emptyContainer: { margin: 20, padding: 36, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 10 },
  emptyTitle:     { fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptyText:      { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});

export default ShikayatScreen;
