import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  MapPin, Camera, CheckSquare, MessageSquare, Gift, CreditCard,
  Trophy, Medal, User, BarChart3, Settings, Globe, Moon,
  ShieldCheck, ArrowRight, ArrowLeft, ArrowDown, X, Sparkles,
  Bell, Database, Target, Award, AlertTriangle, Crosshair
} from 'lucide-react-native';

const { width: SCREEN_W } = Dimensions.get('window');

/* ── localise helper: returns string based on language ── */
const L = (lang, en, ru, ur) =>
  lang === 'ur' ? ur : lang === 'ru' ? ru : en;

/* ── Small feature bullet with arrow & icon ── */
const FeatureBullet = ({ icon: Icon, iconColor, text, colors, isDark, isRTL }) => (
  <View style={featureStyles.row}>
    <View style={[featureStyles.arrowBox, { backgroundColor: iconColor + '18' }]}>
      <Icon size={16} color={iconColor} />
    </View>
    {isRTL ? (
      <ArrowLeft size={12} color={isDark ? '#6B7280' : '#9CA3AF'} style={{ marginHorizontal: 4 }} />
    ) : (
      <ArrowRight size={12} color={isDark ? '#6B7280' : '#9CA3AF'} style={{ marginHorizontal: 4 }} />
    )}
    <Text style={[featureStyles.text, { color: colors.text, textAlign: 'auto' }]}>{text}</Text>
  </View>
);

const featureStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  arrowBox: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  text: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
});

/* ════════════════════════════════════════════════════════════════════ */

const AppTutorialModal = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { language, toUrduNumerals } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const isRTL = language === 'ur';

  // animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [currentStep, visible, fadeAnim, slideAnim]);

  /* ── 7 steps, intro + one per tab ── */
  const steps = [
    /* 0  Intro */
    {
      icon: <Sparkles size={36} color={colors.primary} />,
      accent: colors.primary,
      tabLabel: L(language, 'Welcome', 'Khush Aamdeed', 'خوش آمدید'),
      title: L(language, 'Karachi Complaint Portal', 'Karachi Complaint Portal', 'کراچی کمپلینٹ پورٹل'),
      features: [
        { icon: MapPin, color: colors.primary, text: L(language, 'Report civic issues directly to authorities with photos and precise locations.', 'Shehri masail authorities ko photos aur location ke sath report karein.', 'شہری مسائل براہ راست حکام کو تصاویر اور مقام کے ساتھ رپورٹ کریں۔') },
        { icon: CheckSquare, color: '#F59E0B', text: L(language, 'Verify existing reports to increase their priority and get them resolved faster.', 'Mawjooda reports ki tasdeeq karein taake wo jald hal ho sakein.', 'موجودہ رپورٹس کی تصدیق کریں تاکہ وہ جلد حل ہو سکیں۔') },
        { icon: Gift, color: '#8B5CF6', text: L(language, 'Earn City Credits for every contribution and redeem them for exclusive vouchers.', 'Har report aur tasdeeq par City Credits kamayein aur vouchers hasil karein.', 'ہر رپورٹ اور تصدیق پر سٹی کریڈٹس کمائیں اور واؤچرز حاصل کریں۔') },
        { icon: Trophy, color: '#F43F5E', text: L(language, 'Compete with others in your local zone and climb the civic leaderboard.', 'Apne ilaqay mein dusron ke sath muqabla karein aur leaderboard par aayen.', 'اپنے علاقے میں دوسروں کے ساتھ مقابلہ کریں اور لیڈر بورڈ پر آئیں۔') },
      ],
    },
    /* 1  Naksha / Report Here */
    {
      icon: <MapPin size={36} color={colors.primary} />,
      accent: colors.primary,
      tabLabel: L(language, 'Report Here', 'Report Here', 'رپورٹ ہیئر'),
      title: L(language, 'Naksha — Report Here', 'Naksha — Report Here', 'نقشہ — رپورٹ ہیئر'),
      features: [
        { icon: MapPin, color: colors.primary,
          text: L(language,
            'Uses your device GPS to automatically lock your exact current location.',
            'Aapke device ka GPS use kar ke mojooda location khud lock karta hai.',
            'آپ کے آلے کا جی پی ایس استعمال کر کے موجودہ مقام خودکار لاک کرتا ہے۔') },
        { icon: ShieldCheck, color: '#10B981',
          text: L(language,
            'Provides highly verified and trusted reports for the authorities.',
            'Authorities ke liye nihayat tasdeeq shuda aur qabil-e-aitmaad reports.',
            'حکام کے لیے نہایت تصدیق شدہ اور قابل اعتماد رپورٹس فراہم کرتا ہے۔') },
        { icon: Settings, color: '#F59E0B',
          text: L(language,
            'Requires both Location (GPS) and Internet to be enabled.',
            'Is ke liye Location (GPS) aur Internet dono on hona zaroori hai.',
            'اس کے لیے لوکیشن (جی پی ایس) اور انٹرنیٹ دونوں آن ہونا ضروری ہے۔') },
        { icon: Camera, color: '#3B82F6',
          text: L(language,
            'Snap a live photo, select a category, and submit instantly.',
            'Live tasweer kheinchein, category chunein, aur foran submit karein.',
            'لائیو تصویر کھینچیں، زمرہ منتخب کریں، اور فوراً جمع کرائیں۔') },
      ],
    },
    /* 2  Naksha / Drop Pin */
    {
      icon: <Target size={36} color="#6366F1" />,
      accent: '#6366F1',
      tabLabel: L(language, 'Drop Pin', 'Drop Pin', 'ڈراپ پن'),
      title: L(language, 'Naksha — Drop Pin', 'Naksha — Drop Pin', 'نقشہ — ڈراپ پن'),
      features: [
        { icon: Target, color: '#6366F1',
          text: L(language,
            'Manually tap anywhere on the map to report an issue from a distance.',
            'Map par kahin bhi tap kar ke door se masla report karein.',
            'نقشے پر کہیں بھی تھپتھپا کر دور سے مسئلہ رپورٹ کریں۔') },
        { icon: Globe, color: '#3B82F6',
          text: L(language,
            'Perfect for reporting issues you saw earlier or in different areas.',
            'Pehle dekhe gaye ya doosre ilaqon ke masail report karne ke liye behtareen.',
            'پہلے دیکھے گئے یا دوسرے علاقوں کے مسائل رپورٹ کرنے کے لیے بہترین۔') },
        { icon: Globe, color: '#10B981',
          text: L(language,
            'Only requires Internet. Location services are not strictly required.',
            'Sirf Internet ki zaroorat hoti hai. Location on hona lazmi nahi.',
            'صرف انٹرنیٹ کی ضرورت ہوتی ہے۔ لوکیشن آن ہونا لازمی نہیں۔') },
        { icon: MapPin, color: colors.primary,
          text: L(language,
            'Pinch to zoom or drag the map to precisely adjust the pin location.',
            'Aap map ko zoom ya drag kar ke pin ki jagah theek kar sakte hain.',
            'آپ نقشے کو زوم یا ڈریگ کر کے پن کی جگہ ٹھیک کر سکتے ہیں۔') },
      ],
    },
    /* 1  Shikayat / Feed */
    {
      icon: <MessageSquare size={36} color="#F59E0B" />,
      accent: '#F59E0B',
      tabLabel: L(language, 'Feed', 'Shikayat', 'شکایات'),
      title: L(language, 'Shikayat — Community Feed', 'Shikayat — Feed', 'شکایات — کمیونٹی فیڈ'),
      features: [
        { icon: MessageSquare, color: '#F59E0B',
          text: L(language,
            'Browse all complaints reported by citizens in your area.',
            'Apne ilaqay ke shehriyon ki shikayaat dekhein.',
            'اپنے علاقے کے شہریوں کی شکایات دیکھیں۔') },
        { icon: CheckSquare, color: '#10B981',
          text: L(language,
            'Use Proximity Filters to verify issues. Get +2 for On-Site and +1 for Local/Passed By.',
            'Proximity Filter se issues verify karein. On-Site par +2 aur Local par +1.',
            'مسائل کی تصدیق کے لیے قربت کا فلٹر استعمال کریں۔ مقام پر ۲ اور مقامی پر ۱ تصدیق حاصل کریں۔') },
        { icon: BarChart3, color: '#3B82F6',
          text: L(language,
            'Filter by "My Reports" to track your own submissions.',
            '"Meri Reports" filter se apni shikayaat track karein.',
            '"میری رپورٹس" فلٹر سے اپنی شکایات ٹریک کریں۔') },
        { icon: ShieldCheck, color: '#EF4444',
          text: L(language,
            'Once an issue reaches 30 verifications, it becomes Fully Verified and is prioritized.',
            'Jab kisi maslay ki 30 tasdeeqat ho jayen, to usay Fully Verified tasawwur kiya jata hai.',
            'جب کسی مسئلے کی ۳۰ تصدیقات ہو جائیں، تو اسے مکمل تصدیق شدہ تصور کیا جاتا ہے۔') },
      ],
    },
    /* 2  Inaam / Rewards */
    {
      icon: <Gift size={36} color="#8B5CF6" />,
      accent: '#8B5CF6',
      tabLabel: L(language, 'Rewards', 'Inaam', 'انعام'),
      title: L(language, 'Inaam — Rewards Store', 'Inaam — Rewards', 'انعام — ریوارڈز سٹور'),
      features: [
        { icon: CreditCard, color: '#8B5CF6',
          text: L(language,
            'Earn City Credits for every verified report and verification.',
            'Har tasdeeq-shuda report par City Credits kamayein.',
            'ہر تصدیق شدہ رپورٹ پر سٹی کریڈٹس کمائیں۔') },
        { icon: Gift, color: '#EC4899',
          text: L(language,
            'Redeem credits for discount vouchers on food, rides & more.',
            'Credits se khana, rides waghaira par discount vouchers hasil karein.',
            'کریڈٹس سے کھانے، رائیڈز وغیرہ پر ڈسکاؤنٹ واؤچرز حاصل کریں۔') },
        { icon: Sparkles, color: '#F59E0B',
          text: L(language,
            'Partner brands include Careem, Foodpanda, Daraz & more.',
            'Partner brands: Careem, Foodpanda, Daraz waghaira.',
            'پارٹنر برانڈز: کریم، فوڈ پانڈا، دراز وغیرہ۔') },
        { icon: Gift, color: '#10B981',
          text: L(language,
            'Don\'t forget to check in every day to claim your +10 Daily Bonus!',
            'Rozana apna +10 Daily Bonus haasil karna mat bhoolein!',
            'روزانہ اپنا +۱۰ ڈیلی بونس حاصل کرنا مت بھولیں!') },
      ],
    },
    /* 3  Top Shehri / Leaderboard */
    {
      icon: <Trophy size={36} color="#F43F5E" />,
      accent: '#F43F5E',
      tabLabel: L(language, 'Leaderboard', 'Top Shehri', 'بہترین شہری'),
      title: L(language, 'Top Shehri — Leaderboard', 'Top Shehri — Leaderboard', 'بہترین شہری — لیڈر بورڈ'),
      features: [
        { icon: Trophy, color: '#F43F5E',
          text: L(language,
            'See who is making the biggest impact in your local zone.',
            'Dekhein kaun aapke ilaqay mein sabse zyada asar daal raha hai.',
            'دیکھیں کون آپ کے علاقے میں سب سے زیادہ اثر ڈال رہا ہے۔') },
        { icon: Medal, color: '#F59E0B',
          text: L(language,
            'Climb the ranks by reporting and verifying more issues.',
            'Zyada report aur tasdeeq kar ke rank barhayen.',
            'زیادہ رپورٹ اور تصدیق کر کے رینک بڑھائیں۔') },
        { icon: BarChart3, color: '#8B5CF6',
          text: L(language,
            'Compete by zone — switch your local area in Settings.',
            'Zone ke hisab se muqabla karein — Settings mein ilaaqa badlein.',
            'زون کے حساب سے مقابلہ کریں — سیٹنگز میں علاقہ بدلیں۔') },
        { icon: Gift, color: '#10B981',
          text: L(language,
            'Finish in the Top 10 at the end of the season to win special vouchers!',
            'Season ke aakhir mein Top 10 mein aayen aur khaas vouchers jeetein!',
            'سیزن کے آخر میں ٹاپ ۱۰ میں آئیں اور خاص واؤچرز جیتیں!') },
      ],
    },
    /* 4  Mera Account / Profile */
    {
      icon: <User size={36} color="#3B82F6" />,
      accent: '#3B82F6',
      tabLabel: L(language, 'Profile', 'Account', 'اکاؤنٹ'),
      title: L(language, 'Mera Account — Your Profile', 'Mera Account — Profile', 'میرا اکاؤنٹ — آپ کا پروفائل'),
      features: [
        { icon: User, color: '#3B82F6',
          text: L(language,
            'View your total XP, level, and City Credits at a glance.',
            'Apna XP, level, aur City Credits aik nazar mein dekhein.',
            'اپنا ایکس پی، لیول، اور سٹی کریڈٹس ایک نظر میں دیکھیں۔') },
        { icon: BarChart3, color: '#10B981',
          text: L(language,
            'Check your complete reporting history and status of each report.',
            'Apni mukammal reporting history aur har report ka status dekhein.',
            'اپنی مکمل رپورٹنگ ہسٹری اور ہر رپورٹ کا سٹیٹس دیکھیں۔') },
        { icon: Sparkles, color: '#F59E0B',
          text: L(language,
            'Track your personal contributions and civic impact score.',
            'Apne personal contributions aur civic impact score ko track karein.',
            'اپنے ذاتی تعاون اور شہری اثر سکور کو ٹریک کریں۔') },
        { icon: Award, color: '#EC4899',
          text: L(language,
            'View earned badges and community milestones.',
            'Haasil karda badges aur community milestones dekhein.',
            'حاصل کردہ بیجز اور کمیونٹی کے سنگ میل دیکھیں۔') },
      ],
    },
    /* 5  Tarjeehat / Settings */
    {
      icon: <Settings size={36} color="#10B981" />,
      accent: '#10B981',
      tabLabel: L(language, 'Settings', 'Tarjeehat', 'ترجیحات'),
      title: L(language, 'Tarjeehat — Settings', 'Tarjeehat — Settings', 'ترجیحات — سیٹنگز'),
      features: [
        { icon: Globe, color: '#3B82F6',
          text: L(language,
            'Switch between English, Roman Urdu, and Urdu at any time.',
            'Kabhi bhi English, Roman Urdu, ya Urdu mein tabdeel karein.',
            'کسی بھی وقت انگریزی، رومن اردو، یا اردو میں تبدیل کریں۔') },
        { icon: Moon, color: '#EC4899',
          text: L(language,
            'Toggle Dark / Light mode for comfortable viewing.',
            'Dark / Light mode on/off karein.',
            'ڈارک / لائٹ موڈ آن/آف کریں۔') },
        { icon: ShieldCheck, color: '#10B981',
          text: L(language,
            'Enable Anonymous Mode to hide your identity on public reports.',
            'Anonymous Mode on karein taake aapka naam chhupa rahe.',
            'گمنام موڈ آن کریں تاکہ آپ کا نام چھپا رہے۔') },
        { icon: Bell, color: '#F59E0B',
          text: L(language,
            'Manage push notifications and local alert preferences.',
            'Push notifications aur local alerts ki tarjeehat manage karein.',
            'پش اطلاعات اور مقامی الرٹس کی ترجیحات کا نظم کریں۔') },
      ],
    },
    /* 8  Ethical Use */
    {
      icon: <ShieldCheck size={36} color="#EF4444" />,
      accent: '#EF4444',
      tabLabel: L(language, 'Rules', 'Qawaneen', 'قوانین'),
      title: L(language, 'Responsible & Ethical Use', 'Zimmadaar Shehri', 'ذمہ دار اور اخلاقی استعمال'),
      features: [
        { icon: AlertTriangle, color: '#F59E0B',
          text: L(language,
            'You can only use up to 3 accounts per day on a single device.',
            'Aap aik device par din mein ziyada se ziyada 3 accounts istemal kar sakte hain.',
            'آپ ایک آلے پر دن میں زیادہ سے زیادہ ۳ اکاؤنٹس استعمال کر سکتے ہیں۔') },
        { icon: ShieldCheck, color: '#EF4444',
          text: L(language,
            'You cannot verify your own reports, even from different accounts on the same device.',
            'Aap apni reports khud verify nahi kar sakte, chahay dusra account hi kyun na ho.',
            'آپ اپنی رپورٹس کی خود تصدیق نہیں کر سکتے، چاہے ایک ہی آلے پر دوسرا اکاؤنٹ ہو۔') },
        { icon: Crosshair, color: '#3B82F6',
          text: L(language,
            'Verification farming and fake locations are strictly monitored.',
            'Fake location aur ghalat verification par sakht nazar rakhi jati hai.',
            'جعلی مقام اور غلط تصدیق پر سخت نظر رکھی جاتی ہے۔') },
        { icon: X, color: '#EF4444',
          text: L(language,
            'Cheating the system will result in permanent device bans and loss of credits.',
            'Dhoka dahi par device ban aur credits zaya ho jayenge.',
            'نظام میں دھوکہ دہی پر آلے پر پابندی اور کریڈٹس ضائع ہو جائیں گے۔') },
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const MUTED = isDark ? '#9CA3AF' : '#6B7280';
  const isLast = currentStep === steps.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? '#1F2937' : '#E5E7EB',
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* ── Top bar: step counter + skip ── */}
          <View style={styles.topBar}>
            <Text style={[styles.stepCounter, { color: MUTED }]}>
              {language === 'ur' 
                ? `${toUrduNumerals(steps.length)} / ${toUrduNumerals(currentStep + 1)}`
                : `${currentStep + 1} / ${steps.length}`}
            </Text>
            <TouchableOpacity
              style={[styles.skipBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB', borderColor: isDark ? '#4B5563' : '#D1D5DB' }]}
              onPress={handleClose}
              activeOpacity={0.6}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              accessibilityRole="button"
              accessibilityLabel={L(language, 'Skip', 'Skip', 'چھوڑیں')}
            >
              <X size={16} color={colors.text} />
              <Text style={[styles.skipText, { color: colors.text }]}>
                {L(language, 'Skip', 'Skip', 'چھوڑیں')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Scrollable content ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Icon + Tab label chip */}
            <View style={styles.iconRow}>
              <View style={[styles.iconCircle, { backgroundColor: step.accent + '15', borderColor: step.accent + '40' }]}>
                {step.icon}
              </View>
              <View style={[styles.tabChip, { backgroundColor: step.accent + '18', borderColor: step.accent + '35' }]}>
                <ArrowDown size={10} color={step.accent} />
                <Text style={[styles.tabChipText, { color: step.accent }]}>{step.tabLabel}</Text>
              </View>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>
              {step.title}
            </Text>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]} />

            {/* Feature bullets */}
            <Text style={[styles.featuresLabel, { color: MUTED, textAlign: 'auto' }]}>
              {L(language, 'KEY FEATURES', 'KHAAS FEATURES', 'اہم خصوصیات')}
            </Text>
            {step.features.map((f, i) => (
              <FeatureBullet
                key={i}
                icon={f.icon}
                iconColor={f.color}
                text={f.text}
                colors={colors}
                isDark={isDark}
                isRTL={isRTL}
              />
            ))}
          </ScrollView>

          {/* ── Bottom progress + buttons ── */}
          <View style={styles.bottomSection}>
            {/* Progress dots */}
            <View style={styles.progressRow}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === currentStep ? step.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      width: i === currentStep ? 22 : 7,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Nav buttons */}
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[
                  styles.prevBtn,
                  {
                    backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                    opacity: currentStep === 0 ? 0.35 : 1,
                  },
                ]}
                onPress={handlePrev}
                disabled={currentStep === 0}
                activeOpacity={0.7}
              >
                {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: step.accent }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>
                  {isLast
                    ? L(language, 'Get Started!', 'Shuru Karein!', 'شروع کریں!')
                    : L(language, 'Next', 'Agla', 'اگلا')}
                </Text>
                {!isLast && (isRTL ? <ArrowLeft size={16} color="#fff" /> : <ArrowRight size={16} color="#fff" />)}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ════════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 90,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Scroll content */
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  iconRow: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    gap: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 14,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  featuresLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  /* Bottom */
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 18,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prevBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default AppTutorialModal;
