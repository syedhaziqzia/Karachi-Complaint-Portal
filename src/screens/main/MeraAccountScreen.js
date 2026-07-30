import React, { useState, useRef, useEffect } from 'react';
import { useBadges } from '../../hooks/useBadges';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, StatusBar, Alert, Switch, Modal, Share, TextInput, KeyboardAvoidingView, Platform, Image, I18nManager, Dimensions, ActivityIndicator
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { captureRef } from 'react-native-view-shot';
import RNShare from 'react-native-share';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Award, TrendingUp, History, ChevronRight,
  Star, Wallet, CheckCircle2, Shield, Edit2, Crown, Bell, EyeOff, Flame, X, Info, MapPin, Activity, TreeDeciduous, Camera, Zap, CalendarDays,
  Droplet, Car, Trash2, ShieldCheck, ThumbsUp, Medal, Trophy, Heart, Sun, Target, Wifi, HardHat, Siren, Sprout, Megaphone, Flag, Wrench, Bus, Ticket, Map, Moon, Coffee, Eye, HeartPulse, CloudRain, Footprints, Landmark, MessageSquare, Share2, Rocket, ArrowLeft
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { useNetwork } from '../../context/NetworkContext';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';

const RadarChart = ({ data, size, colors, isDark, language }) => {
  const viewBoxSize = 340;
  const center = viewBoxSize / 2;
  const radius = (viewBoxSize / 2) - 65; // Massive padding for text
  const angleStep = (Math.PI * 2) / data.length;

  const getPoint = (value, angle) => {
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle - Math.PI / 2),
      y: center + r * Math.sin(angle - Math.PI / 2)
    };
  };

  let polygonPoints = "";
  data.forEach((d, i) => {
    const pt = getPoint(d.value, i * angleStep);
    polygonPoints += `${pt.x},${pt.y} `;
  });

  return (
    <View style={{ alignSelf: 'center', width: size, height: size, marginVertical: 10, position: 'relative' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        {/* Draw background grid (3 levels) */}
        {[0.33, 0.66, 1].map((scale, index) => {
          let gridPoints = "";
          data.forEach((_, i) => {
             const pt = getPoint(scale * 100, i * angleStep);
             gridPoints += `${pt.x},${pt.y} `;
          });
          return (
            <Polygon
              key={`grid-${index}`}
              points={gridPoints}
              stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
              strokeWidth="1"
              fill="none"
            />
          );
        })}

        {/* Draw axes */}
        {data.map((_, i) => {
          const outerPt = getPoint(100, i * angleStep);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={outerPt.x}
              y2={outerPt.y}
              stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
              strokeWidth="1"
            />
          );
        })}

        {/* Draw data polygon */}
        <Polygon
          points={polygonPoints}
          fill={`${colors.primary}44`}
          stroke={colors.primary}
          strokeWidth="2"
        />

        {/* Draw data points */}
        {data.map((d, i) => {
          const pt = getPoint(d.value, i * angleStep);
          return (
            <Circle
              key={`point-${i}`}
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill={colors.primary}
            />
          );
        })}
      </Svg>

      {/* Draw labels as absolute positioned React Native Text components for perfect Urdu shaping */}
      {data.map((d, i) => {
        const labelPt = getPoint(135, i * angleStep); // Push label slightly further out
        const scale = size / viewBoxSize;
        const actualX = labelPt.x * scale;
        const actualY = labelPt.y * scale;

        return (
          <View
            key={`label-rn-${i}`}
            style={{
              position: 'absolute',
              left: actualX - 60, // 120 width / 2
              top: actualY - 15,  // 30 height / 2
              width: 120,
              height: 30,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: isDark ? '#FFFFFF' : '#111111',
                fontSize: 11,
                fontWeight: '800',
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {language === 'ur' ? d.labelUr : language === 'ru' ? d.labelRu : d.labelEn}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const MenuItem = ({ icon: Icon, iconBg, iconColor, label, sublabel, onPress, cardBg, cardBorder, textColor, mutedColor, rightElement }) => {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';
  const labelAlign = isUrdu ? 'right' : 'left';
  const writingDir = isUrdu ? 'rtl' : 'ltr';
  return (
    <TouchableOpacity
      style={[styles.menuRow, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={[styles.menuIconBox, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <View style={[styles.menuText, { alignItems: 'flex-start' }]}>
        <Text style={[styles.menuLabel, { color: textColor, textAlign: 'left', writingDirection: 'ltr' }]}>{label}</Text>
        {sublabel && <Text style={[styles.menuSub, { color: mutedColor, textAlign: 'left', writingDirection: 'ltr' }]}>{sublabel}</Text>}
      </View>
      {rightElement ? rightElement : (
        <View style={isUrdu ? { transform: [{ rotate: '180deg' }] } : {}}>
          <ChevronRight size={16} color={mutedColor} />
        </View>
      )}
    </TouchableOpacity>
  );
};



const MeraAccountScreen = () => {
  const { colors, isDark } = useTheme();
  const { t, language, toUrduNumerals, translateLocation, translateName } = useLanguage();
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();
  const { userStats, complaints, localArea, activeDates = [], hasUsedMultipleLanguages } = useAppContext();
  const { requireInternet } = useNetwork();
  const screenWidth = Dimensions.get('window').width;
  const chartSize = Math.min(280, screenWidth - 70);
  const [showHistory, setShowHistory] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  const [showActivityModal, setShowActivityModal] = useState(false);
  const badgeFlatListRef = useRef(null);

  useEffect(() => {
    // Scroll reset is handled by giving ScrollView a key based on language
  }, [language]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showImpactInfoModal, setShowImpactInfoModal] = useState(false);
  const [showSkillTreeModal, setShowSkillTreeModal] = useState(false);
  const [showSkillTreeDetailsModal, setShowSkillTreeDetailsModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editProfession, setEditProfession] = useState(user?.profession || '');
  const [editTwitter, setEditTwitter] = useState(user?.twitter || '');
  const [editInstagram, setEditInstagram] = useState(user?.instagram || '');
  const [profileImage, setProfileImage] = useState(user?.image || null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const shareViewRef = useRef(null);

  const captureAndShare = async () => {
    setIsCapturing(true);
    setTimeout(async () => {
      try {
        const uri = await captureRef(shareViewRef, {
          format: 'png',
          quality: 0.9,
        });
        setIsCapturing(false);
        await RNShare.open({
          url: uri,
          title: language === 'ur' ? 'شیئر کریں' : 'Share Profile',
          message: language === 'ur' ? 'کراچی کمپلینٹ پورٹل پروفائل چیک کریں!' : 'Check out this Karachi Complaint Portal profile!',
        });
      } catch (error) {
        console.log('Error sharing:', error);
        setIsCapturing(false);
      }
    }, 100);
  };

  const handleChoosePhoto = () => {
    try {
      launchImageLibrary({ mediaType: 'photo', quality: 0.5, maxWidth: 800, maxHeight: 800 }, (response) => {
        if (response.assets && response.assets.length > 0) {
          setProfileImage(response.assets[0].uri);
        }
      });
    } catch (e) {
      console.warn("Image picker error:", e);
    }
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateProfile({
        name: editName,
        bio: editBio,
        profession: editProfession,
        twitter: editTwitter,
        instagram: editInstagram,
        image: profileImage
      });
      setShowEditProfile(false);
    } finally {
      setIsSaving(false);
    }
  };

  const CARD_BG = isDark ? colors.glass : colors.surface;
  const CARD_BORDER = isDark ? colors.glassBorder : colors.border;
  const MUTED = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,59,36,0.55)';
  const URDU_MUTED = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(11,59,36,0.85)';

  const xpPct = Math.min(100, Math.round((userStats.xp / Math.max(1, userStats.nextLevelXp)) * 100));
  const userComplaints = complaints.filter(c => c.isOwnReport === true);
  const myComplaints = userComplaints.length;

  const { currentStreak, longestStreak } = React.useMemo(() => {
    if (!activeDates || activeDates.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    // Sort dates ascending
    const sortedDates = [...activeDates].sort();
    
    let current = 1;
    let max = 1;
    let latestStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffTime = Math.abs(curr - prev);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        current += 1;
      } else if (diffDays > 1) {
        current = 1;
      }
      
      if (current > max) {
        max = current;
      }
    }

    // Compute current streak by checking if last active was today or yesterday
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    let d = new Date(today);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    const lastActive = sortedDates[sortedDates.length - 1];
    if (lastActive === todayStr || lastActive === yesterdayStr) {
      latestStreak = 1;
      for (let i = sortedDates.length - 1; i > 0; i--) {
        const curr = new Date(sortedDates[i]);
        const prev = new Date(sortedDates[i - 1]);
        const diffDays = Math.ceil(Math.abs(curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          latestStreak++;
        } else {
          break;
        }
      }
    } else {
      latestStreak = 0;
    }

    return { currentStreak: latestStreak, longestStreak: max };
  }, [activeDates]);

  const HEATMAP = React.useMemo(() => {
    const days = [];
    const dayNames = [
      { dayEn: 'S', dayUr: 'ا', fullEn: 'Sunday', fullUr: 'اتوار' },
      { dayEn: 'M', dayUr: 'پ', fullEn: 'Monday', fullUr: 'پیر' },
      { dayEn: 'T', dayUr: 'م', fullEn: 'Tuesday', fullUr: 'منگل' },
      { dayEn: 'W', dayUr: 'ب', fullEn: 'Wednesday', fullUr: 'بدھ' },
      { dayEn: 'T', dayUr: 'ج', fullEn: 'Thursday', fullUr: 'جمعرات' },
      { dayEn: 'F', dayUr: 'ج', fullEn: 'Friday', fullUr: 'جمعہ' },
      { dayEn: 'S', dayUr: 'ہ', fullEn: 'Saturday', fullUr: 'ہفتہ' },
    ];

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + diffToMonday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const dayIndex = d.getDay();
      
      const isFuture = d > today && d.toDateString() !== today.toDateString();
      
      days.push({
        ...dayNames[dayIndex],
        active: activeDates.includes(dateStr),
        isFuture
      });
    }
    return days;
  }, [activeDates]);

  const CAT_COLORS = {
    'Sewerage': '#3B82F6',
    'Broken Roads': '#F59E0B',
    'Waste': '#22C55E',
    'Kunda': '#EF4444',
    'Encroachment': '#8B5CF6'
  };

  const getLocalizedDesc = (desc, catName) => {
    if (language === 'en') return desc;
    if (desc && desc.startsWith('Reported issue in')) {
      return language === 'ru'
        ? `${catName} ki category mein shikayat darj ki gayi.`
        : `${catName} کے زمرے میں شکایت درج کی۔`;
    }
    return t(desc, { defaultValue: desc });
  };

  const getLocalizedStatus = (status) => {
    if (language === 'en') return status?.toUpperCase() || '';
    const s = status?.toLowerCase();
    if (language === 'ru') {
      if (s === 'pending') return 'Zair-e-Iltiwa';
      if (s === 'verified') return 'Tasdeeq Shuda';
      if (s === 'resolved') return 'Hal Shuda';
      return status?.toUpperCase();
    }
    if (s === 'pending') return 'زیر التوا';
    if (s === 'verified') return 'تصدیق شدہ';
    if (s === 'resolved') return 'حل شدہ';
    return status?.toUpperCase();
  };



  const getBadgeName = (name) => {
    if (language === 'en') return name;
    if (language === 'ru') {
      const romanMap = {
        'First Report': 'Pehli Report', 'Verified 10': '10 Tasdeeqein', 'Local Hero': 'Muqami Hero',
        'Early Adopter': 'Ibtidai Rukan', 'Pothole Patrol': 'Garhay ki Ittila', 'Streak Master': 'Streak Master',
        'Active Citizen': 'Faal Shehri', 'Green Thumb': 'Green Thumb', 'Sharp Eye': 'Tez Nazar',
        'K-Electric Nemesis': 'K-Electric ka Dushman', 'Daily Grinder': 'Daily Grinder', 'Water Saver': 'Pani Bachanay Wala',
        'Traffic Warden': 'Traffic Warden', 'Clean City': 'Saaf Sheher', 'Trusted Voice': 'Qabil-e-Aitmaad Awaz',
        'Helpful Hand': 'Madadgar Hath', 'Bronze Contributor': 'Bronze Contributor', 'Silver Contributor': 'Silver Contributor',
        'Gold Contributor': 'Gold Contributor', 'Global Champion': 'Aalmi Champion', 'Civic Heart': 'Shehri Dil',
        'Early Bird': 'Early Bird', 'Precision': 'Durustgi', 'Connected': 'Munsalik', 'Safety First': 'Safety First',
        'Emergency': 'Hangaami Halat', 'Planter': 'Poday Laganay Wala', 'Loudspeaker': 'Loudspeaker',
        'Pioneer': 'Pahal Karne Wala', 'Fixer Upper': 'Murammat Kuninda', 'Commuter': 'Musafir',
        'Voucher Hunter': 'Voucher Shikari', 'Explorer': 'Daryaft Kuninda',
        'Night Owl': 'Night Owl', 'Weekend Warrior': 'Weekend Warrior', 'Neighborhood Watch': 'Mahallay ki Nigrani',
        'Animal Savior': 'Janwaron ka Muhafiz', 'Rain Ready': 'Barish ke liye Tayyar', 'Pedestrian First': 'Paidal Chalnay Walon ki Tarjeeh',
        'Heritage Guard': 'Virsa Muhafiz', 'Feedback Pro': 'Feedback Pro', 'Super Sharer': 'Super Sharer', 'Unstoppable': 'Na-Qabil-e-Taskheer',
        'Early Voter': 'Ibtidai Voter', 'Patience': 'Sabr', 'Multi-Lingual': 'Kaseer-ul-Lisani', 'Night Watch': 'Night Watch',
        'First Responder': 'First Responder', 'Photographer': 'Photographer', 'Guardian': 'Muhafiz',
        'Master Contributor': 'Mahir Sharakat Dar', 'Century Club': 'Century Club', 'Legendary Streak': 'Legendary Streak',
        'Community Pillar': 'Community ka Sutoon', 'Elite Verifier': 'Elite Tasdeeq Kuninda', 'Zone Master': 'Zone Master',
        'Super Photographer': 'Super Photographer', 'City Savior': 'Sheher ka Muhafiz', 'Flawless Precision': 'Be-Aib Durustgi',
        'Year of Service': 'Ek Saal ki Khidmat',
        'Road Master': 'Road Master', 'Park Ranger': 'Park Ranger', 'Kunda Buster': 'Kunda Buster', 'Leak Detective': 'Leak Detective', 'Traffic Controller': 'Traffic Controller', 'Waste Warrior': 'Waste Warrior', 'Clear Path': 'Clear Path', 'Consistent Reporter': 'Mustaqil Reporter', 'Avid Reporter': 'Shouqeen Reporter', 'Civic Legend': 'Shehri Legend', 'Respected Citizen': 'Moaziz Shehri', 'Community Leader': 'Community Leader', 'Local Authority': 'Muqami Ikhtiyar', 'Two-Week Streak': 'Do Haftay ki Streak', 'Fifty-Day Streak': 'Pachas Din ki Streak', 'Level 15 Reached': 'Level 15 par Pohnchay', 'Level 20 Reached': 'Level 20 par Pohnchay', 'Level 30 Reached': 'Level 30 par Pohnchay', 'Platinum Contributor': 'Platinum Contributor', 'Diamond Contributor': 'Diamond Contributor', 'Grandmaster': 'Grandmaster',
      };
      return romanMap[name] || name;
    }
    const map = {
      'First Report': 'پہلی رپورٹ', 'Verified 10': '10 تصدیقیں', 'Local Hero': 'مقامی ہیرو',
      'Early Adopter': 'ابتدائی رکن', 'Pothole Patrol': 'گڑھے کی اطلاع', 'Streak Master': 'اسٹریک ماسٹر',
      'Active Citizen': 'فعال شہری', 'Green Thumb': 'گرین تھمب', 'Sharp Eye': 'تیز نظر',
      'K-Electric Nemesis': 'کے-الیکٹرک کا دشمن', 'Daily Grinder': 'ڈیلی گرائنڈر', 'Water Saver': 'پانی بچانے والا',
      'Traffic Warden': 'ٹریفک وارڈن', 'Clean City': 'صاف شہر', 'Trusted Voice': 'قابلِ اعتماد آواز',
      'Helpful Hand': 'مددگار ہاتھ', 'Bronze Contributor': 'کانسی کا شراکت دار', 'Silver Contributor': 'چاندی کا شراکت دار',
      'Gold Contributor': 'سونے کا شراکت دار', 'Global Champion': 'عالمی چیمپئن', 'Civic Heart': 'شہری دل',
      'Early Bird': 'ارلی برڈ', 'Precision': 'درستگی', 'Connected': 'منسلک', 'Safety First': 'سیفٹی فرسٹ',
      'Emergency': 'ہنگامی حالت', 'Planter': 'پودے لگانے والا', 'Loudspeaker': 'لاؤڈ اسپیکر',
      'Pioneer': 'پہل کرنے والا', 'Fixer Upper': 'مرمت کنندہ', 'Commuter': 'مسافر',
      'Voucher Hunter': 'واؤچر شکاری', 'Explorer': 'دریافت کنندہ',
      'Night Owl': 'نائٹ آؤل', 'Weekend Warrior': 'ویک اینڈ واریئر', 'Neighborhood Watch': 'نیبرہوڈ واچ',
      'Animal Savior': 'اینیمل سیویئر', 'Rain Ready': 'رین ریڈی', 'Pedestrian First': 'پیدل چلنے والوں کی ترجیح',
      'Heritage Guard': 'ورثہ محافظ', 'Feedback Pro': 'فیڈبیک پرو', 'Super Sharer': 'سپر شیئرر', 'Unstoppable': 'ناقابل تسخیر',
      'Early Voter': 'ابتدائی ووٹر', 'Patience': 'صبر', 'Multi-Lingual': 'کثیر اللسانی', 'Night Watch': 'نائٹ واچ',
      'First Responder': 'فرسٹ ریسپانڈر', 'Photographer': 'فوٹوگرافر', 'Guardian': 'محافظ',
      'Master Contributor': 'ماہر شراکت دار', 'Century Club': 'سینچری کلب', 'Legendary Streak': 'لیجنڈری اسٹریک',
      'Community Pillar': 'کمیونٹی کا ستون', 'Elite Verifier': 'ایلیٹ تصدیق کنندہ', 'Zone Master': 'زون ماسٹر',
      'Super Photographer': 'سپر فوٹوگرافر', 'City Savior': 'شہر کا محافظ', 'Flawless Precision': 'بے عیب درستگی',
      'Year of Service': 'ایک سال کی خدمت',
      'Road Master': 'روڈ ماسٹر', 'Park Ranger': 'پارک رینجر', 'Kunda Buster': 'کنڈا بسٹر', 'Leak Detective': 'لیک جاسوس', 'Traffic Controller': 'ٹریفک کنٹرولر', 'Waste Warrior': 'ویسٹ واریئر', 'Clear Path': 'واضح راستہ', 'Consistent Reporter': 'مستقل رپورٹر', 'Avid Reporter': 'شوقین رپورٹر', 'Civic Legend': 'شہری لیجنڈ', 'Respected Citizen': 'معزز شہری', 'Community Leader': 'کمیونٹی لیڈر', 'Local Authority': 'مقامی اختیار', 'Two-Week Streak': 'دو ہفتے کی اسٹریک', 'Fifty-Day Streak': 'پچاس دن کی اسٹریک', 'Level 15 Reached': 'لیول 15 تک پہنچ گئے', 'Level 20 Reached': 'لیول 20 تک پہنچ گئے', 'Level 30 Reached': 'لیول 30 تک پہنچ گئے', 'Platinum Contributor': 'پلاٹینم کنٹری بیوٹر', 'Diamond Contributor': 'ڈائمنڈ کنٹری بیوٹر', 'Grandmaster': 'گرینڈ ماسٹر',
    };
    return map[name] || name;
  };

  const getBadgeDesc = (desc) => {
    if (language === 'en') return desc;
    if (language === 'ru') {
      const romanMap = {
        'Reported your first issue.': 'Aap ki pehli shikayat darj ki.',
        'Received 10 verifications on your reports.': '10 muqami shikayat ki tasdeeq ki.',
        'Reached Level 5.': 'Level 5 tak pohnch gaye.',
        'Joined during KCP launch.': 'KCP launch ke doran shamil hue.',
        'Reported 5 road issues.': '5 sarak ke masail ki ittila di.',
        'Maintained a 7-day streak.': '7 din ka tasalsul barqarar rakha.',
        'Earned 10,000 XP total.': 'Kul 10,000 XP hasil kiye.',
        'Reported 3 park issues.': 'Park ke 3 masail ki ittila di.',
        'Reported 10 issues with photos.': 'Masail ki 10 tasaveer upload ki.',
        'Reported 15 power/kunda issues.': 'Bijli/kunda ke 15 masail ki ittila di.',
        'Logged in for 30 consecutive days.': 'Musalsal 30 din tak log in kiya.',
        'Reported 5 water/sewerage issues.': 'Pani ke rissao ki 5 shikayat darj ki.',
        'Reported 10 traffic signal issues.': '10 traffic signal ke masail ki ittila di.',
        'Reported 20 waste management issues.': 'Kachray ke 20 masail ki ittila di.',
        'Received 50 verifications on your reports.': 'Aap ki 50 reports ki dusron ne tasdeeq ki.',
        'Verified 100 community reports.': 'Community ki 100 reports ki tasdeeq ki.',
        'Earned 1,000 XP.': '1,000 XP hasil kiye.',
        'Earned 3,000 XP.': '3,000 XP hasil kiye.',
        'Earned 5,000 XP.': '5,000 XP hasil kiye.',
        'Earned 20,000 XP.': '20,000 XP hasil kiye.',
        'Earned 35,000 XP.': '35,000 XP hasil kiye.',
        'Earned 50,000 XP.': '50,000 XP hasil kiye.',
        'Earned 75,000 XP.': '75,000 XP hasil kiye.',
        'Earned 100,000 XP.': '100,000 XP hasil kiye.',
        'Reached Level 8.': 'Level 8 tak pohnch gaye.',
        'Reached Level 10.': 'Level 10 tak pohnch gaye.',
        'Reached Level 15.': 'Level 15 tak pohnch gaye.',
        'Reached Level 20.': 'Level 20 tak pohnch gaye.',
        'Reached Level 25.': 'Level 25 tak pohnch gaye.',
        'Reached Level 30.': 'Level 30 tak pohnch gaye.',
        'Used the app for 6 months.': 'App ko 6 mahinay tak istemal kiya.',
        'Used the app for 1 year.': 'App ko 1 saal tak istemal kiya.',
        'Reported 15 road issues.': 'Sarak ke 15 masail ki ittila di.',
        'Reported 50 pinned issues.': '50 pin kiye gaye masail ki ittila di.',
        'Reported 200 pinned issues.': '200 pin kiye gaye masail ki ittila di.',
        'Reported 10 park issues.': 'Park ke 10 masail ki ittila di.',
        'Reported 30 power/kunda issues.': 'Bijli/kunda ke 30 masail ki ittila di.',
        'Reported 15 water/sewerage issues.': 'Pani ke rissao ki 15 shikayat darj ki.',
        'Reported 25 traffic signal issues.': '25 traffic signal ke masail ki ittila di.',
        'Reported 50 waste management issues.': 'Kachray ke 50 masail ki ittila di.',
        'Reported 5 blocked footpaths.': '5 band footpaths ki shikayat darj ki.',
        'Reported 15 blocked footpaths.': '15 band footpaths ki shikayat darj ki.',
        'Reported 25 total issues.': 'Kul 25 masail ki ittila di.',
        'Reported 75 total issues.': 'Kul 75 masail ki ittila di.',
        'Reported 100 issues.': '100 masail ki ittila di.',
        'Reported 150 total issues.': 'Kul 150 masail ki ittila di.',
        'Reported 50 issues with photos.': 'Masail ki 50 tasaveer upload ki.',
        'Reported 150 issues with photos.': 'Masail ki 150 tasaveer upload ki.',
        'Received 100 verifications on your reports.': 'Aap ki 100 reports ki dusron ne tasdeeq ki.',
        'Received 250 verifications on your reports.': 'Aap ki 250 reports ki dusron ne tasdeeq ki.',
        'Received 500 verifications on your reports.': 'Aap ki 500 reports ki dusron ne tasdeeq ki.',
        'Verified 50 issues in your area.': 'Apne ilaqay mein 50 shikayat ki tasdeeq ki.',
        'Verified 200 local issues.': '200 muqami shikayat ki tasdeeq ki.',
        'Verified 500 community reports.': 'Community ki 500 reports ki tasdeeq ki.',
        'Maintained a 14-day streak.': '14 din ka tasalsul barqarar rakha.',
        'Maintained a 50-day streak.': '50 din ka tasalsul barqarar rakha.',
        'Maintained a 100-day streak.': '100 din ka tasalsul barqarar rakha.',
        'Reached a 30-day reporting streak.': 'Musalsal 30 din tak report karne ka tasalsul barqarar rakha.',
        'Had a pending report for 30 days.': 'Hal ke liye 30 din intezar kiya.',
        'Used app in English and Urdu.': 'Angrezi aur Urdu mein app istemal ki.'
      };
      return romanMap[desc] || desc;
    }
    const map = {
      'Reported your first issue.': 'آپ کی پہلی شکایت درج کی۔',
      'Received 10 verifications on your reports.': '10 مقامی شکایات کی تصدیق کی۔',
      'Reached Level 5.': 'لیول 5 تک پہنچ گئے۔',
      'Joined during KCP launch.': 'کے سی پی لانچ کے دوران شامل ہوئے۔',
      'Reported 5 road issues.': '5 سڑک کے مسائل کی اطلاع دی۔',
      'Maintained a 7-day streak.': '7 دن کا تسلسل برقرار رکھا۔',
      'Earned 10,000 XP total.': 'کل 10,000 XP حاصل کیے۔',
      'Reported 3 park issues.': 'پارک کے 3 مسائل کی اطلاع دی۔',
      'Reported 10 issues with photos.': 'مسائل کی 10 تصاویر اپ لوڈ کیں۔',
      'Reported 15 power/kunda issues.': 'بجلی/کنڈا کے 15 مسائل کی اطلاع دی۔',
      'Logged in for 30 consecutive days.': 'مسلسل 30 دن تک لاگ ان کیا۔',
      'Reported 5 water/sewerage issues.': 'پانی کے رساؤ کی 5 شکایات درج کیں۔',
      'Reported 10 traffic signal issues.': '10 ٹریفک سگنل کے مسائل کی اطلاع دی۔',
      'Reported 20 waste management issues.': 'کچرے کے 20 مسائل کی اطلاع دی۔',
      'Received 50 verifications on your reports.': 'آپ کی 50 رپورٹس کی دوسروں نے تصدیق کی۔',
      'Verified 100 community reports.': 'کمیونٹی کی 100 رپورٹس کی تصدیق کی۔',
      'Earned 1,000 XP.': '1,000 XP حاصل کیے۔',
      'Earned 3,000 XP.': '3,000 XP حاصل کیے۔',
      'Earned 5,000 XP.': '5,000 XP حاصل کیے۔',
      'Earned 20,000 XP.': '20,000 XP حاصل کیے۔',
      'Earned 35,000 XP.': '35,000 XP حاصل کیے۔',
      'Earned 50,000 XP.': '50,000 XP حاصل کیے۔',
      'Earned 75,000 XP.': '75,000 XP حاصل کیے۔',
      'Earned 100,000 XP.': '100,000 XP حاصل کیے۔',
      'Reached Level 8.': 'لیول 8 تک پہنچ گئے۔',
      'Reached Level 10.': 'لیول 10 تک پہنچ گئے۔',
      'Reached Level 15.': 'لیول 15 تک پہنچ گئے۔',
      'Reached Level 20.': 'لیول 20 تک پہنچ گئے۔',
      'Reached Level 25.': 'لیول 25 تک پہنچ گئے۔',
      'Reached Level 30.': 'لیول 30 تک پہنچ گئے۔',
      'Used the app for 6 months.': 'ایپ کو 6 مہینے تک استعمال کیا۔',
      'Used the app for 1 year.': 'ایپ کو 1 سال تک استعمال کیا۔',
      'Reported 15 road issues.': 'سڑک کے 15 مسائل کی اطلاع دی۔',
      'Reported 50 pinned issues.': '50 پن کیے گئے مسائل کی اطلاع دی۔',
      'Reported 200 pinned issues.': '200 پن کیے گئے مسائل کی اطلاع دی۔',
      'Reported 10 park issues.': 'پارک کے 10 مسائل کی اطلاع دی۔',
      'Reported 30 power/kunda issues.': 'بجلی/کنڈا کے 30 مسائل کی اطلاع دی۔',
      'Reported 15 water/sewerage issues.': 'پانی کے رساؤ کی 15 شکایات درج کیں۔',
      'Reported 25 traffic signal issues.': '25 ٹریفک سگنل کے مسائل کی اطلاع دی۔',
      'Reported 50 waste management issues.': 'کچرے کے 50 مسائل کی اطلاع دی۔',
      'Reported 5 blocked footpaths.': '5 بند فٹ پاتھوں کی شکایت درج کی۔',
      'Reported 15 blocked footpaths.': '15 بند فٹ پاتھوں کی شکایت درج کی۔',
      'Reported 25 total issues.': 'کل 25 مسائل کی اطلاع دی۔',
      'Reported 75 total issues.': 'کل 75 مسائل کی اطلاع دی۔',
      'Reported 100 issues.': '100 مسائل کی اطلاع دی۔',
      'Reported 150 total issues.': 'کل 150 مسائل کی اطلاع دی۔',
      'Reported 50 issues with photos.': 'مسائل کی 50 تصاویر اپ لوڈ کیں۔',
      'Reported 150 issues with photos.': 'مسائل کی 150 تصاویر اپ لوڈ کیں۔',
      'Received 100 verifications on your reports.': 'آپ کی 100 رپورٹس کی دوسروں نے تصدیق کی۔',
      'Received 250 verifications on your reports.': 'آپ کی 250 رپورٹس کی دوسروں نے تصدیق کی۔',
      'Received 500 verifications on your reports.': 'آپ کی 500 رپورٹس کی دوسروں نے تصدیق کی۔',
      'Verified 50 issues in your area.': 'اپنے علاقے میں 50 شکایات کی تصدیق کی۔',
      'Verified 200 local issues.': '200 مقامی شکایات کی تصدیق کی۔',
      'Verified 500 community reports.': 'کمیونٹی کی 500 رپورٹس کی تصدیق کی۔',
      'Maintained a 14-day streak.': '14 دن کا تسلسل برقرار رکھا۔',
      'Maintained a 50-day streak.': '50 دن کا تسلسل برقرار رکھا۔',
      'Maintained a 100-day streak.': '100 دن کا تسلسل برقرار رکھا۔',
      'Reached a 30-day reporting streak.': 'مسلسل 30 دن تک رپورٹ کرنے کا تسلسل برقرار رکھا۔',
      'Had a pending report for 30 days.': 'حل کے لیے 30 دن انتظار کیا۔',
      'Used app in English and Urdu.': 'انگریزی اور اردو میں ایپ استعمال کی۔'
    };
    return map[desc] || desc;
  };

  // Use the single source-of-truth badge hook (same data the notification engine in MainTabNavigator uses)
  const BADGES = useBadges();

  // Generate 16 weeks (around 4 months) of Github style heatmap data based on real user activity
  const EXTENDED_HEATMAP = React.useMemo(() => {
    const counts = {};
    userComplaints.forEach(c => {
      const d = new Date(c.timestamp);
      d.setHours(0,0,0,0);
      const dateKey = d.getTime();
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });

    const today = new Date();
    today.setHours(0,0,0,0);
    // Find the next Saturday to make the grid align with week ends
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + (6 - today.getDay()));
    
    const numDays = 112; // 16 weeks * 7 days
    return Array.from({ length: numDays }).map((_, i) => {
      const d = new Date(nextSaturday.getTime() - (numDays - 1 - i) * 24 * 60 * 60 * 1000);
      if (d.getTime() > today.getTime()) return 0; // Future days
      
      const count = counts[d.getTime()] || 0;
      if (count === 0) return 0;
      if (count === 1) return 1;
      if (count <= 3) return 2;
      return 3;
    });
  }, [userComplaints]);

  const getHeatColor = (intensity) => {
    if (intensity === 0) return isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    if (intensity === 1) return isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.4)';
    if (intensity === 2) return isDark ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.7)';
    return colors.primary;
  };

  const MONTH_LABELS = React.useMemo(() => {
    const labels = [];
    const today = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const en = d.toLocaleString('en-US', { month: 'short' });
      const urMap = { 'Jan': 'جنوری', 'Feb': 'فروری', 'Mar': 'مارچ', 'Apr': 'اپریل', 'May': 'مئی', 'Jun': 'جون', 'Jul': 'جولائی', 'Aug': 'اگست', 'Sep': 'ستمبر', 'Oct': 'اکتوبر', 'Nov': 'نومبر', 'Dec': 'دسمبر' };
      labels.push({ en, ur: urMap[en] || en });
    }
    return labels;
  }, []);

  const calculateRadarData = () => {
    // Environment
    const envCount = userComplaints.filter(c => c.category === 'Waste' || c.category === 'Park' || c.category === 'Parks').length;
    const envScore = envCount * 25; // 4 issues to max

    // Infrastructure
    const infraCount = userComplaints.filter(c => ['Broken Roads', 'Sewerage', 'Water', 'Kunda', 'Traffic'].includes(c.category)).length;
    const infraScore = infraCount * 15; // ~7 issues to max

    // Detective
    const verifications = userComplaints.reduce((sum, c) => sum + (c.verifiedCount || 0), 0);
    const verificationScore = verifications * 10; // 10 verifications to max

    // Community
    const badgesEarned = BADGES.filter(b => b.earned).length;
    const communityScore = ((currentStreak || 0) * 5) + (badgesEarned * 5); // 10 day streak + 10 badges to max

    // Vigilance
    const vigilanceScore = myComplaints * 10; // 10 total complaints to max
    
    // Use Math.max(5, ...) so the chart doesn't completely disappear, but reflects 0 data closely
    return [
      { labelEn: 'Environment', labelUr: 'ماحولیات', labelRu: 'Maholiyat', value: Math.min(100, Math.max(5, envScore)) },
      { labelEn: 'Infrastructure', labelUr: 'بنیادی ڈھانچہ', labelRu: 'Infrastructure', value: Math.min(100, Math.max(5, infraScore)) },
      { labelEn: 'Detective', labelUr: 'تفتیش کار', labelRu: 'Tafteesh Kar', value: Math.min(100, Math.max(5, verificationScore)) },
      { labelEn: 'Community', labelUr: 'کمیونٹی', labelRu: 'Community', value: Math.min(100, Math.max(5, communityScore)) },
      { labelEn: 'Vigilance', labelUr: 'چوکسی', labelRu: 'Choksi', value: Math.min(100, Math.max(5, vigilanceScore)) },
    ];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={{ flexShrink: 1, paddingRight: 10 }}>
            <Text style={[styles.screenLabel, { color: colors.primary }]} numberOfLines={1}>{t('kcpProfile')}</Text>
            <Text
              style={[styles.pageTitle, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t('myAccount')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: CARD_BG, borderColor: CARD_BORDER, flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 9, width: 'auto', borderRadius: 24 }]}
              onPress={() => requireInternet(() => setShowShareCard(true))}
            >
              <Share2 size={16} color={isDark ? MUTED : '#111111'} />
              <Text style={{ color: isDark ? MUTED : '#111111', fontSize: 12.5, fontWeight: '800' }} numberOfLines={1}>{language === 'ur' ? 'شیئر' : 'Share'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: CARD_BG, borderColor: CARD_BORDER, flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 9, width: 'auto', borderRadius: 24 }]}
              onPress={() => requireInternet(() => setShowEditProfile(true))}
            >
              <Edit2 size={16} color={isDark ? MUTED : '#111111'} />
              <Text style={{ color: isDark ? MUTED : '#111111', fontSize: 12.5, fontWeight: '800' }} numberOfLines={1}>{language === 'ur' ? 'ترمیم' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile hero */}
          <View style={[styles.profileHero, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
            {/* Avatar */}
            <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%', borderRadius: 99 }} />
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: colors.primaryGlow }]}>
                  <User size={36} color={colors.primary} />
                </View>
              )}
              <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.levelBadgeText}>{toUrduNumerals(userStats.level)}</Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {language === 'ur' ? (user?.name_ur || translateName(user?.name) || user?.email?.split('@')[0]) : (translateName(user?.name) || user?.email?.split('@')[0] || t('citizen'))}
              </Text>
              <Text style={[styles.userRank, { color: colors.primary }]}>
                {userStats.level < 3 ? (language === 'ur' ? 'نیا شہری' : 'New Citizen') : userStats.level < 6 ? (language === 'ur' ? 'برونز شہری' : 'Bronze Citizen') : userStats.level < 10 ? (language === 'ur' ? 'سلور شہری' : 'Silver Citizen') : (language === 'ur' ? 'گولڈ شہری' : 'Gold Citizen')}
              </Text>

              {/* XP bar */}
              <View style={styles.xpSection}>
                <View style={styles.xpTopRow}>
                  <Text style={[styles.xpLabel, { color: MUTED }]}>
                    {t('lvXp', { level: toUrduNumerals(userStats.level), xp: toUrduNumerals(userStats.xp), next: toUrduNumerals(userStats.nextLevelXp) })}
                  </Text>
                  <Text style={[styles.xpPct, { color: colors.primary }]}>{toUrduNumerals(xpPct)}%</Text>
                </View>
                <View style={[styles.xpTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,94,43,0.10)' }]}>
                  <View style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            </View>
          </View>

          {/* 3-column stats */}
          <View style={styles.statsRow}>
            {[
              { icon: CheckCircle2, bg: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', color: '#3B82F6', val: toUrduNumerals(myComplaints), label: t('reports') },
              { icon: Award, bg: isDark ? 'rgba(34,197,94,0.12)' : '#F0FDF4', color: colors.primary, val: toUrduNumerals(userStats.xp.toLocaleString()), label: t('xp') },
              { icon: Wallet, bg: isDark ? 'rgba(245,158,11,0.15)' : '#FEFCE8', color: '#F59E0B', val: toUrduNumerals(Math.floor(userStats.cityCredits).toLocaleString()), label: t('credits') },
            ].map(({ icon: Icon, bg, color, val, label }) => (
              <View key={label} style={[styles.statCard, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
                <View style={[styles.statIconBox, { backgroundColor: bg }]}>
                  <Icon size={18} color={color} />
                </View>
                <Text style={[styles.statVal, { color: colors.text }]}>{val}</Text>
                <Text style={[styles.statLabel, { color: MUTED }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Contribution card */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: MUTED }]}>{t('contribution')}</Text>
            <View style={[styles.contribCard, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
              {(() => {
                const trustScore = userStats?.trustScore ?? (myComplaints === 0 ? 0 : Math.min(98, 70 + (userStats?.level * 2)));
                const trustTier = userStats?.trustTier ?? (myComplaints === 0 ? 'Evaluating' : (trustScore >= 95 ? 'Elite' : trustScore >= 85 ? 'Trusted' : trustScore >= 75 ? 'Good' : 'Fair'));
                
                const impactScore = userStats?.impactScore ?? (myComplaints === 0 ? 100 : Math.max(1, 50 - (userStats?.level * 2)));
                const impactTier = userStats?.impactTier ?? (myComplaints === 0 ? 'Newcomer' : (impactScore <= 10 ? 'Leader' : impactScore <= 30 ? 'Influential' : 'Active'));

                const getLocalizedTrustTier = (tier) => {
                  if (language === 'ur') {
                    if (tier === 'Evaluating') return 'جائزہ جاری ہے';
                    if (tier === 'Fair') return 'تسلی بخش';
                    if (tier === 'Good') return 'اچھا';
                    if (tier === 'Trusted') return 'قابلِ اعتماد';
                    if (tier === 'Elite') return 'اعلیٰ';
                  }
                  return tier;
                };

                const getLocalizedImpactTier = (tier) => {
                  if (language === 'ur') {
                    if (tier === 'Newcomer') return 'نئے صارف';
                    if (tier === 'Active') return 'فعال';
                    if (tier === 'Influential') return 'بااثر';
                    if (tier === 'Leader') return 'رہنما';
                  }
                  return tier;
                };

                return [
                  { 
                    icon: ShieldCheck, 
                    label: language === 'ur' ? 'ٹرسٹ اسکور' : 'Trust Score', 
                    sub: language === 'ur' ? (myComplaints === 0 ? 'نئے صارف' : `${toUrduNumerals(trustScore)}% درستگی`) : (myComplaints === 0 ? 'New User' : `${trustScore}% Accuracy`), 
                    val: getLocalizedTrustTier(trustTier) 
                  },
                  { 
                    icon: MapPin, 
                    label: language === 'ur' ? 'علاقائی اثر' : 'Neighborhood Impact', 
                    sub: language === 'ur' ? (myComplaints === 0 ? 'نئے علاقے میں خوش آمدید' : `${t(localArea)} میں ٹاپ ${toUrduNumerals(impactScore)}%`) : (myComplaints === 0 ? 'Welcome to your area' : `Top ${impactScore}% in ${t(localArea)}`), 
                    val: getLocalizedImpactTier(impactTier) 
                  },
                ].map((item, i, arr) => (
                <View key={item.label}>
                  <View style={styles.contribRow}>
                    <View style={[styles.contribIconBox, { backgroundColor: colors.primaryGlow }]}>
                      <item.icon size={16} color={colors.primary} />
                    </View>
                    <View style={styles.contribInfo}>
                      <Text style={[styles.contribLabel, { color: colors.text, textAlign: 'auto' }]}>{item.label}</Text>
                      <Text style={[styles.contribSub, { color: MUTED, textAlign: 'auto' }]}>{item.sub}</Text>
                    </View>
                    <Text style={[styles.contribVal, { color: colors.primary }]}>{item.val}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: CARD_BORDER }]} />}
                </View>
              ));
              })()}
            </View>
          </View>

          {/* Weekly Heatmap */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => setShowActivityModal(true)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.sectionTitle, { color: MUTED, marginBottom: 0 }]}>{t('activityStreak')}</Text>
                <Info size={14} color={MUTED} style={{ marginBottom: -2 }} />
              </View>
              <View style={[styles.streakPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEFCE8' }]}>
                <Flame size={14} color="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{toUrduNumerals(currentStreak)} {language === 'ur' ? 'دن' : currentStreak === 1 ? 'Day' : 'Days'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.heatmapCard, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]} onPress={() => setShowMonthlyModal(true)} activeOpacity={0.8}>
              {HEATMAP.map((d, i) => (
                <TouchableOpacity key={i} style={[styles.heatCol, { flex: 1, position: 'relative' }]} activeOpacity={d.isFuture ? 1 : 0.2} onPress={() => {
                  setSelectedHeatmapDay(d);
                }}>
                  <View style={{ alignItems: 'center', width: '100%', position: 'relative' }}>
                    {/* Minimal Connection Line - Immune to RTL/LTR issues using 'start' */}
                    {i > 0 && d.active && HEATMAP[i-1].active && (
                      <View style={{ position: 'absolute', start: '-50%', width: '100%', height: 4, backgroundColor: colors.primary, top: 14, zIndex: -1, borderRadius: 2, opacity: 0.7 }} />
                    )}
                    <View style={[
                      styles.heatNode,
                      { backgroundColor: d.active ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') }
                    ]} />
                  </View>
                  <Text style={[styles.heatDay, { color: isDark ? MUTED : '#111111', marginTop: 6 }]}>{language === 'ur' ? d.dayUr : d.dayEn}</Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </View>

          {/* Badges */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => setShowBadgeModal(true)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.sectionTitle, { color: MUTED, marginBottom: 0 }]}>{t('civicBadges')}</Text>
                <Info size={14} color={MUTED} style={{ marginBottom: -2 }} />
              </View>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{toUrduNumerals(BADGES.filter(b => b.earned).length)}/{toUrduNumerals(BADGES.length)}</Text>
            </TouchableOpacity>
            {(() => {
              // For Urdu: reverse sort so earned badges are at the end of array,
              // then use row-reverse flexDirection so they appear on the RIGHT side first.
              // For English: earned badges first, left-to-right.
              const isUrdu = language === 'ur';
              const sortedBadges = [...BADGES].sort((a, b) => {
                if (isUrdu) {
                  // Urdu: unearned first in array → row-reverse puts earned on the right
                  return a.earned === b.earned ? 0 : a.earned ? 1 : -1;
                }
                // English/Roman Urdu: earned first, left-to-right
                return a.earned === b.earned ? 0 : a.earned ? -1 : 1;
              });
              return (
                <ScrollView
                  key={language}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    gap: 12,
                    paddingHorizontal: 0,
                    flexDirection: isUrdu ? 'row-reverse' : 'row',
                  }}
                >
                  {sortedBadges.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <TouchableOpacity
                        key={badge.id}
                        activeOpacity={0.7}
                        onPress={() => setSelectedBadge(badge)}
                        style={[
                          styles.badgeCard,
                          { backgroundColor: badge.earned ? colors.primaryGlow : CARD_BG, borderColor: badge.earned ? colors.primary : CARD_BORDER },
                        ]}
                      >
                        <View style={[styles.badgeIconBox, { backgroundColor: badge.earned ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }]}>
                          <Icon size={20} color={badge.earned ? '#fff' : MUTED} />
                        </View>
                        <Text style={[styles.badgeName, { color: badge.earned ? colors.text : MUTED }]}>{toUrduNumerals(getBadgeName(badge.name))}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              );
            })()}
          </View>

          {/* Civic Skill Tree */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => setShowSkillTreeModal(true)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.sectionTitle, { color: MUTED, marginBottom: 0 }]}>{language === 'ur' ? 'شہری مہارتیں' : language === 'ru' ? 'Shehri Maharatein' : 'Civic Skill Tree'}</Text>
                <Info size={14} color={MUTED} style={{ marginBottom: -2 }} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contribCard, { backgroundColor: CARD_BG, borderColor: CARD_BORDER, padding: 16 }]} onPress={() => setShowSkillTreeDetailsModal(true)} activeOpacity={0.8}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 10, opacity: 0.8 }}>
                {language === 'ur' ? 'آپ کا شہری پروفائل کتنا متوازن ہے؟' : language === 'ru' ? 'Aap ka shehri profile kitna mutawazin hai?' : 'How balanced is your civic profile?'}
              </Text>
              <RadarChart data={calculateRadarData()} size={chartSize} colors={colors} isDark={isDark} language={language} />
            </TouchableOpacity>
          </View>

          {/* Civic Impact Portfolio */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => setShowImpactInfoModal(true)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.sectionTitle, { color: MUTED, marginBottom: 0 }]}>{language === 'ur' ? 'شہری اثر کا پورٹ فولیو' : language === 'ru' ? 'Shehri Asar ka Portfolio' : 'Civic Impact Portfolio'}</Text>
                <Info size={14} color={MUTED} style={{ marginBottom: -2 }} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contribCard, { backgroundColor: CARD_BG, borderColor: CARD_BORDER, padding: 16 }]} onPress={() => setShowPortfolioModal(true)} activeOpacity={0.8}>
              {Object.entries(CAT_COLORS).map(([cat, color], i, arr) => {
                const count = userComplaints.filter(c => c.category === cat).length;
                if (count === 0 && myComplaints > 0) return null;
                const pct = myComplaints === 0 ? 0 : Math.round((count / myComplaints) * 100);
                const catName = language === 'ur' ? (
                  cat === 'Broken Roads' ? 'ٹوٹی سڑکیں' :
                  cat === 'Sewerage' ? 'سیوریج' :
                  cat === 'Waste' ? 'کچرا' :
                  cat === 'Kunda' ? 'کنڈا' :
                  cat === 'Encroachment' ? 'تجاوزات' : cat
                ) : language === 'ru' ? (
                  cat === 'Broken Roads' ? 'Toti Sarkain' :
                  cat === 'Sewerage' ? 'Sewerage' :
                  cat === 'Waste' ? 'Kachra' :
                  cat === 'Kunda' ? 'Kunda' :
                  cat === 'Encroachment' ? 'Tajaawuzaat' : cat
                ) : cat;
                return (
                  <View key={cat} style={{ marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{catName}</Text>
                      <Text style={{ color: MUTED, fontSize: 12, fontWeight: '600' }}>{toUrduNumerals(count)} ({toUrduNumerals(pct)}%)</Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                      <View style={{ height: 8, borderRadius: 4, width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
                    </View>
                  </View>
                );
              })}
            </TouchableOpacity>
          </View>

          {/* Menu */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: MUTED }]}>{t('general')}</Text>
            <MenuItem
              icon={History}
              iconBg={isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF'}
              iconColor="#3B82F6"
              label={t('myReports')}
              sublabel={t('complaintsFiled', { count: toUrduNumerals(myComplaints) })}
              cardBg={CARD_BG}
              cardBorder={CARD_BORDER}
              textColor={colors.text}
              mutedColor={MUTED}
              onPress={() => setShowHistory(!showHistory)}
            />

            {/* Expandable History */}
            {showHistory && (
              <View style={[styles.historyContainer, { borderColor: CARD_BORDER }]}>
                {userComplaints.length === 0 ? (
                  <Text style={[styles.historyEmpty, { color: MUTED }]}>{t('noReports')}</Text>
                ) : (
                  <>
                    {userComplaints.slice(0, 3).map(c => {
                      const catName = c.category === 'Broken Roads' ? t('filterRoads') :
                                      c.category === 'Sewerage' ? t('filterSewerage') :
                                      c.category === 'Waste' ? t('filterWaste') :
                                      c.category === 'Kunda' ? t('filterKunda') :
                                      c.category === 'Encroachment' ? t('filterEncroachment') : c.category;
                      const catColor = CAT_COLORS[c.category] || colors.primary;

                      return (
                        <View key={c.id} style={[styles.historyItem, { borderBottomColor: CARD_BORDER }]}>
                          <View style={[styles.historyCatPill, { backgroundColor: `${catColor}20`, borderWidth: 1, borderColor: `${catColor}50` }]}>
                            <Text style={[styles.historyCatText, { color: catColor }]}>
                              {catName}
                            </Text>
                          </View>
                          <Text style={[styles.historyDesc, { color: colors.text, textAlign: 'left' }]} numberOfLines={2}>
                            {c.description ? getLocalizedDesc(c.description, catName) : t('reportedIssue')}
                          </Text>
                          <View style={[styles.historyMetaRow, { alignItems: 'flex-start' }]}>
                            <Text style={[styles.historyMetaText, { color: MUTED, flex: 1, marginRight: 12, lineHeight: 16, textAlign: 'left' }]} numberOfLines={2}>{language === 'ur' ? (c.location_ur || translateLocation(c.location)) : (c.location_en || translateLocation(c.location))}</Text>
                            <Text style={[styles.historyStatus, { color: c.status === 'Verified' ? colors.primary : '#F59E0B', marginTop: 1 }]}>
                              {getLocalizedStatus(c.status)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                    {userComplaints.length > 3 && (
                      <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => setShowFullHistory(true)}>
                        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>{language === 'ur' ? 'تمام دیکھیں' : 'View All'}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}



            <MenuItem
              icon={Shield}
              iconBg={isDark ? 'rgba(139,92,246,0.12)' : '#F5F3FF'}
              iconColor="#8B5CF6"
              label={t('privacySecurity')}
              sublabel={t('manageData')}
              cardBg={CARD_BG}
              cardBorder={CARD_BORDER}
              textColor={colors.text}
              mutedColor={MUTED}
              onPress={() => requireInternet(() => navigation.navigate('Settings'))}
            />
          </View>

        </ScrollView>

        {/* Modals */}
        <Modal visible={showActivityModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>

              <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEFCE8' }]}>
                <Flame size={32} color="#F59E0B" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{language === 'ur' ? 'سرگرمی کا تسلسل' : 'Activity Streak'}</Text>
              <Text style={[styles.modalSub, { color: MUTED }]}>
                {language === 'ur'
                  ? <Text>آپ کی سرگرمی کا تسلسل ہر اس دن بڑھتا ہے جب آپ کوئی مسئلہ رپورٹ یا تصدیق کرتے ہیں۔ {toUrduNumerals(7)} دن کا تسلسل برقرار رکھنے پر آپ کو <Text style={{ fontWeight: 'bold', color: colors.primary }}>اسٹریک ماسٹر</Text> بیج اور <Text style={{ fontWeight: 'bold', color: colors.primary }}>{toUrduNumerals(50)} XP</Text> بونس ملتا ہے!</Text>
                  : <Text>Your activity streak increases every day you report or verify an issue. Maintaining a 7-day streak grants you the <Text style={{ fontWeight: 'bold', color: colors.primary }}>Streak Master</Text> badge and a <Text style={{ fontWeight: 'bold', color: colors.primary }}>50 XP</Text> bonus!</Text>
                }
              </Text>
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowActivityModal(false)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'سمجھ گیا' : 'Got it'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showBadgeModal} transparent animationType="slide" onRequestClose={() => setShowBadgeModal(false)}>
          <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '90%' }]}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: MUTED, marginBottom: 16, alignSelf: 'center', opacity: 0.3 }} />
              <View style={[styles.modalIconBox, { backgroundColor: colors.primaryGlow }]}>
                <Award size={32} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{language === 'ur' ? 'شہری بیجز' : 'Civic Badges'}</Text>
              <Text style={[styles.modalSub, { color: language === 'ur' ? URDU_MUTED : MUTED, fontSize: language === 'ur' ? 14 : 14, lineHeight: language === 'ur' ? 22 : 20 }]}>
                {language === 'ur' 
                  ? <Text>اپنی کمیونٹی میں مسلسل حصہ لینے پر بیجز حاصل ہوتے ہیں۔ تمام بیجز ان لاک کر کے خصوصی <Text style={{fontWeight: 'bold', color: colors.primary}}>ایلیٹ شہری</Text> کا درجہ حاصل کریں!</Text>
                  : <Text>Badges are earned by consistently participating in your community. Unlock all badges to gain the exclusive <Text style={{ fontWeight: 'bold', color: colors.primary }}>Elite Citizen</Text> status!</Text>
                }
              </Text>

              <View style={{ width: '100%', marginBottom: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{language === 'ur' ? 'مجموعی پیش رفت' : 'Overall Progress'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{toUrduNumerals(BADGES.filter(b => b.earned).length)} / {toUrduNumerals(BADGES.length)}</Text>
                </View>
                <View style={{ width: '100%', height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${(BADGES.filter(b => b.earned).length / BADGES.length) * 100}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 3 }} />
                </View>
              </View>

              <ScrollView style={{ width: '100%', marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                {BADGES.map(b => {
                  const BIcon = b.icon;
                  return (
                    <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa', borderRadius: 16, borderWidth: 1, borderColor: b.earned ? colors.primaryGlow : CARD_BORDER, opacity: b.earned ? 1 : 0.6 }}>
                      <View style={[styles.badgeIconBox, { width: 40, height: 40, borderRadius: 20, marginBottom: 0, marginEnd: 14, backgroundColor: b.earned ? colors.primaryGlow : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') }]}>
                        <BIcon size={20} color={b.earned ? colors.primary : MUTED} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: b.earned ? colors.text : (language === 'ur' ? URDU_MUTED : MUTED), fontSize: 14, fontWeight: '800', marginBottom: 4, textAlign: 'left', writingDirection: 'ltr' }}>{toUrduNumerals(getBadgeName(b.name))}</Text>
                        <Text style={{ color: language === 'ur' ? URDU_MUTED : MUTED, fontSize: language === 'ur' ? 12 : 11, fontWeight: language === 'ur' ? '700' : '600', lineHeight: language === 'ur' ? 18 : 16, textAlign: 'left', writingDirection: 'ltr' }}>{toUrduNumerals(getBadgeDesc(b.desc))}</Text>
                      </View>


                      <View style={{ width: 24, alignItems: 'flex-end', justifyContent: 'center' }}>
                        {b.earned ? <CheckCircle2 size={20} color={colors.primary} /> : <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: MUTED }} />}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowBadgeModal(false)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'بند کریں' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showMonthlyModal} transparent animationType="fade" onRequestClose={() => setShowMonthlyModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER, paddingHorizontal: 20 }]}>

              <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', marginBottom: 12 }]}>
                <TrendingUp size={32} color="#3B82F6" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 4 }]}>{language === 'ur' ? 'شراکت کا گراف' : 'Contribution Graph'}</Text>
              <Text style={[styles.modalSub, { color: MUTED, marginBottom: 20 }]}>
                {(() => {
                  const totalContribs = EXTENDED_HEATMAP.reduce((sum, v) => sum + (v > 0 ? 1 : 0), 0);
                  return language === 'ur'
                    ? `پچھلے ${toUrduNumerals(4)} مہینوں میں ${toUrduNumerals(totalContribs)} شہری شراکتیں`
                    : `${totalContribs} civic contribution${totalContribs !== 1 ? 's' : ''} in the last 4 months`;
                })()}
              </Text>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%' }}>
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: CARD_BORDER }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{toUrduNumerals(longestStreak)}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: MUTED, textTransform: 'uppercase', marginTop: 4 }}>{language === 'ur' ? 'طویل ترین اسٹریک' : 'Longest Streak'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.05)', padding: 12, borderRadius: 16, alignItems: 'center', borderColor: 'rgba(245,158,11,0.2)', borderWidth: 1 }}>
                  <Flame size={16} color="#F59E0B" style={{ position: 'absolute', top: 8, right: 8, opacity: 0.2 }} />
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#F59E0B' }}>{toUrduNumerals(currentStreak)}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#F59E0B', textTransform: 'uppercase', marginTop: 4 }}>{language === 'ur' ? 'موجودہ اسٹریک' : 'Current Streak'}</Text>
                </View>
              </View>

              <View style={{ width: '100%', marginBottom: 24, padding: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa', borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {Array.from({ length: 16 }).map((_, colIndex) => (
                      <View key={colIndex} style={{ gap: 6 }}>
                        {Array.from({ length: 7 }).map((_, rowIndex) => {
                          const intensity = EXTENDED_HEATMAP[colIndex * 7 + rowIndex];
                          return (
                            <View key={rowIndex} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: getHeatColor(intensity) }} />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  {MONTH_LABELS.map((m, i) => (
                    <Text key={i} style={{ fontSize: 10, color: MUTED, fontWeight: '700' }}>{language === 'ur' ? m.ur : m.en}</Text>
                  ))}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 16, gap: 6 }}>
                  <Text style={{ fontSize: 10, color: MUTED, fontWeight: '600' }}>{language === 'ur' ? 'کم' : 'Less'}</Text>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: getHeatColor(0) }} />
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: getHeatColor(1) }} />
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: getHeatColor(2) }} />
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: getHeatColor(3) }} />
                  <Text style={{ fontSize: 10, color: MUTED, fontWeight: '600' }}>{language === 'ur' ? 'زیادہ' : 'More'}</Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowMonthlyModal(false)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'شاندار' : 'Awesome'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal visible={showEditProfile} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditProfile(false)}>
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.topBar, { backgroundColor: CARD_BG, borderBottomWidth: 1, borderColor: CARD_BORDER, flexDirection: language === 'ur' || language === 'sd' ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setShowEditProfile(false)} style={{ paddingHorizontal: language === 'ru' ? 8 : 12, paddingVertical: 8, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
                <Text style={{ color: colors.text, fontSize: language === 'ru' ? 12 : 14, fontWeight: '700' }}>{language === 'ur' ? 'منسوخ کریں' : language === 'ru' ? 'Mansookh Karein' : 'Cancel'}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: language === 'ru' ? 15 : 18, fontWeight: '800', color: colors.text }}>{language === 'ur' ? 'پروفائل میں ترمیم کریں' : language === 'ru' ? 'Profile Edit Karein' : 'Edit Profile'}</Text>
              <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving} style={{ paddingHorizontal: language === 'ru' ? 8 : 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primaryGlow, opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontSize: language === 'ru' ? 12 : 14, fontWeight: '800' }}>{language === 'ur' ? 'محفوظ کریں' : language === 'ru' ? 'Save Karein' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 24, gap: 20, direction: language === 'ur' || language === 'sd' ? 'rtl' : 'ltr' }}>
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <TouchableOpacity onPress={handleChoosePhoto} style={[styles.avatarRing, { borderColor: colors.primary, width: 100, height: 100, borderRadius: 50, overflow: 'hidden' }]}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
                  ) : (
                    <View style={[styles.avatarInner, { backgroundColor: colors.primaryGlow, width: 88, height: 88, borderRadius: 44 }]}>
                      <Camera size={36} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={{ color: colors.primary, marginTop: 12, fontWeight: '700' }} onPress={handleChoosePhoto}>{language === 'ur' ? 'تصویر تبدیل کریں' : language === 'ru' ? 'Tasveer Tabdeel Karein' : 'Change Photo'}</Text>
              </View>
              <View>
                <View style={{ width: '100%', alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 8 }}>
                  <Text style={{ fontSize: language === 'ur' ? 14 : 12, fontWeight: '700', color: language === 'ur' ? colors.text : MUTED, textTransform: language === 'ur' ? 'none' : 'uppercase' }}>{language === 'ur' ? 'نام' : language === 'ru' ? 'Naam' : 'Display Name'}</Text>
                </View>
                <TextInput
                  style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, textAlign: language === 'ur' || language === 'sd' ? 'right' : 'left', writingDirection: language === 'ur' || language === 'sd' ? 'rtl' : 'ltr' }}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={language === 'ur' ? 'اپنا نام درج کریں' : language === 'ru' ? 'Apna naam darj karein' : 'Enter your name'}
                  placeholderTextColor={MUTED}
                />
              </View>
              <View>
                <View style={{ width: '100%', alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 8 }}>
                  <Text style={{ fontSize: language === 'ur' ? 14 : 12, fontWeight: '700', color: language === 'ur' ? colors.text : MUTED, textTransform: language === 'ur' ? 'none' : 'uppercase' }}>{language === 'ur' ? 'میرے بارے میں' : language === 'sd' ? 'منهنجي باري ۾' : language === 'ru' ? 'Mere Baray Mein' : 'Bio'}</Text>
                </View>
                <TextInput
                  style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, textAlign: language === 'ur' || language === 'sd' ? 'right' : 'left', writingDirection: language === 'ur' || language === 'sd' ? 'rtl' : 'ltr', minHeight: 120, textAlignVertical: 'top' }}
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                  placeholder={language === 'ur' ? 'اپنے بارے میں اور شہر کے لیے اپنے مقاصد کے بارے میں چند سطریں لکھیں تاکہ دوسرے شہری آپ کو جان سکیں۔' : language === 'sd' ? 'پنهنجي باري ۾ ۽ شهر لاءِ مقصدن بابت ڪجهه سٽون لکو ته جيئن ٻيا شهري توهان کي سڃاڻي سگهن.' : language === 'ru' ? 'Apne baray mein aur sheher ke liye apne maqasid ke baray mein chand sutrain likhein taake dosray shehri aap ko jaan sakein.' : 'Write a few lines about yourself and your goals for the city so other citizens can get to know you better.'}
                  placeholderTextColor={MUTED}
                />
              </View>
              <View>
                <View style={{ width: '100%', alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 8 }}>
                  <Text style={{ fontSize: language === 'ur' ? 14 : 12, fontWeight: '700', color: language === 'ur' ? colors.text : MUTED, textTransform: language === 'ur' ? 'none' : 'uppercase' }}>{language === 'ur' ? 'پیشہ' : language === 'sd' ? 'پيشو' : language === 'ru' ? 'Peshah' : 'Profession'}</Text>
                </View>
                <TextInput
                  style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, textAlign: language === 'ur' || language === 'sd' ? 'right' : 'left', writingDirection: language === 'ur' || language === 'sd' ? 'rtl' : 'ltr' }}
                  value={editProfession}
                  onChangeText={setEditProfession}
                  placeholder={language === 'ur' ? 'اپنا پیشہ درج کریں' : language === 'sd' ? 'پنهنجو پيشو داخل ڪريو' : language === 'ru' ? 'Apna peshah darj karein' : 'e.g. Teacher, Engineer'}
                  placeholderTextColor={MUTED}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ width: '100%', alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 8 }}>
                    <Text style={{ fontSize: language === 'ur' ? 14 : 12, fontWeight: '700', color: language === 'ur' ? colors.text : MUTED, textTransform: language === 'ur' ? 'none' : 'uppercase' }}>
                      {language === 'ur' ? 'انسٹاگرام' : language === 'sd' ? 'انسٽاگرام' : 'Instagram'}
                    </Text>
                  </View>
                  <TextInput
                    style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, textAlign: language === 'ur' || language === 'sd' ? 'right' : 'left', writingDirection: language === 'ur' || language === 'sd' ? 'rtl' : 'ltr' }}
                    value={editInstagram}
                    onChangeText={setEditInstagram}
                    placeholder={language === 'ur' ? '@صارف_نام' : language === 'sd' ? '@صارف_نالو' : '@username'}
                    placeholderTextColor={MUTED}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ width: '100%', alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 8 }}>
                    <Text style={{ fontSize: language === 'ur' ? 14 : 12, fontWeight: '700', color: language === 'ur' ? colors.text : MUTED, textTransform: language === 'ur' ? 'none' : 'uppercase' }}>
                      {language === 'ur' ? 'ایکس (ٹویٹر)' : language === 'sd' ? 'ايڪس (ٽوئيٽر)' : 'X (Twitter)'}
                    </Text>
                  </View>
                  <TextInput
                    style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, textAlign: language === 'ur' || language === 'sd' ? 'right' : 'left', writingDirection: language === 'ur' || language === 'sd' ? 'rtl' : 'ltr' }}
                    value={editTwitter}
                    onChangeText={setEditTwitter}
                    placeholder={language === 'ur' ? '@صارف_نام' : language === 'sd' ? '@صارف_نالو' : '@username'}
                    placeholderTextColor={MUTED}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Full History Modal */}
        <Modal visible={showFullHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFullHistory(false)}>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.topBar, { backgroundColor: CARD_BG, borderBottomWidth: 1, borderColor: CARD_BORDER }]}>
              <TouchableOpacity onPress={() => setShowFullHistory(false)} style={{ padding: 8 }}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{language === 'ur' ? 'میری تمام رپورٹس' : 'All My Reports'}</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {userComplaints.map(c => {
                const catName = c.category === 'Broken Roads' ? t('filterRoads') :
                                c.category === 'Sewerage' ? t('filterSewerage') :
                                c.category === 'Waste' ? t('filterWaste') :
                                c.category === 'Kunda' ? t('filterKunda') :
                                c.category === 'Encroachment' ? t('filterEncroachment') : c.category;
                const catColor = CAT_COLORS[c.category] || colors.primary;

                return (
                  <View key={c.id} style={[{ paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: CARD_BORDER }]}>
                    <View style={[styles.historyCatPill, { backgroundColor: `${catColor}20`, borderWidth: 1, borderColor: `${catColor}50` }]}>
                      <Text style={[styles.historyCatText, { color: catColor }]}>{catName}</Text>
                    </View>
                    <Text style={[styles.historyDesc, { color: colors.text }]} numberOfLines={2}>
                      {c.description ? getLocalizedDesc(c.description, catName) : t('reportedIssue')}
                    </Text>
                    <View style={styles.historyMetaRow}>
                      <Text style={[styles.historyMetaText, { color: MUTED }]} numberOfLines={1}>{language === 'ur' ? (c.location_ur || translateLocation(c.location)) : (c.location_en || translateLocation(c.location))}</Text>
                      <Text style={[styles.historyStatus, { color: c.status === 'Verified' ? colors.primary : '#F59E0B' }]}>
                        {getLocalizedStatus(c.status)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        {/* Share Card Modal */}
        <Modal visible={showShareCard} transparent animationType="fade" onRequestClose={() => setShowShareCard(false)}>
          <View style={[styles.modalOverlay, { paddingHorizontal: 16 }]}>
            <View ref={shareViewRef} collapsable={false} style={[{ width: '100%', backgroundColor: colors.primary, borderRadius: 32, padding: 32, alignItems: 'center' }]}>
              <View style={[styles.avatarRing, { borderColor: '#fff', marginBottom: 16, width: 90, height: 90, borderRadius: 45, overflow: 'hidden' }]}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    <User size={44} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', backgroundColor: 'transparent', textAlign: 'center', width: '100%' }}>
                {translateName(user?.name) ?? user?.email?.split('@')[0] ?? t('citizen')}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.9)', marginBottom: 12, backgroundColor: 'transparent', textTransform: 'uppercase', letterSpacing: 1 }}>{t('silverCitizen')}</Text>
              
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 28, paddingHorizontal: 16, lineHeight: 20, backgroundColor: 'transparent' }}>
                {language === 'ur' 
                  ? 'ہمارے شہر کو صاف، محفوظ اور بہتر بنانے کے لیے کوشاں ایک فخر مند شہری۔' 
                  : language === 'sd' 
                  ? 'هڪ فخر وارو شهري جيڪو اسان جي شهر کي صاف، محفوظ ۽ بهتر بڻائڻ لاءِ ڪوشان آهي.' 
                  : language === 'ru'
                  ? 'Hamare sheher ko saaf, mehfooz aur behtar banane ke liye koshan ek fakhar mand shehri.'
                  : 'A proud citizen actively working to make our city cleaner, safer, and better for everyone.'}
              </Text>

              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24, width: '100%', justifyContent: 'center' }}>
                <View style={{ alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', backgroundColor: 'transparent' }} numberOfLines={1} adjustsFontSizeToFit>{toUrduNumerals(userStats.level)}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', backgroundColor: 'transparent', letterSpacing: 0.5 }}>{language === 'ur' ? 'لیول' : language === 'sd' ? 'ليول' : 'Level'}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                <View style={{ alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', backgroundColor: 'transparent' }} numberOfLines={1} adjustsFontSizeToFit>{toUrduNumerals(myComplaints)}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', backgroundColor: 'transparent', letterSpacing: 0.5 }}>{language === 'ur' ? 'رپورٹس' : language === 'sd' ? 'رپورٽون' : language === 'ru' ? 'Reports' : 'Reports'}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                <View style={{ alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', backgroundColor: 'transparent' }} numberOfLines={1} adjustsFontSizeToFit>{toUrduNumerals(userStats.xp.toLocaleString())}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', backgroundColor: 'transparent', letterSpacing: 0.5 }}>XP</Text>
                </View>
              </View>
              
              <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.9)', marginBottom: 12, backgroundColor: 'transparent', alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: 1 }}>{language === 'ur' ? 'شہری اثر کا پورٹ فولیو' : language === 'ru' ? 'Shehri Asar ka Portfolio' : 'Civic Impact Portfolio'}</Text>
              <View style={{ width: '100%', marginBottom: 20 }}>
                {(() => {
                  // On the share card the background is always colors.primary (green).
                  // Waste (#22C55E) is green too — invisible on both light & dark green bg.
                  // Override it (and any other green-family colour) with pale contrasting tints.
                  const SHARE_CARD_COLORS = {
                    ...CAT_COLORS,
                    // Use regular green in light theme (border rings provide contrast),
                    // and deep forest green in dark theme
                    'Waste': isDark ? '#15803D' : CAT_COLORS['Waste'],
                    'Broken Roads': '#FACC15', // a clear yellow color
                  };

                  if (myComplaints === 0) {
                    return <View style={{ width: '100%', height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' }} />;
                  }

                  const entries = Object.entries(SHARE_CARD_COLORS)
                    .map(([cat, color]) => ({ cat, color, count: userComplaints.filter(c => c.category === cat).length }))
                    .filter(e => e.count > 0);

                  return (
                    <>
                      {/* Segmented progress bar — white 2px separators between segments */}
                      <View style={{ width: '100%', height: 12, borderRadius: 6, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.25)' }}>
                        {entries.map((e, idx) => {
                          const pct = Math.round((e.count / myComplaints) * 100);
                          const isLast = idx === entries.length - 1;
                          return (
                            <View
                              key={e.cat}
                              style={[
                                isLast
                                  ? { flex: 1, height: '100%', backgroundColor: e.color }
                                  : { width: `${pct}%`, height: '100%', backgroundColor: e.color },
                                // White right-border acts as a visible separator between segments
                                !isLast && { borderRightWidth: 2, borderRightColor: '#fff' },
                              ]}
                            />
                          );
                        })}
                      </View>

                      {/* Legend chips */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {Object.entries(SHARE_CARD_COLORS).map(([cat, dotColor]) => {
                          const count = userComplaints.filter(c => c.category === cat).length;
                          if (count === 0) return null;
                          const pct = Math.round((count / myComplaints) * 100);
                          const catName = language === 'ur' ? (
                            cat === 'Broken Roads' ? 'ٹوٹی سڑکیں' :
                            cat === 'Sewerage' ? 'سیوریج' :
                            cat === 'Waste' ? 'کچرا' :
                            cat === 'Kunda' ? 'کنڈا' :
                            cat === 'Encroachment' ? 'تجاوزات' : cat
                          ) : language === 'ru' ? (
                            cat === 'Broken Roads' ? 'Toti Sarkain' :
                            cat === 'Sewerage' ? 'Sewerage' :
                            cat === 'Waste' ? 'Kachra' :
                            cat === 'Kunda' ? 'Kunda' :
                            cat === 'Encroachment' ? 'Tajaawuzaat' : cat
                          ) : cat;
                          return (
                            <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                              {/* Solid white border ring — visible on every shade of green bg */}
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor, borderWidth: 2, borderColor: '#fff', marginRight: language === 'ur' ? 0 : 6, marginLeft: language === 'ur' ? 6 : 0 }} />
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{catName} {toUrduNumerals(pct)}%</Text>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  );
                })()}
              </View>
              
              {isCapturing && (
                <View style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, alignItems: 'center', width: '100%' }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, backgroundColor: 'transparent', textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
                    {language === 'ur' ? 'کراچی کمپلینٹ پورٹل' : language === 'sd' ? 'ڪراچي ڪمپلينٽ پورٽل' : 'Karachi Complaint Portal'}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'center', backgroundColor: 'transparent' }}>
                    {language === 'ur' ? 'ہمارے شہر کو بہتر بنانے کے لیے اس مہم میں شامل ہوں!' : language === 'sd' ? 'اسان جي شهر کي بهتر بڻائڻ لاءِ هن مهم ۾ شامل ٿيو!' : language === 'ru' ? 'Hamare sheher ko behtar banane ke liye is muhim mein shamil hon!' : 'Join this movement to make our city better!'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={[{ width: '100%', backgroundColor: '#fff', marginTop: 24, paddingVertical: 18, borderRadius: 16, alignItems: 'center' }]} onPress={captureAndShare}>
              <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900' }}>{language === 'ur' ? 'شیئر کریں' : language === 'sd' ? 'شيئر ڪريو' : language === 'ru' ? 'Share Karein' : 'Share Now'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{ marginTop: 12, width: '100%', paddingVertical: 18, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center' }} onPress={() => setShowShareCard(false)}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{language === 'ur' ? 'منسوخ کریں' : language === 'sd' ? 'بند ڪريو' : language === 'ru' ? 'Mansookh Karein' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Selected Badge Modal */}
        <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>

              <View style={[styles.modalIconBox, { backgroundColor: selectedBadge?.earned ? colors.primaryGlow : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), width: 80, height: 80, borderRadius: 40 }]}>
                {(() => {
                  if (!selectedBadge) return null;
                  const BadgeIcon = selectedBadge.icon;
                  return <BadgeIcon size={40} color={selectedBadge.earned ? colors.primary : MUTED} />;
                })()}
              </View>
              <Text style={[styles.modalTitle, { color: colors.text, marginTop: 16 }]}>{selectedBadge ? toUrduNumerals(getBadgeName(selectedBadge.name)) : ''}</Text>
              <Text style={[styles.modalSub, { color: language === 'ur' ? URDU_MUTED : MUTED, marginTop: 8, fontSize: language === 'ur' ? 14 : 14, lineHeight: language === 'ur' ? 22 : 20 }]}>
                {selectedBadge?.earned 
                  ? (language === 'ur' ? 'زبردست! آپ نے اپنی مسلسل محنت اور لگن سے یہ بیج کامیابی کے ساتھ حاصل کر لیا ہے۔' : 'Awesome! You have successfully earned this badge through your dedication.')
                  : `${language === 'ur' ? 'ان لاک کرنے کے لیے:' : 'To unlock:'} ${selectedBadge ? toUrduNumerals(getBadgeDesc(selectedBadge.desc)) : ''}`
                }
              </Text>
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={() => setSelectedBadge(null)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'بند کریں' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Selected Heatmap Day Modal */}
        <Modal visible={!!selectedHeatmapDay} transparent animationType="fade" onRequestClose={() => setSelectedHeatmapDay(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>

              <View style={[styles.modalIconBox, { backgroundColor: selectedHeatmapDay?.isFuture ? (isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF') : selectedHeatmapDay?.active ? colors.primaryGlow : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), width: 64, height: 64, borderRadius: 32 }]}>
                {selectedHeatmapDay?.isFuture ? <CalendarDays size={32} color="#3B82F6" /> : selectedHeatmapDay?.active ? <CheckCircle2 size={32} color={colors.primary} /> : <X size={32} color={MUTED} />}
              </View>
              <Text style={[styles.modalTitle, { color: colors.text, marginTop: 16 }]}>{selectedHeatmapDay ? (language === 'ur' ? selectedHeatmapDay.fullUr : language === 'sd' ? selectedHeatmapDay.fullSd : selectedHeatmapDay.fullEn) : (language === 'ur' ? 'تفصیل' : 'Details')}</Text>
              
              {selectedHeatmapDay?.active && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryGlow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 8 }}>
                  <Flame size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>+{toUrduNumerals(15)} XP</Text>
                </View>
              )}

              <Text style={[styles.modalSub, { color: MUTED, marginTop: selectedHeatmapDay?.active ? 12 : 8, paddingHorizontal: 12 }]}>
                {selectedHeatmapDay?.isFuture
                  ? (language === 'ur' ? 'ہمیں اس دن آپ کی شرکت کا بے صبری سے انتظار ہے۔ اپنی اسٹریک جاری رکھنے کے لیے تیار رہیں!' : language === 'sd' ? 'اسان کي هن ڏينهن توهان جي شموليت جو بي صبري سان انتظار آهي. پنهنجي اسٽريڪ جاري رکڻ لاءِ تيار رهو!' : 'We are looking forward to your participation on this day. Get ready to continue your streak!')
                  : selectedHeatmapDay?.active 
                  ? (language === 'ur' ? 'بہترین کام! آپ نے اس دن کمیونٹی کی مدد کی اور اپنی اسٹریک میں اضافہ کیا۔ جاری رکھیں!' : language === 'sd' ? 'زبردست ڪم! توهان ان ڏينهن ڪميونٽي جي مدد ڪئي ۽ پنهنجي اسٽريڪ وڌائي. جاري رکو!' : 'Great job! You helped the community and grew your streak this day. Keep it up!')
                  : (language === 'ur' ? 'آپ نے اس دن چھٹی لی! اس دن کوئی رپورٹ یا تصدیق ریکارڈ نہیں کی گئی۔' : language === 'sd' ? 'توهان ان ڏينهن موڪل ڪئي! ان ڏينهن ڪا به رپورٽ يا تصديق رڪارڊ ناهي ڪئي وئي.' : 'You took the day off! No reports or verifications on this day.')
                }
              </Text>
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={() => setSelectedHeatmapDay(null)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'بند کریں' : language === 'sd' ? 'بند ڪريو' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Civic Impact Portfolio Modal */}
        <Modal visible={showPortfolioModal} transparent animationType="fade" onRequestClose={() => setShowPortfolioModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                <TrendingUp size={32} color="#3B82F6" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{language === 'ur' ? 'شہری اثر کی تفصیل' : language === 'ru' ? 'Shehri Asar ki Tafseel' : 'Impact Details'}</Text>
              <Text style={[styles.modalSub, { color: MUTED, paddingHorizontal: 10 }]}>
                {language === 'ur' 
                  ? 'یہاں آپ کی درج کردہ شکایات کی کیٹیگری کے لحاظ سے مکمل تفصیل ہے۔ اس سے پتہ چلتا ہے کہ آپ کس شعبے میں شہر کی سب سے زیادہ مدد کر رہے ہیں۔'
                  : language === 'sd'
                  ? 'هتي توهان جي درج ڪيل شڪايتن جي ڪيٽيگري جي لحاظ کان مڪمل تفصيل آهي. ان مان خبر پوي ٿي ته توهان ڪهڙي شعبي ۾ شهر جي سڀ کان وڌيڪ مدد ڪري رهيا آهيو.'
                  : language === 'ru'
                  ? 'Yahan aap ki darj karda shikayat ki category ke lehaz se mukammal tafseel hai. Is se pata chalta hai ke aap kis shobay mein sheher ki sab se zyada madad kar rahe hain.'
                  : 'Here is the complete breakdown of your reported issues by category. This shows where you are making the most impact in your city.'}
              </Text>
              
              <View style={{ width: '100%', marginBottom: 24, gap: 12 }}>
                {Object.entries(CAT_COLORS).map(([cat, color]) => {
                  const count = userComplaints.filter(c => c.category === cat).length;
                  const pct = myComplaints === 0 ? 0 : Math.round((count / myComplaints) * 100);
                  const catName = language === 'ur' ? (
                    cat === 'Broken Roads' ? 'ٹوٹی سڑکیں' :
                    cat === 'Sewerage' ? 'سیوریج' :
                    cat === 'Waste' ? 'کچرا' :
                    cat === 'Kunda' ? 'کنڈا' :
                    cat === 'Encroachment' ? 'تجاوزات' : cat
                  ) : language === 'ru' ? (
                    cat === 'Broken Roads' ? 'Toti Sarkain' :
                    cat === 'Sewerage' ? 'Sewerage' :
                    cat === 'Waste' ? 'Kachra' :
                    cat === 'Kunda' ? 'Kunda' :
                    cat === 'Encroachment' ? 'Tajaawuzaat' : cat
                  ) : cat;
                  
                  return (
                    <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, marginHorizontal: 10, marginLeft: language === 'ur' ? 12 : 0, marginRight: language === 'ur' ? 0 : 12 }} />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.text }}>{catName}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>{toUrduNumerals(count)}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>{toUrduNumerals(pct)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowPortfolioModal(false)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'بند کریں' : language === 'sd' ? 'بند ڪريو' : language === 'ru' ? 'Band Karein' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Civic Impact Info Modal */}
        <Modal visible={showImpactInfoModal} transparent animationType="fade" onRequestClose={() => setShowImpactInfoModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                <Info size={32} color="#3B82F6" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'ur' ? 'شہری اثر کا پورٹ فولیو' : language === 'ru' ? 'Shehri Asar ka Portfolio' : 'Civic Impact Portfolio'}
              </Text>
              <Text style={[styles.modalSub, { color: MUTED, paddingHorizontal: 10, marginBottom: 24, textAlign: 'auto' }]}>
                {language === 'ur' 
                  ? 'یہ فیچر مختلف مسائل کی کیٹیگریز میں آپ کی کمیونٹی خدمات کو ٹریک کرتا ہے۔ جیسے جیسے آپ مسائل رپورٹ اور ان کی تصدیق کرتے ہیں، آپ کا ایک مخصوص پورٹ فولیو بنتا ہے جو آپ کی شہری خدمات کو ظاہر کرتا ہے۔ یہ ظاہر کرتا ہے کہ آپ شہر کے کس حصے میں سب سے زیادہ متحرک ہیں اور آپ کی کوششوں پر آپ کو XP دیتا ہے۔'
                  : language === 'sd'
                  ? 'هي فيچر مختلف شڪايتن جي ڪيٽيگريز ۾ توهان جي ڪميونٽي جي خدمتن کي ٽريڪ ڪري ٿو. جيئن جيئن توهان شڪايتون رپورٽ ۽ انهن جي تصديق ڪندا آهيو، توهان جو هڪ مخصوص پورٽ فوليو ٺهي ٿو جيڪو توهان جي شهري خدمتن کي ظاهر ڪري ٿو. اهو ظاهر ڪري ٿو ته توهان شهر جي ڪهڙي حصي ۾ سڀ کان وڌيڪ سرگرم آهيو ۽ توهان جي ڪوششن تي توهان کي XP ڏئي ٿو.'
                  : language === 'ru'
                  ? 'Yeh feature mukhtalif masail ki categories mein aap ki community khidmaat ko track karta hai. Jaise jaise aap masail report aur tasdeeq karte hain, aap ka ek makhsoos portfolio banta hai jo aap ki shehri khidmaat ko zahir karta hai. Yeh zahir karta hai ke aap sheher ke kis hissay mein sab se zyada mutaharrik hain aur aap ki koshishon par aap ko XP deta hai.'
                  : 'Your Civic Impact Portfolio tracks your community contributions across different issue categories. As you report and verify issues, you build a specialized portfolio demonstrating your civic engagement. This helps identify which areas of the city you are most active in and awards XP for your efforts.'}
              </Text>
              
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowImpactInfoModal(false)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'بند کریں' : language === 'sd' ? 'بند ڪريو' : language === 'ru' ? 'Band Karein' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Civic Skill Tree Modal */}
        <Modal visible={showSkillTreeModal} transparent animationType="fade" onRequestClose={() => setShowSkillTreeModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                <Target size={32} color="#3B82F6" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'ur' ? 'شہری مہارتیں کیا ہیں؟' : language === 'ru' ? 'Shehri Maharatein kya hain?' : 'What is the Civic Skill Tree?'}
              </Text>
              <Text style={[styles.modalSub, { color: MUTED, paddingHorizontal: 10, marginBottom: 24, textAlign: 'auto' }]}>
                {language === 'ur' 
                  ? 'شہری مہارتیں آپ کی کمیونٹی میں سرگرمی کی عکاسی کرتی ہیں۔ کچرے اور پارک کے مسائل رپورٹ کرنے سے آپ کی "ماحولیات" کی مہارت بڑھتی ہے، سڑکیں اور پانی کے مسائل آپ کی "بنیادی ڈھانچہ" کی مہارت میں اضافہ کرتے ہیں، اور دوسروں کی رپورٹس کی تصدیق کرنے سے آپ بطور "تفتیش کار" بہتر ہوتے ہیں۔ ایک متوازن شہری بننے کے لیے تمام شعبوں میں حصہ لیں!'
                  : language === 'sd'
                  ? 'شهري صلاحيتون توهان جي ڪميونٽي ۾ سرگرمي کي ظاهر ڪن ٿيون. ڪچرو ۽ پارڪ جا مسئلا رپورٽ ڪرڻ سان توهان جي "ماحوليات" جي صلاحيت وڌي ٿي، روڊن ۽ پاڻي جا مسئلا توهان جي "بنيادي ڍانچي" جي صلاحيت ۾ اضافو ڪن ٿا، ۽ ٻين جي رپورٽن جي تصديق ڪرڻ سان توهان هڪ "تفتيش ڪندڙ" جي حيثيت سان بهتر ٿيندا آهيو. هڪ متوازن شهري بڻجڻ لاءِ سمورن شعبن ۾ حصو وٺو!'
                  : language === 'ru'
                  ? 'Shehri maharatein aap ki community mein sargarmi ki akkaasi karti hain. Kachray aur park ke masail report karne se aap ki "Maholiyat" ki maharat barhti hai, sarkain aur pani ke masail aap ki "Infrastructure" ki maharat mein izafa karte hain, aur dusron ki reports ki tasdeeq karne se aap bator "Tafteesh Kar" behtar hotay hain. Ek mutawazin shehri ban-ne ke liye tamam shobon mein hissa lein!'
                  : 'The Civic Skill Tree visualizes your community impact! Reporting waste or park issues grows your "Environment" skill, roads and water issues grow your "Infrastructure" skill, and verifying other people\'s reports levels up your "Detective" stat. Report across different categories to become a perfectly balanced citizen!'}
              </Text>
              
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSkillTreeModal(false)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'بند کریں' : language === 'sd' ? 'بند ڪريو' : language === 'ru' ? 'Band Karein' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Civic Skill Tree Details Modal */}
        <Modal visible={showSkillTreeDetailsModal} transparent animationType="fade" onRequestClose={() => setShowSkillTreeDetailsModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : '#F0FDF4' }]}>
                <Activity size={32} color="#22C55E" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'ur' ? 'آپ کی شہری مہارتیں' : language === 'ru' ? 'Aap ki Shehri Maharatein' : 'Your Civic Skills'}
              </Text>
              <View style={{ width: '100%', marginBottom: 24 }}>
                {calculateRadarData().map(d => (
                  <View key={d.labelEn} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: CARD_BORDER }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                      {language === 'ur' ? d.labelUr : language === 'ru' ? d.labelRu : d.labelEn}
                    </Text>
                    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '900' }}>
                      {toUrduNumerals(Math.round(d.value))}<Text style={{ fontSize: 12, color: MUTED }}>/{toUrduNumerals(100)}</Text>
                    </Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSkillTreeDetailsModal(false)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'بند کریں' : language === 'sd' ? 'بند ڪريو' : language === 'ru' ? 'Band Karein' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  screenLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  pageTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  editBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingBottom: 40 },

  /* Hero */
  profileHero: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginHorizontal: 16, marginTop: 4, padding: 16,
    borderRadius: 16, borderWidth: 1,
  },
  avatarRing: {
    width: 74, height: 74, borderRadius: 37,
    borderWidth: 2.5, justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  avatarInner: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  levelBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  levelBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  userRank: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  xpSection: { marginTop: 10 },
  xpTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  xpLabel: { fontSize: 11, fontWeight: '600' },
  xpPct: { fontSize: 11, fontWeight: '800' },
  xpTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },

  /* Stats */
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 10, marginBottom: 4 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, alignItems: 'center', gap: 5 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Section */
  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },

  /* Contribution */
  contribCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  contribRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  contribIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  contribInfo: { flex: 1 },
  contribLabel: { fontSize: 14, fontWeight: '800' },
  contribSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  contribVal: { fontSize: 13, fontWeight: '900' },
  divider: { height: 1, marginHorizontal: 14 },

  /* Menu */
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '700' },
  menuSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  /* History Expandable */
  historyContainer: {
    marginStart: 18, marginEnd: 10, marginBottom: 12,
    paddingStart: 16, borderStartWidth: 2,
  },
  historyEmpty: { fontSize: 13, fontWeight: '600', paddingVertical: 10 },
  historyItem: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  historyCatPill: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
  historyCatText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  historyDesc: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 6 },
  historyMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyMetaText: { fontSize: 11, fontWeight: '600' },
  historyStatus: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  /* Profile New Features */
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  streakPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  heatmapCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1 },
  heatCol: { alignItems: 'center', gap: 6 },
  heatNode: { width: 32, height: 32, borderRadius: 8 },
  heatDay: { fontSize: 11, fontWeight: '700' },

  badgeCard: { padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center', minWidth: 100 },
  badgeIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  badgeName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  seeAll: { fontSize: 12, fontWeight: '800' },

  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', padding: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  modalSub: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  doneBtn: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

});

export default MeraAccountScreen;
