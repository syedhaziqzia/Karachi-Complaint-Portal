import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, Platform, Text, Modal, TouchableOpacity, TextInput, InteractionManager, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, MessageSquare, User, Gift, Trophy, Settings as SettingsIcon, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useReporting } from '../context/ReportingContext';
import NotificationService from '../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Screens
import NakshaScreen from '../screens/main/NakshaScreen';
import ShikayatScreen from '../screens/main/ShikayatScreen';
import MeraAccountScreen from '../screens/main/MeraAccountScreen';
import InaamScreen from '../screens/main/InaamScreen';
import TopShehriScreen from '../screens/main/TopShehriScreen';
import TarjeehatScreen from '../screens/main/TarjeehatScreen';
import AppTutorialModal from '../components/main/AppTutorialModal';
import AppSurveyModal from '../components/main/AppSurveyModal';
import { useAppContext } from '../context/AppContext';
import { SplashContext } from '../../App';
import { useBadges } from '../hooks/useBadges';


const Tab = createBottomTabNavigator();

const ICON_MAP = {
  Naksha: Map,
  Shikayat: MessageSquare,
  Inaam: Gift,
  Shehri: Trophy,
  Account: User,
  Settings: SettingsIcon,
};

const TabIconWrapper = ({ route, color, focused, colors }) => {
  const IconComponent = ICON_MAP[route.name] ?? Map;
  return (
    <View style={[
      styles.iconWrap,
      focused && { backgroundColor: colors.primaryGlow },
    ]}>
      <IconComponent
        size={focused ? 24 : 22}
        color={color}
        strokeWidth={focused ? 2.5 : 1.8}
      />
    </View>
  );
};

const NOTIF_PERM_ASKED_KEY = '@kcp_notif_perm_asked';

const MainTabNavigator = () => {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { isReporting, forceResetReport } = useReporting();
  const { showAppTutorial, closeTutorial, appLaunchCount, triggerHaptic, unlockedBadges, setUnlockedBadges, isLoaded, streakDay } = useAppContext();
  const splashContext = React.useContext(SplashContext);
  const videoFinished = splashContext?.videoFinished ?? true;
  const badges = useBadges();
  
  const insets = useSafeAreaInsets();
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [activeTab, setActiveTab] = useState('Naksha');

  // ── One-shot entrance animation: fade + rise when home screen first mounts ──
  // Once the animation finishes we stop applying the Animated style entirely
  // so it can never interfere with tab-switch renders again.
  const entranceOpacity    = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(28)).current;
  const entranceDone       = useRef(false);
  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 500,
        delay: 60,
        useNativeDriver: true,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      }),
      Animated.timing(entranceTranslateY, {
        toValue: 0,
        duration: 460,
        delay: 60,
        useNativeDriver: true,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      }),
    ]);
    anim.start(() => { entranceDone.current = true; });
    return () => anim.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Survey State
  const [surveyTriggered, setSurveyTriggered] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyStep, setSurveyStep] = useState('prompt'); // 'prompt' | 'questions' | 'thanks'
  const [surveyText, setSurveyText] = useState('');

  // Delay showing any modal until 2.5s AFTER the splash video ends
  const [postVideoReady, setPostVideoReady] = useState(false);
  useEffect(() => {
    if (!videoFinished) return;
    const t = setTimeout(() => setPostVideoReady(true), 2500);
    return () => clearTimeout(t);
  }, [videoFinished]);

  // Trigger survey timer after video ends
  useEffect(() => {
    if (!videoFinished) return;
    if ([20, 50, 75, 95, 130].includes(appLaunchCount)) {
      const timer = setTimeout(() => {
        setSurveyTriggered(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [videoFinished, appLaunchCount]);

  // Show survey on whichever screen the user is on (but avoid interrupting an active report flow)
  useEffect(() => {
    if (surveyTriggered && !isReporting) {
      setShowSurvey(true);
      setSurveyTriggered(false); // only show once
    }
  }, [surveyTriggered, isReporting]);

  // Push Notification — ask ONCE on the very first launch only.
  // • If the user grants → store 'granted', schedule everything immediately.
  // • If the user denies → store 'denied', NEVER ask again automatically.
  //   The user can re-enable from the Notifications toggle in Settings, which
  //   opens the Android OS notification settings for the app.
  const requestNotifPermOnce = useCallback(async () => {
    try {
      await NotificationService.init();
      const prevAnswer = await AsyncStorage.getItem(NOTIF_PERM_ASKED_KEY);
      // 'granted' or 'denied' → already settled, never prompt again automatically
      if (prevAnswer === 'granted' || prevAnswer === 'denied') return;

      const granted = await NotificationService.requestPermission();
      if (granted) {
        await AsyncStorage.setItem(NOTIF_PERM_ASKED_KEY, 'granted');
        await NotificationService.scheduleRecurringNudges(streakDay || 1).catch(() => {});
        await NotificationService.scheduleInactivityReminders().catch(() => {});
      } else {
        // Denied: mark it so we never nag the user again on launch.
        // They can re-enable from Settings → Notifications toggle → OS settings.
        await AsyncStorage.setItem(NOTIF_PERM_ASKED_KEY, 'denied');
      }
    } catch (e) {
      console.warn('Notification init error', e);
    }
  }, [streakDay]);

  // Request notifications after splash video ends (only fires on first-ever launch)
  useEffect(() => {
    if (postVideoReady && !showAppTutorial) {
      requestNotifPermOnce();
    }
  }, [postVideoReady, showAppTutorial, requestNotifPermOnce]);

  // ── Badge unlock tracking ──────────────────────────────────────────────────
  // Tracks whether initial seeding of pre-earned badges has completed.
  // On FIRST load (unlockedBadges is empty []), we silently record all currently-
  // earned badges WITHOUT sending notifications. On every subsequent evaluation,
  // only genuinely NEW unlocks trigger a push notification.
  const badgeSeeded = useRef(false);
  // Track previous unlockedBadges length to detect user switches (reset to [])
  const prevUnlockedLenRef = useRef(-1);
  // Debounce timer: the badge check fires after state has settled, not on every
  // individual render during Firestore's initial onSnapshot delivery.
  const badgeCheckTimerRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !badges) return;

    // Debounce: wait for state to settle before doing expensive badge diffing.
    // Badges recompute on every Firestore onSnapshot during startup; without this
    // the effect would run dozens of times in the first 3–5 seconds.
    if (badgeCheckTimerRef.current) clearTimeout(badgeCheckTimerRef.current);

    const currentUnlocked = unlockedBadges || [];

    // Detect user switch: if badges went from non-empty back to empty, reset seeded flag
    // so the new user gets silent seeding instead of notification spam
    if (prevUnlockedLenRef.current > 0 && currentUnlocked.length === 0) {
      badgeSeeded.current = false;
    }
    prevUnlockedLenRef.current = currentUnlocked.length;

    // ── FIRST RUN: capture seeded state NOW (before the debounce fires) so that
    // any subsequent effect run within the 1s window sees seeded=true and skips
    // this branch — preventing duplicate notifications on rapid re-renders.
    const wasAlreadySeeded = badgeSeeded.current;
    if (!wasAlreadySeeded) {
      badgeSeeded.current = true; // mark immediately, not inside the timeout
    }

    badgeCheckTimerRef.current = setTimeout(() => {

    if (!wasAlreadySeeded) {
      // ── Silently seed all pre-earned badges (no notifications) ──
      const alreadyEarned = badges.filter(b => b.earned).map(b => b.id);
      const merged = Array.from(new Set([...currentUnlocked, ...alreadyEarned]));

      if (merged.length > currentUnlocked.length || currentUnlocked.length === 0) {
        setUnlockedBadges(merged);
      }
      return; // Exit early — no notifications on first seed
    }

    // ── SUBSEQUENT RUNS: Detect genuinely new unlocks ──
    let hasNewUnlock = false;
    const newUnlockedList = [...currentUnlocked];

    badges.forEach(b => {
      if (b.earned && !newUnlockedList.includes(b.id)) {
        // Find localized name for the notification
        let localizedName = b.name;
        if (language === 'ur') {
           const mapUr = {
             'First Report': 'پہلی رپورٹ', 'Verified 10': '10 تصدیق شدہ', 'Local Hero': 'مقامی ہیرو', 'Early Adopter': 'ابتدائی رکن',
             'Pothole Patrol': 'پوٹ ہول پیٹرول', 'Streak Master': 'اسٹریک ماسٹر', 'Active Citizen': 'فعال شہری', 'Green Thumb': 'گرین تھمب',
             'Sharp Eye': 'تیز نظر', 'K-Electric Nemesis': 'کے الیکٹرک کا دشمن', 'Daily Grinder': 'ڈیلی گرائنڈر', 'Water Saver': 'پانی بچانے والا',
             'Traffic Warden': 'ٹریفک وارڈن', 'Clean City': 'صاف شہر', 'Trusted Voice': 'قابلِ اعتماد آواز', 'Helpful Hand': 'مددگار ہاتھ',
             'Bronze Contributor': 'برونز شراکت دار', 'Silver Contributor': 'سلور شراکت دار', 'Gold Contributor': 'گولڈ شراکت دار', 'Global Champion': 'گلوبل چیمپئن',
             'Civic Heart': 'شہری دل', 'Early Bird': 'ارلی برڈ', 'Precision': 'درستگی', 'Connected': 'کنیکٹڈ',
             'Safety First': 'سیفٹی فرسٹ', 'Emergency': 'ایمرجنسی', 'Planter': 'پلانٹر', 'Loudspeaker': 'لاؤڈ اسپیکر',
             'Pioneer': 'پہل کرنے والا', 'Fixer Upper': 'مرمت کرنے والا', 'Commuter': 'مسافر', 'Voucher Hunter': 'واؤچر شکاری',
             'Explorer': 'دریافت کنندہ', 'Night Owl': 'نائٹ آؤل', 'Weekend Warrior': 'ویک اینڈ وارئیر', 'Neighborhood Watch': 'محلے کا محافظ',
             'Animal Savior': 'جانوروں کا محافظ', 'Rain Ready': 'بارش کے لیے تیار', 'Pedestrian First': 'پیدل چلنے والوں کا خیال', 'Heritage Guard': 'ورثہ کا محافظ',
             'Feedback Pro': 'فیڈ بیک پرو', 'Super Sharer': 'سپر شیئرر', 'Unstoppable': 'ناقابل تسخیر', 'Early Voter': 'ارلی ووٹر',
             'Patience': 'صبر', 'Multi-Lingual': 'کثیر لسانی', 'Night Watch': 'نائٹ واچ', 'First Responder': 'پہلا جوابدہ',
             'Photographer': 'فوٹوگرافر', 'Guardian': 'گارڈین', 'Master Contributor': 'ماہر شراکت دار', 'Century Club': 'سینچری کلب',
             'Legendary Streak': 'لیجنڈری اسٹریک', 'Community Pillar': 'کمیونٹی کا ستون', 'Elite Verifier': 'ایلیٹ تصدیق کنندہ', 'Zone Master': 'زون ماسٹر',
             'Super Photographer': 'سپر فوٹوگرافر', 'City Savior': 'شہر کا محافظ', 'Flawless Precision': 'بے عیب درستگی', 'Year of Service': 'ایک سال کی خدمت',
             'Road Master': 'روڈ ماسٹر', 'Park Ranger': 'پارک رینجر', 'Kunda Buster': 'کنڈا بسٹر', 'Leak Detective': 'لیک جاسوس', 'Traffic Controller': 'ٹریفک کنٹرولر', 'Waste Warrior': 'ویسٹ واریئر', 'Clear Path': 'واضح راستہ', 'Consistent Reporter': 'مستقل رپورٹر', 'Avid Reporter': 'شوقین رپورٹر', 'Civic Legend': 'شہری لیجنڈ', 'Respected Citizen': 'معزز شہری', 'Community Leader': 'کمیونٹی لیڈر', 'Local Authority': 'مقامی اختیار', 'Two-Week Streak': 'دو ہفتے کی اسٹریک', 'Fifty-Day Streak': 'پچاس دن کی اسٹریک', 'Level 15 Reached': 'لیول 15 تک پہنچ گئے', 'Level 20 Reached': 'لیول 20 تک پہنچ گئے', 'Level 30 Reached': 'لیول 30 تک پہنچ گئے', 'Platinum Contributor': 'پلاٹینم کنٹری بیوٹر', 'Diamond Contributor': 'ڈائمنڈ کنٹری بیوٹر', 'Grandmaster': 'گرینڈ ماسٹر'
           };
           localizedName = mapUr[b.name] || b.name;
        } else if (language === 'ru') {
           const mapRu = {
             'First Report': 'Pehli Report', 'Verified 10': '10 Tasdeeq Shuda', 'Local Hero': 'Muqami Hero', 'Early Adopter': 'Ibtidai Rukan',
             'Pothole Patrol': 'Pothole Patrol', 'Streak Master': 'Streak Master', 'Active Citizen': 'Faal Shehri', 'Green Thumb': 'Green Thumb',
             'Sharp Eye': 'Tez Nazar', 'K-Electric Nemesis': 'K-Electric ka Dushman', 'Daily Grinder': 'Daily Grinder', 'Water Saver': 'Pani Bachane Wala',
             'Traffic Warden': 'Traffic Warden', 'Clean City': 'Saaf Sheher', 'Trusted Voice': 'Qabil-e-Aitemaad Awaz', 'Helpful Hand': 'Madadgar Hath',
             'Bronze Contributor': 'Bronze Sharakat Dar', 'Silver Contributor': 'Silver Sharakat Dar', 'Gold Contributor': 'Gold Sharakat Dar', 'Global Champion': 'Global Champion',
             'Civic Heart': 'Shehri Dil', 'Early Bird': 'Early Bird', 'Precision': 'Durustgi', 'Connected': 'Connected',
             'Safety First': 'Safety First', 'Emergency': 'Emergency', 'Planter': 'Planter', 'Loudspeaker': 'Loudspeaker',
             'Pioneer': 'Pehel Karne Wala', 'Fixer Upper': 'Murammat Karne Wala', 'Commuter': 'Musafir', 'Voucher Hunter': 'Voucher Shikari',
             'Explorer': 'Daryaft Kuninda', 'Night Owl': 'Night Owl', 'Weekend Warrior': 'Weekend Warrior', 'Neighborhood Watch': 'Mohallay ka Muhafiz',
             'Animal Savior': 'Janwaro ka Muhafiz', 'Rain Ready': 'Barish ke liye Tayyar', 'Pedestrian First': 'Paidal Chalne Walo ka Khayal', 'Heritage Guard': 'Wirsa ka Muhafiz',
             'Feedback Pro': 'Feedback Pro', 'Super Sharer': 'Super Sharer', 'Unstoppable': 'Na-qabil-e-taskheer', 'Early Voter': 'Early Voter',
             'Patience': 'Sabar', 'Multi-Lingual': 'Kaseer-ul-lisani', 'Night Watch': 'Night Watch', 'First Responder': 'Pehla Jawabdeh',
             'Photographer': 'Photographer', 'Guardian': 'Guardian', 'Master Contributor': 'Mahir Sharakat Dar', 'Century Club': 'Century Club', 
             'Legendary Streak': 'Legendary Streak', 'Community Pillar': 'Community ka Sutoon', 'Elite Verifier': 'Elite Tasdeeq Kuninda', 'Zone Master': 'Zone Master',
             'Super Photographer': 'Super Photographer', 'City Savior': 'Sheher ka Muhafiz', 'Flawless Precision': 'Be-Aib Durustgi', 'Year of Service': 'Ek Saal ki Khidmat',
             'Road Master': 'Road Master', 'Park Ranger': 'Park Ranger', 'Kunda Buster': 'Kunda Buster', 'Leak Detective': 'Leak Detective', 'Traffic Controller': 'Traffic Controller', 'Waste Warrior': 'Waste Warrior', 'Clear Path': 'Clear Path', 'Consistent Reporter': 'Mustaqil Reporter', 'Avid Reporter': 'Shouqeen Reporter', 'Civic Legend': 'Shehri Legend', 'Respected Citizen': 'Moaziz Shehri', 'Community Leader': 'Community Leader', 'Local Authority': 'Muqami Ikhtiyar', 'Two-Week Streak': 'Do Haftay ki Streak', 'Fifty-Day Streak': 'Pachas Din ki Streak', 'Level 15 Reached': 'Level 15 par Pohnchay', 'Level 20 Reached': 'Level 20 par Pohnchay', 'Level 30 Reached': 'Level 30 par Pohnchay', 'Platinum Contributor': 'Platinum Contributor', 'Diamond Contributor': 'Diamond Contributor', 'Grandmaster': 'Grandmaster'
           };
           localizedName = mapRu[b.name] || b.name;
        }

        let localizedDesc = b.desc;
        if (language === 'ur') {
           const descMapUr = {
             'Reported your first issue.': 'آپ کی پہلی شکایت درج کی۔',
             'Received 10 verifications on your reports.': 'آپ کی 10 رپورٹس کی تصدیق ہوئی۔',
             'Reached Level 5.': 'لیول 5 تک پہنچ گئے۔',
             'Joined during KCP launch.': 'کے سی پی لانچ کے دوران شامل ہوئے۔',
             'Reported 5 road issues.': '5 سڑک کے مسائل کی اطلاع دی۔',
             'Maintained a 7-day streak.': '7 دن کا تسلسل برقرار رکھا۔',
             'Earned 10,000 XP total.': 'کل 10,000 XP حاصل کیے۔',
             'Reported 3 park issues.': 'پارک کے 3 مسائل کی اطلاع دی۔',
             'Reported 10 issues with photos.': 'تصویروں کے ساتھ 10 مسائل کی اطلاع دی۔',
             'Reported 15 power/kunda issues.': 'بجلی/کنڈا کے 15 مسائل کی اطلاع دی۔',
             'Logged in for 30 consecutive days.': 'مسلسل 30 دن تک لاگ ان کیا۔',
             'Reported 5 water/sewerage issues.': 'پانی/سیوریج کے 5 مسائل کی اطلاع دی۔',
             'Reported 10 traffic signal issues.': '10 ٹریفک سگنل کے مسائل کی اطلاع دی۔',
             'Reported 20 waste management issues.': 'کچرے کے 20 مسائل کی اطلاع دی۔',
             'Received 50 verifications on your reports.': 'آپ کی 50 رپورٹس کی تصدیق ہوئی۔',
             'Verified 100 community reports.': 'کمیونٹی کی 100 رپورٹس کی تصدیق کی۔',
             'Earned 1,000 XP.': '1,000 XP حاصل کیے۔',
             'Earned 5,000 XP.': '5,000 XP حاصل کیے۔',
             'Earned 20,000 XP.': '20,000 XP حاصل کیے۔',
             'Reached Level 10.': 'لیول 10 تک پہنچ گئے۔',
             'Used the app for 6 months.': 'ایپ کو 6 مہینے تک استعمال کیا۔',
             'Reported 50 pinned issues.': '50 مقامات پن کیے۔',
             'Reported 5 internet/telecom issues.': 'انٹرنیٹ/ٹیلی کام کے 5 مسائل رپورٹ کیے۔',
             'Reported 10 open manholes.': '10 کھلے مین ہولز رپورٹ کیے۔',
             'Used the emergency SOS feature.': 'ہنگامی SOS فیچر استعمال کیا۔',
             'Requested 5 tree plantations.': 'درخت لگانے کی 5 درخواستیں دیں۔',
             'Shared 10 issues on social media.': '10 مسائل کو سوشل میڈیا پر شیئر کیا۔',
             'First to report an issue in a new zone.': 'نئے زون میں پہلا مسئلہ رپورٹ کرنے والا۔',
             'Reported 10 public property damages.': 'عوامی املاک کے نقصان کی 10 شکایات درج کیں۔',
             'Reported 5 public transport issues.': 'پبلک ٹرانسپورٹ کے 5 مسائل کی اطلاع دی۔',
             'Redeemed 5 rewards from Inaam.': 'انعام سے 5 انعامات حاصل کیے۔',
             'Reported issues in 3 different zones.': '3 مختلف زونز میں شکایات درج کیں۔',
             'Reported an issue after midnight.': 'آدھی رات کے بعد مسئلہ رپورٹ کیا۔',
             'Reported 5 issues on weekends.': 'ویک اینڈ پر 5 شکایات درج کیں۔',
             'Upvoted 50 issues in your area.': 'اپنے علاقے میں 50 شکایات کو اپ ووٹ کیا۔',
             'Reported an injured animal or stray issue.': 'زخمی جانور یا آوارہ کتے کی شکایت درج کی۔',
             'Reported 3 flooded streets during monsoon.': 'مون سون کے دوران سڑک پر پانی کی 3 شکایات درج کیں۔',
             'Reported 5 blocked footpaths.': '5 بند فٹ پاتھوں کی شکایت درج کی۔',
             'Reported an issue near a historical site.': 'تاریخی مقام کے قریب شکایت درج کی۔',
             'Left comments on 20 different issues.': '20 مختلف مسائل پر تبصرہ کیا۔',
             'Shared 50 issues on WhatsApp.': 'واٹس ایپ پر 50 مسائل شیئر کیے۔',
             'Reached a 30-day reporting streak.': 'مسلسل 30 دن تک رپورٹ کرنے کا تسلسل برقرار رکھا۔',
             'Upvoted an issue within 5 mins.': '5 منٹ کے اندر کسی مسئلے کو اپ ووٹ کیا۔',
             'Waited 30 days for resolution.': 'حل کے لیے 30 دن انتظار کیا۔',
             'Used app in English and Urdu.': 'انگریزی اور اردو میں ایپ استعمال کی۔',
             'Verified 5 issues after midnight.': 'آدھی رات کے بعد 5 مسائل کی تصدیق کی۔',
             'Commented first on 10 issues.': '10 مسائل پر سب سے پہلے تبصرہ کیا۔',
             'Uploaded 50 photos.': '50 تصاویر اپ لوڈ کیں۔',
             'Maintained Elite status for a month.': 'ایک مہینے تک ایلیٹ درجہ برقرار رکھا۔',
             'Earned 50,000 XP.': '50,000 XP حاصل کیے۔',
             'Reported 100 issues.': '100 مسائل کی اطلاع دی۔',
             'Maintained a 100-day streak.': '100 دن کا تسلسل برقرار رکھا۔',
             'Upvoted 500 community reports.': 'کمیونٹی کی 500 رپورٹس کو اپ ووٹ کیا۔',
             'Verified 200 local issues.': '200 مقامی شکایات کی تصدیق کی۔',
             'Reported issues in 10 different zones.': '10 مختلف زونز میں شکایات درج کیں۔',
             'Uploaded 200 photos.': '200 تصاویر اپ لوڈ کیں۔',
             'Reached Level 25.': 'لیول 25 تک پہنچ گئے۔',
             'Pinned 200 locations perfectly.': '200 مقامات کو بالکل درست پن کیا۔',
             'Used the app for 1 year.': 'ایپ کو 1 سال تک استعمال کیا۔',
             'Reported 15 road issues.': 'سڑک کے 15 مسائل کی اطلاع دی۔', 'Reported 10 park issues.': 'پارک کے 10 مسائل کی اطلاع دی۔', 'Reported 30 power/kunda issues.': 'بجلی/کنڈا کے 30 مسائل کی اطلاع دی۔', 'Reported 15 water leaks.': 'پانی کے رساؤ کی 15 شکایات درج کیں۔', 'Reported 25 traffic signal issues.': '25 ٹریفک سگنل کے مسائل کی اطلاع دی۔', 'Reported 50 waste management issues.': 'کچرے کے 50 مسائل کی اطلاع دی۔', 'Reported 15 blocked footpaths.': '15 بند فٹ پاتھوں کی شکایت درج کی۔', 'Reported 25 total issues.': 'کل 25 مسائل کی اطلاع دی۔', 'Reported 75 total issues.': 'کل 75 مسائل کی اطلاع دی۔', 'Reported 150 total issues.': 'کل 150 مسائل کی اطلاع دی۔', 'Had 100 reports verified by others.': 'آپ کی 100 رپورٹس کی دوسروں نے تصدیق کی۔', 'Had 250 reports verified by others.': 'آپ کی 250 رپورٹس کی دوسروں نے تصدیق کی۔', 'Had 500 reports verified by others.': 'آپ کی 500 رپورٹس کی دوسروں نے تصدیق کی۔', 'Maintained a 14-day streak.': '14 دن کا تسلسل برقرار رکھا۔', 'Maintained a 50-day streak.': '50 دن کا تسلسل برقرار رکھا۔', 'Reached Level 15.': 'لیول 15 تک پہنچ گئے۔', 'Reached Level 20.': 'لیول 20 تک پہنچ گئے۔', 'Reached Level 30.': 'لیول 30 تک پہنچ گئے۔', 'Earned 35,000 XP.': '35,000 XP حاصل کیے۔', 'Earned 75,000 XP.': '75,000 XP حاصل کیے۔', 'Earned 100,000 XP.': '100,000 XP حاصل کیے۔'
           };
           localizedDesc = descMapUr[b.desc] || b.desc;
        } else if (language === 'ru') {
           const descMapRu = {
             'Reported your first issue.': 'Aap ki pehli shikayat darj ki.',
             'Received 10 verifications on your reports.': 'Aap ki 10 reports ki tasdeeq hui.',
             'Reached Level 5.': 'Level 5 tak pohanch gaye.',
             'Joined during KCP launch.': 'KCP launch ke doran shamil hue.',
             'Reported 5 road issues.': '5 sarak ke masail ki ittila di.',
             'Maintained a 7-day streak.': '7 din ka tasalsul barqarar rakha.',
             'Earned 10,000 XP total.': 'Kul 10,000 XP hasil kiye.',
             'Reported 3 park issues.': 'Park ke 3 masail ki ittila di.',
             'Uploaded 10 issue photos.': 'Masail ki 10 tasaveer upload ki.',
             'Reported 15 power/kunda issues.': 'Bijli/kunda ke 15 masail ki ittila di.',
             'Logged in for 30 consecutive days.': 'Musalsal 30 din tak login kiya.',
             'Reported 5 water leaks.': 'Pani ke rissao ki 5 shikayat darj ki.',
             'Reported 10 traffic signal issues.': '10 traffic signal ke masail ki ittila di.',
             'Reported 20 waste management issues.': 'Kachre ke 20 masail ki ittila di.',
             'Had 50 reports verified by others.': 'Aap ki 50 reports ki dusron ne tasdeeq ki.',
             'Upvoted 100 community reports.': 'Community ki 100 reports ko upvote kiya.',
             'Earned 1,000 XP.': '1,000 XP hasil kiye.',
             'Earned 5,000 XP.': '5,000 XP hasil kiye.',
             'Earned 20,000 XP.': '20,000 XP hasil kiye.',
             'Reached Top 10 in Global rankings.': 'Aalmi darja bandi mein Top 10 mein aaye.',
             'Used the app for 6 months.': 'App ko 6 mahinay tak istemal kiya.',
             'Reported an issue before 6 AM.': 'Subah 6 baje se pehle masla report kiya.',
             'Pinned 50 locations perfectly.': '50 maqamat ko bilkul durust pin kiya.',
             'Reported 5 internet/telecom issues.': 'Internet/telecom ke 5 masail report kiye.',
             'Reported 10 open manholes.': '10 khule manholes report kiye.',
             'Used the emergency SOS feature.': 'Hangami SOS feature istemal kiya.',
             'Requested 5 tree plantations.': 'Darakht lagane ki 5 darkhwasten di.',
             'Shared 10 issues on social media.': '10 masail ko social media par share kiya.',
             'First to report an issue in a new zone.': 'Naye zone mein pehla masla report karne wala.',
             'Reported 10 public property damages.': 'Awami amlak ke nuqsan ki 10 shikayat darj ki.',
             'Reported 5 public transport issues.': 'Public transport ke 5 masail ki ittila di.',
             'Redeemed 5 rewards from Inaam.': 'Inaam se 5 inamaat hasil kiye.',
             'Reported issues in 3 different zones.': '3 mukhtalif zones mein shikayat darj ki.',
             'Reported an issue after midnight.': 'Aadhi raat ke baad masla report kiya.',
             'Reported 5 issues on weekends.': 'Weekend par 5 shikayat darj ki.',
             'Upvoted 50 issues in your area.': 'Apne ilaqay mein 50 shikayat ko upvote kiya.',
             'Reported an injured animal or stray issue.': 'Zakhmi janwar ya awara kuttay ki shikayat darj ki.',
             'Reported 3 flooded streets during monsoon.': 'Monsoon ke doran sarak par pani ki 3 shikayat darj ki.',
             'Reported 5 blocked footpaths.': '5 band footpathon ki shikayat darj ki.',
             'Reported an issue near a historical site.': 'Tarikhi maqam ke qareeb shikayat darj ki.',
             'Left comments on 20 different issues.': '20 mukhtalif masail par tabsara kiya.',
             'Shared 50 issues on WhatsApp.': 'WhatsApp par 50 masail share kiye.',
             'Reached a 30-day reporting streak.': 'Musalsal 30 din tak report karne ka tasalsul barqarar rakha.',
             'Upvoted an issue within 5 mins.': '5 minute ke andar kisi maslay ko upvote kiya.',
             'Waited 30 days for resolution.': 'Hal ke liye 30 din intezar kiya.',
             'Used app in English and Urdu.': 'Angrezi aur Urdu mein app istemal ki.',
             'Verified 5 issues after midnight.': 'Aadhi raat ke baad 5 masail ki tasdeeq ki.',
             'Commented first on 10 issues.': '10 masail par sab se pehle tabsara kiya.',
             'Uploaded 50 photos.': '50 tasaveer upload ki.',
             'Maintained Elite status for a month.': 'Ek mahinay tak Elite darja barqarar rakha.',
             'Earned 50,000 XP.': '50,000 XP hasil kiye.',
             'Reported 100 issues.': '100 masail ki ittila di.',
             'Maintained a 100-day streak.': '100 din ka tasalsul barqarar rakha.',
             'Upvoted 500 community reports.': 'Community ki 500 reports ko upvote kiya.',
             'Verified 200 local issues.': '200 muqami shikayat ki tasdeeq ki.',
             'Reported issues in 10 different zones.': '10 mukhtalif zones mein shikayat darj ki.',
             'Uploaded 200 photos.': '200 tasaveer upload ki.',
             'Reached Level 25.': 'Level 25 tak pohanch gaye.',
             'Pinned 200 locations perfectly.': '200 maqamat ko bilkul durust pin kiya.',
             'Used the app for 1 year.': 'App ko 1 saal tak istemal kiya.',
             'Reported 15 road issues.': 'Sarak ke 15 masail ki ittila di.', 'Reported 10 park issues.': 'Park ke 10 masail ki ittila di.', 'Reported 30 power/kunda issues.': 'Bijli/kunda ke 30 masail ki ittila di.', 'Reported 15 water leaks.': 'Pani ke rissao ki 15 shikayat darj ki.', 'Reported 25 traffic signal issues.': '25 traffic signal ke masail ki ittila di.', 'Reported 50 waste management issues.': 'Kachray ke 50 masail ki ittila di.', 'Reported 15 blocked footpaths.': '15 band footpaths ki shikayat darj ki.', 'Reported 25 total issues.': 'Kul 25 masail ki ittila di.', 'Reported 75 total issues.': 'Kul 75 masail ki ittila di.', 'Reported 150 total issues.': 'Kul 150 masail ki ittila di.', 'Had 100 reports verified by others.': 'Aap ki 100 reports ki dusron ne tasdeeq ki.', 'Had 250 reports verified by others.': 'Aap ki 250 reports ki dusron ne tasdeeq ki.', 'Had 500 reports verified by others.': 'Aap ki 500 reports ki dusron ne tasdeeq ki.', 'Maintained a 14-day streak.': '14 din ka tasalsul barqarar rakha.', 'Maintained a 50-day streak.': '50 din ka tasalsul barqarar rakha.', 'Reached Level 15.': 'Level 15 tak pohanch gaye.', 'Reached Level 20.': 'Level 20 tak pohanch gaye.', 'Reached Level 30.': 'Level 30 tak pohanch gaye.', 'Earned 35,000 XP.': '35,000 XP hasil kiye.', 'Earned 75,000 XP.': '75,000 XP hasil kiye.', 'Earned 100,000 XP.': '100,000 XP hasil kiye.'
           };
           localizedDesc = descMapRu[b.desc] || b.desc;
        }

        newUnlockedList.push(b.id);
        hasNewUnlock = true;

        // Fire one-time push notification for this genuinely new badge
        NotificationService.showBadgeUnlockedNotification(localizedName, localizedDesc, language);
      }
    });

    if (hasNewUnlock) {
      setUnlockedBadges(newUnlockedList);
    }

    }, 1000); // end debounce — 1s gives Firestore initial burst time to settle
    return () => { if (badgeCheckTimerRef.current) clearTimeout(badgeCheckTimerRef.current); };
  }, [badges, isLoaded, unlockedBadges, setUnlockedBadges, language]);

  const bottomPad = Platform.OS === 'ios'
    ? insets.bottom
    : Math.max(insets.bottom, 6);

  const tabBarHeight = Platform.OS === 'ios'
    ? 68 + insets.bottom
    : 72 + bottomPad;

  // Listener factory: block navigation when reporting is active
  const makeTabListeners = useCallback((routeName) => ({
    tabPress: (e) => {
      triggerHaptic();
      if (isReporting && routeName !== 'Naksha') {
        e.preventDefault();
        setShowBlockedModal(true);
      }
    },
    focus: () => setActiveTab(routeName),
  }), [isReporting, triggerHaptic]);

  const CARD_BG     = isDark ? colors.glass : colors.surface;
  const CARD_BORDER = isDark ? colors.glassBorder : colors.border;
  const MUTED       = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,59,36,0.55)';

  return (
    <Animated.View
      style={[
        { flex: 1 },
        // Only apply the entrance animated style while animation is running.
        // Once done (entranceDone.current = true), subsequent re-renders
        // will still use these values but they will be {opacity:1, translateY:0}
        // which is identical to no transform — zero performance impact.
        { opacity: entranceOpacity, transform: [{ translateY: entranceTranslateY }] },
      ]}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          // lazy: true — screens only mount when first visited.
          // This is the correct deferred-mount strategy and prevents the
          // "wrong screen content on fast tab switch" bug caused by the old
          // StaggeredScreen approach (transparent placeholders + freezeOnBlur
          // made background screens bleed through).
          lazy: true,
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: true,
          tabBarStyle: {
            backgroundColor: isDark
              ? 'rgba(10,15,13,0.96)'
              : 'rgba(240,247,242,0.97)',
            borderTopWidth: 1,
            borderTopColor: colors.glassBorder,
            height: tabBarHeight,
            paddingTop: 12,
            paddingBottom: bottomPad,
            elevation: 32,
            shadowColor: isDark ? '#000' : colors.primary,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.5 : 0.12,
            shadowRadius: 20,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabel: ({ focused, color, children }) => {
            // Force non-breaking space to completely prevent 2-line wrapping
            const labelText = typeof children === 'string' ? children.replace(/ /g, '\u00A0') : children;
            return (
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={{
                  color,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: language === 'ur' ? 0 : 0.5,
                  textTransform: language === 'ur' ? 'none' : 'uppercase',
                  marginTop: 2,
                  textAlign: 'center',
                  width: 120, // Give it more horizontal room than the default tab width
                  marginLeft: -30, // Offset it back to center (hacky but effective for wrapping issues)
                }}
              >
                {labelText}
              </Text>
            );
          },
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrapper
              route={route}
              color={color}
              focused={focused}
              colors={colors}
            />
          ),
          tabBarItemStyle: {
            paddingVertical: 2,
          },
        })}
      >
        <Tab.Screen name="Naksha"    options={{ tabBarLabel: t('Naksha'), tabBarAccessibilityLabel: t('Naksha') }}    listeners={makeTabListeners('Naksha')}>
          {(props) => <NakshaScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen name="Shikayat"  options={{ tabBarLabel: t('Shikayat'), tabBarAccessibilityLabel: t('Shikayat') }}  listeners={makeTabListeners('Shikayat')}>
          {(props) => <ShikayatScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen name="Inaam"     options={{ tabBarLabel: t('Inaam'), tabBarAccessibilityLabel: t('Inaam') }}     listeners={makeTabListeners('Inaam')}>
          {(props) => <InaamScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen name="Shehri"    options={{ tabBarLabel: t('Shehri'), tabBarAccessibilityLabel: t('Shehri') }}    listeners={makeTabListeners('Shehri')}>
          {(props) => <TopShehriScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen name="Account"   options={{ tabBarLabel: t('Account'), tabBarAccessibilityLabel: t('Account') }}   listeners={makeTabListeners('Account')}>
          {(props) => <MeraAccountScreen {...props} />}
        </Tab.Screen>
        <Tab.Screen name="Settings"  options={{ tabBarLabel: t('Settings'), tabBarAccessibilityLabel: t('Settings') }}  listeners={makeTabListeners('Settings')}>
          {(props) => <TarjeehatScreen {...props} />}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Report-in-progress blocker modal */}
      <Modal visible={showBlockedModal} transparent animationType="fade" onRequestClose={() => setShowBlockedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
            {/* Icon */}
            <View style={[styles.iconCircle, { borderColor: '#F59E0B', backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)' }]}>
              <AlertTriangle size={44} color="#F59E0B" />
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {t('reportInProgressTitle')}
            </Text>

            {/* Description */}
            <Text style={[styles.modalDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {t('reportInProgressDesc')}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonGroup}>
              {/* Go Back to Map (secondary) */}
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: CARD_BORDER }]}
                onPress={() => {
                  forceResetReport();
                  setShowBlockedModal(false);
                }}
                activeOpacity={0.8}
              >
                {language === 'ur' || language === 'sd' ? <ArrowRight size={16} color={colors.text} /> : <ArrowLeft size={16} color={colors.text} />}
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>{t('goBackToMap')}</Text>
              </TouchableOpacity>

              {/* Continue Reporting (primary) */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                onPress={() => setShowBlockedModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{t('continueReporting')}</Text>
                {language === 'ur' || language === 'sd' ? <ArrowLeft size={16} color="#fff" /> : <ArrowRight size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* App Tutorial Modal */}
      <AppTutorialModal 
        visible={showAppTutorial && postVideoReady} 
        onClose={() => {
          closeTutorial();
        }} 
      />

      {/* Survey Modal */}
      <AppSurveyModal visible={showSurvey} onClose={() => setShowSurvey(false)} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 52,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    padding: 28,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default MainTabNavigator;
