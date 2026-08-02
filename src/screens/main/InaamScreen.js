import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, StatusBar, ToastAndroid, LayoutAnimation, UIManager, Platform, TextInput
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ticket, Coins, ChevronRight, ChevronLeft, CheckCircle2,
  X, Copy, Tag, Info, Flame, Award, Users, Target
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAppContext } from '../../context/AppContext';
import { useNetwork } from '../../context/NetworkContext';
import NotificationService from '../../services/NotificationService';

const URDU_TRANSLATIONS = {
  // Partners — Original
  'Chai Wala': 'چائے والا',
  'Biryani Center': 'بریانی سینٹر',
  'Foodpanda': 'فوڈ پانڈا',
  'KFC': 'کے ایف سی',
  'McDonald\'s': 'میکڈونلڈز',
  'Dominos': 'ڈومینوز',
  'InDrive': 'ان ڈرائیو',
  'Bykea': 'بائیکیا',
  'Yango': 'یانگو',
  'Careem': 'کریم',
  'PSO': 'پی ایس او',
  'Green Line BRT': 'گرین لائن بی آر ٹی',
  'Nayatel': 'نیا ٹیل',
  'SSGC': 'ایس ایس جی سی',
  'KWSB': 'کے ڈبلیو ایس بی',
  'K-Electric': 'کے الیکٹرک',
  'PTCL': 'پی ٹی سی ایل',
  'Bin Hashim': 'بن ہاشم',
  'Naheed': 'ناہید',
  'Imtiaz Super Market': 'امتیاز سپر مارکیٹ',
  'Chase Up': 'چیس اپ',
  'Metro Cash & Carry': 'میٹرو کیش اینڈ کیری',
  'Daraz': 'دراز',
  // Partners — New
  'Hardee\'s': 'ہارڈیز',
  'Pizza Hut': 'پیزا ہٹ',
  'Student Biryani': 'اسٹوڈنٹ بریانی',
  'Kababjees': 'کباب جیز',
  'Uber': 'اوبر',
  'Airlift': 'ایئر لفٹ',
  'Swvl': 'سوول',
  'Telenor': 'ٹیلی نور',
  'Jazz': 'جاز',
  'Zong': 'زونگ',
  'Al-Fatah': 'الفاتح',
  'Bata': 'باٹا',
  'J.': 'جے (جنید جمشید)',
  'Khaadi': 'خادی',
  'Sapphire': 'سفائر',
  'Arena Gaming': 'اری نا گیمنگ',
  'Cinepax': 'سینی پیکس',
  'Escape Room Karachi': 'ایسکیپ روم کراچی',
  'Fun City': 'فن سٹی',
  'Port Grand': 'پورٹ گرینڈ',
  'StormFiber': 'اسٹارم فائبر',
  'Ginsoy': 'گنسوئے',
  'Nuplex': 'نیوپلیکس',
  'Gul Ahmed': 'گل احمد',
  'Baskin Robbins': 'باسکن رابنز',
  'Optp': 'او پی ٹی پی',
  'California Pizza': 'کیلیفورنیا پیزا',
  'Nando\'s': 'نینڈوز',
  'Burger O\'Clock': 'برگر او کلاک',
  'Hoagies': 'ہوگیز',
  'Chop Chop Wok': 'چاپ چاپ وک',
  'Ufone': 'یوفون',
  'Outfitters': 'آؤٹ فٹرز',
  'Ideas by Gul Ahmed': 'آئیڈیاز بائے گل احمد',
  'Miniso': 'منیسو',
  'Carrefour': 'کیریفور',
  'Sindbad': 'سندباد',
  'Bounce': 'باؤنس',
  'Bahria Adventure Land': 'بحریہ ایڈونچر لینڈ',
  'Winterland': 'ونٹرلینڈ',

  // Community Partners
  'Green Crescent Trust': 'گرین کریسنٹ ٹرسٹ',
  'Saylani Welfare': 'سیلانی ویلفیئر',
  'JDC': 'جے ڈی سی',
  'Alkhidmat': 'الخدمت',
  'TCF': 'ٹی سی ایف',
  'Edhi Foundation': 'ایدھی فاؤنڈیشن',
  'Indus Hospital': 'انڈس ہسپتال',
  'ACF Animal Rescue': 'اے سی ایف اینیمل ریسکیو',
  'Local Citizens': 'مقامی شہری',
  'Local Residents': 'مقامی رہائشی',
  'Community Volunteers': 'کمیونٹی رضاکار',
  'Neighborhood Watch': 'محلہ کی نگرانی',
  'KMC': 'کے ایم سی',

  // Discounts — Original
  'Free Chai & Paratha': 'مفت چائے اور پراٹھا',
  'Free Single Plate': 'مفت سنگل پلیٹ',
  'Rs. 200 Off': '200 روپے کی رعایت',
  'Free Zinger Burger': 'مفت زنگر برگر',
  'Free Value Meal': 'مفت ویلیو میل',
  'Buy 1 Get 1 Free': 'ایک کے ساتھ ایک مفت',
  'Rs. 50 Off': '50 روپے کی رعایت',
  'Rs. 100 Off': '100 روپے کی رعایت',
  'Rs. 100 Off 3 Rides': '3 سواریوں پر 100 روپے کی رعایت',
  '15% Off': '15% رعایت',
  'Rs. 500 Fuel': '500 روپے کا فیول',
  'Free Monthly Pass': 'مفت ماہانہ پاس',
  'Free 10GB Addon': 'مفت 10GB ایڈون',
  'Free Delivery': 'مفت ہوم ڈیلیوری',
  'Rs. 500 Wallet Credit': '500 روپے کا والٹ کریڈٹ',
  '5% Bill Rebate': 'بل پر 5% رعایت',
  'Rs. 500 Bill Discount': 'بل پر 500 روپے کی رعایت',
  'Free Home Delivery': 'مفت ہوم ڈیلیوری',
  'Rs. 300 Off Grocery': 'گروسری پر 300 روپے کی رعایت',
  'Rs. 500 Voucher': '500 روپے کا واؤچر',
  'Rs. 1000 Voucher': '1000 روپے کا واؤچر',
  'Rs. 1500 Voucher': '1500 روپے کا واؤچر',
  'Rs. 2500 Voucher': '2500 روپے کا واؤچر',
  // Discounts — New
  'Free Combo Meal': 'مفت کومبو میل',
  'Buy 1 Get 1 Pizza': 'ایک پیزا کے ساتھ ایک مفت',
  'Family Pack': 'فیملی پیک',
  'Rs. 500 Dinner Voucher': '500 روپے ڈنر واؤچر',
  '5 Rides 20% Off': '5 سواریوں پر 20% رعایت',
  'Free Weekly Pass': 'مفت ہفتہ وار پاس',
  '10 Free Rides': '10 مفت سواریاں',
  'Rs. 300 Balance': '300 روپے بیلنس',
  'Free 20GB Data': 'مفت 20GB ڈیٹا',
  'Monthly Data Package': 'ماہانہ ڈیٹا پیکج',
  'Rs. 500 Grocery Voucher': '500 روپے گروسری واؤچر',
  'Rs. 500 Off Shoes': 'جوتوں پر 500 روپے کی رعایت',
  'Rs. 1000 Gift Card': '1000 روپے گفٹ کارڈ',
  'Rs. 500 Food Credit': '500 روپے فوڈ کریڈٹ',
  '1 Hour Free Gaming': '1 گھنٹہ مفت گیمنگ',
  '2 Movie Tickets': '2 فلم ٹکٹ',
  '1 Free Game': '1 مفت گیم',
  'Unlimited Rides Pass': 'ان لمیٹڈ رائیڈز پاس',
  'Free Scoop': 'مفت اسکوپ',
  'Buy 1 Get 1 Fries': 'ایک فرائز کے ساتھ ایک مفت',
  '1 Free Ride': '1 مفت سواری',
  'Free 5GB Data': 'مفت 5 جی بی ڈیٹا',
  'Rs. 100 Balance': '100 روپے بیلنس',
  '2 Free Tokens': '2 مفت ٹوکن',
  '30 Mins Free': '30 منٹ مفت',
  'Free Drink': 'مفت ڈرنک',
  'Rs. 500 Off': '500 روپے کی رعایت',
  '10% Rebate': '10% رعایت',
  'Rs. 1000 Bill Discount': 'بل پر 1000 روپے کی رعایت',
  '3 Movie Tickets': '3 فلم ٹکٹ',
  'Free 3 Month Pass': 'مفت 3 ماہ کا پاس',
  'Party Pack': 'پارٹی پیک',
  'Free Month Upgrade': 'مفت ماہانہ اپ گریڈ',
  'Free Appetizer': 'مفت ایپیٹائزر',
  'Rs. 150 Off': '150 روپے کی رعایت',
  '1 Free Ticket': '1 مفت ٹکٹ',
  'Free 10GB Data': 'مفت 10 جی بی ڈیٹا',
  'Rs. 300 Off': '300 روپے کی رعایت',
  'Free Quarter Chicken': 'مفت کواٹر چکن',
  'Free Fries': 'مفت فرائز',
  '5 Rides 10% Off': '5 سواریوں پر 10% رعایت',
  '50% Off Next Ride': 'اگلی سواری پر 50% رعایت',
  '3 Free Deliveries': '3 مفت ڈیلیوری',
  'Free 500 SMS': 'مفت 500 ایس ایم ایس',
  '500 Free Mins': '500 مفت منٹ',
  'Rs. 200 Balance': '200 روپے بیلنس',
  'Free Installation': 'مفت انسٹالیشن',
  'Weekly Internet': 'ہفتہ وار انٹرنیٹ',
  'Rs. 1000 Off': '1000 روپے کی رعایت',
  '20% Off': '20% رعایت',
  'Rs. 500 Card Balance': '500 روپے کارڈ بیلنس',
  '1 Hour Jump Pass': '1 گھنٹہ جمپ پاس',
  'Free Large Popcorn': 'مفت لارج پاپ کارن',
  '1 Free Pass': '1 مفت پاس',

  // Community Goals
  'Plant 100 Trees in Parks': 'پارکوں میں 100 درخت لگانا',
  'Solar Street Lights': 'سولر اسٹریٹ لائٹ کی تنصیب',
  'Beach/Public Space Cleanup': 'ساحل/عوامی مقامات کی صفائی',
  'Sponsor Road/Pothole Repairs': 'سڑکوں/گڑھوں کی مرمت کی فنڈنگ',
  'Animal Rescue & Welfare': 'جانوروں کی فلاح و بہبود',
  'Sponsor Water Tankers': 'واٹر ٹینکرز کی فراہمی',
  'Dengue Fumigation Drive': 'ڈینگی اسپرے مہم',
  'Install Garbage Bins': 'نئے کچرے کے ڈبے لگانا',
  'Fund Sewerage Repairs': 'سیوریج کی مرمت کی فنڈنگ',
  'Free Medical Camp & Meds': 'مفت میڈیکل کیمپ اور ادویات',
  'Rs. 100k Charity Fund': '1 لاکھ روپے چیریٹی فنڈ',
  'Sponsor School Desks & Supplies': 'اسکول ڈیسک اور سامان کی فراہمی',
  'Sponsor Youth Sports Gear': 'کھیلوں کے سامان کی فراہمی',
  'Fund Community Center Repair': 'کمیونٹی سینٹر کی مرمت کی فنڈنگ',
  'Free IT Training Camp': 'مفت آئی ٹی ٹریننگ کیمپ',
  'Fund Local Library': 'لائبریری کی کتابوں اور مرمت کی فنڈنگ',
  'Sponsor Traffic Mirrors/Signs': 'ٹریفک شیشوں/سائنز کی فراہمی',
  'Build Public Restrooms': 'عوامی بیت الخلاء کی تعمیر کی فنڈنگ',
  'Sponsor Street Light Repairs': 'اسٹریٹ لائٹس کی مرمت کی فنڈنگ',
  'Rs. 50k Charity Fund': '50 ہزار روپے چیریٹی فنڈ',
  'Sponsor 50 Ration Bags': '50 راشن بیگز کی فراہمی',
  'Build a Public Bus Shelter': 'عوامی بس شیلٹر کی تعمیر',
  'Local Park Cleanup': 'مقامی پارک کی صفائی',
  'Street Lights Repair': 'اسٹریٹ لائٹس کی مرمت',
  'Pothole Filling': 'گڑھے بھرنا',
  'Minor Road Fixes': 'سڑک کی معمولی مرمت',

  // Categories
  'Food': 'کھانا',
  'Transport': 'ٹرانسپورٹ',
  'Utility': 'یوٹیلیٹی',
  'Shopping': 'خریداری',
  'Entertainment': 'تفریح'
};

const ROMAN_URDU_TRANSLATIONS = {
  // Common Discounts
  'Rs. 50 Off': '50 Rupaye ki Riayat',
  'Rs. 100 Off': '100 Rupaye ki Riayat',
  '15% Off': '15% Riayat',
  '20% Off': '20% Riayat',
  '10% Rebate': '10% Riayat',
  'Rs. 500 Wallet Credit': '500 Rupaye Wallet Credit',
  'Free Delivery': 'Muft Delivery',
  'Free Home Delivery': 'Muft Home Delivery',
  'Rs. 300 Off Grocery': 'Grocery par 300 Rupaye Riayat',
  'Rs. 500 Voucher': '500 Rupaye Voucher',
  'Rs. 1000 Voucher': '1000 Rupaye Voucher',
  'Rs. 1500 Voucher': '1500 Rupaye Voucher',
  'Rs. 2500 Voucher': '2500 Rupaye Voucher',
  
  'Buy 1 Get 1 Pizza': 'Ek ke sath Ek Pizza Muft',
  'Buy 1 Get 1 Fries': 'Ek ke sath Ek Fries Muft',
  'Free 500 SMS': 'Muft 500 SMS',
  '500 Free Mins': 'Muft 500 Mins',
  'Rs. 200 Balance': '200 Rupaye Balance',
  'Free 5GB Data': 'Muft 5GB Data',
  'Free 10GB Data': 'Muft 10GB Data',
  'Free 20GB Data': 'Muft 20GB Data',
  'Weekly Internet': 'Haftawar Internet',
  'Monthly Data Package': 'Mahana Data Package',
  
  '1 Hour Free Gaming': '1 Ghanta Muft Gaming',
  '2 Movie Tickets': '2 Movie Tickets',
  '3 Movie Tickets': '3 Movie Tickets',
  'Unlimited Rides Pass': 'Unlimited Rides Pass',
  'Free Scoop': 'Muft Scoop',
  '1 Free Ride': '1 Muft Ride',
  '5 Rides 10% Off': '5 Rides par 10% Riayat',
  '50% Off Next Ride': 'Agli Ride par 50% Riayat',
  
  // Community Goals
  'Plant 100 Trees in Parks': 'Parks mein 100 Darakht Lagana',
  'Solar Street Lights': 'Solar Street Lights',
  'Beach/Public Space Cleanup': 'Saahil/Awami Maqam ki Safai',
  'Sponsor Road/Pothole Repairs': 'Sarak/Garhay ki Murammat',
  'Animal Rescue & Welfare': 'Janwaron ki Falah',
  'Sponsor Water Tankers': 'Water Tankers ki Farahami',
  'Dengue Fumigation Drive': 'Dengue Spray Muhim',
  'Install Garbage Bins': 'Naye Kachray ke Dabbay Lagana',
  'Fund Sewerage Repairs': 'Sewerage ki Murammat',
  'Free Medical Camp & Meds': 'Muft Medical Camp aur Adwiyat',
  'Rs. 100k Charity Fund': '1 Lakh Rupaye Charity Fund',
  'Sponsor School Desks & Supplies': 'School Desks ki Farahami',
  'Sponsor Youth Sports Gear': 'Khel ke Saman ki Farahami',
  'Fund Community Center Repair': 'Community Center ki Murammat',
  'Free IT Training Camp': 'Muft IT Training Camp',
  'Fund Local Library': 'Library Books aur Murammat ki Funding',
  'Sponsor Traffic Mirrors/Signs': 'Traffic Mirrors ki Farahami',
  'Build Public Restrooms': 'Awami Bait-ul-Khalaa ki Tameer',
  'Sponsor Street Light Repairs': 'Street Lights ki Murammat',
  'Rs. 50k Charity Fund': '50 Hazar Rupaye Charity Fund',
  'Sponsor 50 Ration Bags': '50 Ration Bags ki Farahami',
  'Build a Public Bus Shelter': 'Awami Bus Shelter ki Tameer',
  'Local Park Cleanup': 'Muqami Park ki Safai',
  'Street Lights Repair': 'Street Lights ki Murammat',
  'Pothole Filling': 'Garhay Bharna',
  'Minor Road Fixes': 'Sarak ki Mamooli Murammat',
  
  // Categories
  'Food': 'Khana',
  'Transport': 'Transport',
  'Utility': 'Utility',
  'Shopping': 'Khareedari',
  'Entertainment': 'Tafreeh'
};

const InaamScreen = () => {
  const { colors, isDark } = useTheme();
  const { t, language, toUrduNumerals } = useLanguage();
  const { userStats, rewards, vouchers, redeemReward, contributeToCommunityGoal, streakDay, hasClaimedToday, claimDailyStreak, lastClaimDate, localArea, triggerHaptic, hasClaimedWelcomeGift, claimWelcomeGift, isLoaded, appLaunchCount } = useAppContext();
  const { requireInternet } = useNetwork();
  
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isClaimingWelcome, setIsClaimingWelcome] = useState(false);

  useEffect(() => {
    if (isLoaded && !hasClaimedWelcomeGift) {
      // Small delay to make it feel natural when screen opens
      const timer = setTimeout(() => setShowWelcomeModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, hasClaimedWelcomeGift]);

  const handleClaimWelcomeGift = () => {
    if (isClaimingWelcome || hasClaimedWelcomeGift) return;
    requireInternet(() => {
      setIsClaimingWelcome(true);
      triggerHaptic();
      
      // Call the context function which adds the points
      claimWelcomeGift();
      
      // Close modal and show toast
      setShowWelcomeModal(false);
      
      ToastAndroid.show(
        language === 'ur' ? `خوش آمدید! ${toUrduNumerals('1250')} پوائنٹس شامل کر دیے گئے۔` : 
        language === 'ru' ? 'Welcome! 1250 points shamil kar diye gaye.' :
        'Welcome! 1250 free points added.', 
        ToastAndroid.LONG
      );
    });
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState(null);
  const [showAllVouchers, setShowAllVouchers] = useState(false);
  const [showHowToEarn, setShowHowToEarn] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  
  const [selectedCommunityReward, setSelectedCommunityReward] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showCommunitySuccess, setShowCommunitySuccess] = useState(false);
  const [infoVoucher, setInfoVoucher] = useState(null);

  const CARD_BG     = isDark ? colors.glass : colors.surface;
  const CARD_BORDER = isDark ? colors.glassBorder : colors.border;
  const MUTED       = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,59,36,0.55)';

  const STREAK_POINTS = [25, 50, 75, 100, 125, 150, 200];
  const claimed = hasClaimedToday();

  // Correctly calculate the *actual* next day and points
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const streakBroken = !claimed && lastClaimDate && lastClaimDate !== yesterday;
  const visualStreakDay = claimed ? streakDay : (!lastClaimDate || streakBroken ? 1 : (streakDay >= 7 ? 1 : streakDay + 1));
  const nextPoints = STREAK_POINTS[visualStreakDay - 1];

  const getVoucherDescription = (discount, partner, lang) => {
    if (!discount) return '';
    const l = discount.toLowerCase();
    const p = (partner || '').toLowerCase();
    
    // Ride Hailing & Transport
    if (['indrive', 'yango', 'careem', 'uber', 'bykea', 'airlift', 'swvl'].some(x => p.includes(x))) {
      return lang === 'ur' ? 'اپنی اگلی رائیڈ بک کرنے سے پہلے یہ پرومو کوڈ ایپ میں استعمال کریں۔' : 
             lang === 'sd' ? 'پنهنجي ايندڙ رائيڊ بُڪ ڪرڻ کان اڳ هي پرومو ڪوڊ ايپ ۾ استعمال ڪريو.' : 
             lang === 'ru' ? 'Apni agli ride book karne se pehle yeh promo code app mein istemal karein.' :
             'Apply this promo code in the app before booking your next ride or delivery.';
    }
    
    // Telecom & Internet
    if (['jazz', 'zong', 'telenor', 'ufone', 'ptcl', 'nayatel', 'stormfiber'].some(x => p.includes(x))) {
      return lang === 'ur' ? 'یہ آفر آپ کے متعلقہ نیٹ ورک اکاؤنٹ پر براہ راست شامل کر دی جائے گی۔' : 
             lang === 'sd' ? 'هي آفر توهان جي لاڳاپيل نيٽورڪ اڪائونٽ تي سڌو سنئون شامل ڪئي ويندي.' : 
             lang === 'ru' ? 'Yeh offer aap ke network account par barah-e-raast shamil kar di jayegi.' :
             'This offer will be credited directly to your respective network or broadband account.';
    }

    // Cinema & Entertainment
    if (['cinepax', 'nuplex', 'atrium', 'arena', 'fun city', 'escape', 'bounce', 'onederland'].some(x => p.includes(x))) {
      return lang === 'ur' ? 'ٹکٹ کاؤنٹر پر یا آن لائن بکنگ کے دوران یہ واؤچر دکھا کر تفریح کا مزہ لیں۔' : 
             lang === 'sd' ? 'ٽڪيٽ ڪائونٽر تي يا آن لائن بُڪنگ دوران هي واؤچر ڏيکاري تفريح جو مزو وٺو.' : 
             lang === 'ru' ? 'Ticket counter par ya online booking ke doran yeh voucher dikha kar tafreeh ka maza lein.' :
             'Present this voucher at the ticket counter or apply it during online booking for entertainment.';
    }

    // Default Fallbacks by Discount Type
    if (l.includes('off') || l.includes('discount') || l.includes('rebate')) {
      return lang === 'ur' ? 'اس واؤچر سے آپ کو بل پر خصوصی رعایت ملے گی۔ متعلقہ سروس پر پیش کریں۔' : 
             lang === 'sd' ? 'هن واؤچر سان توهان کي بل تي خاص رعايت ملندي. لاڳاپيل سروس تي پيش ڪريو.' : 
             lang === 'ru' ? 'Is voucher se aap ko bill par khusoosi riayat milegi. Mutalqa service par pesh karein.' :
             'This voucher gives you a special discount on your bill. Present it at the service counter.';
    }
    if (l.includes('free') || l.includes('100%')) {
      return lang === 'ur' ? 'یہ واؤچر آپ کو منتخب آئٹمز بالکل مفت حاصل کرنے کی سہولت دیتا ہے۔' : 
             lang === 'sd' ? 'هي واؤچر توهان کي چونڊيل شيون بلڪل مفت حاصل ڪرڻ جي سهولت ڏئي ٿو.' : 
             lang === 'ru' ? 'Yeh voucher aap ko muntakhab items bilkul muft hasil karne ki sahulat deta hai.' :
             'This voucher allows you to get selected items completely free of charge.';
    }
    if (l.includes('voucher') || l.includes('balance') || l.includes('credit')) {
      return lang === 'ur' ? 'یہ واؤچر کیش کے متبادل کے طور پر استعمال کیا جا سکتا ہے۔ اسے اپنی اگلی خریداری میں استعمال کریں۔' : 
             lang === 'sd' ? 'هي واؤچر ڪيش جي متبادل طور استعمال ٿي سگهي ٿو. ان کي پنهنجي ايندڙ خريداري ۾ استعمال ڪريو.' : 
             lang === 'ru' ? 'Yeh voucher cash ke mutabadil ke tor par istemal kiya ja sakta hai. Ise apni agli khareedari mein istemal karein.' :
             'This acts as a cash equivalent voucher. Apply it towards your next purchase.';
    }
    
    return lang === 'ur' 
      ? 'اس واؤچر کو متعلقہ سروس پر پیش کر کے اپنی آفر کا فائدہ اٹھائیں۔' 
      : lang === 'sd' 
      ? 'هن واؤچر کي لاڳاپيل سروس تي پيش ڪري پنهنجي آفر جو فائدو وٺو.'
      : lang === 'ru'
      ? 'Is voucher ko mutalqa service par pesh kar ke apni offer ka faida uthayein.'
      : 'Present this voucher at the corresponding service to avail your offer.';
  };

  const handleRedeem = (reward) => {
    triggerHaptic();
    requireInternet(() => {
      if (reward.type === 'Community') {
        setSelectedCommunityReward(reward);
        setCustomAmount('');
        setShowCommunityModal(true);
        return;
      }
      
      if (userStats.cityCredits < reward.cost) {
        ToastAndroid.show(t('notEnoughCredits'), ToastAndroid.SHORT);
        return;
      }
      const success = redeemReward(reward.id);
      if (success) {
        setGeneratedVoucher({
          partner: reward.partner,
          discount: reward.discount,
          code: `KCP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        });
        setShowSuccess(true);
      }
    });
  };

  const handleCopy = (code) => {
    requireInternet(() => {
      if (!code) return;
      Clipboard.setString(code);
      ToastAndroid.show(t('voucherCopied', { defaultValue: 'Voucher copied!' }), ToastAndroid.SHORT);
    });
  };

  const handleHowToEarn = () => {
    setShowHowToEarn(!showHowToEarn);
  };

  const handleDailyStreak = () => {
    triggerHaptic();
    requireInternet(() => {
      if (claimed) return;
      const result = claimDailyStreak();
      if (result) {
        ToastAndroid.show(
          `+${result.points} ${language === 'ur' ? 'کریڈٹس حاصل!' : 'Credits Earned!'}`,
          ToastAndroid.SHORT
        );
      }
    });
  };

  const [activeFilter, setActiveFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(5);
  const [sortOrder, setSortOrder] = useState('asc');
  const rewardCategories = ['All', ...new Set((rewards ?? []).filter(r => r.type !== 'Community').map(r => r.type))];

  const filteredRewards = (rewards ?? [])
    .filter(r => r.type !== 'Community' && (activeFilter === 'All' || r.type === activeFilter))
    .sort((a, b) => sortOrder === 'asc' ? a.cost - b.cost : b.cost - a.cost);
  const displayRewards = activeFilter === 'All' ? filteredRewards.slice(0, visibleCount) : filteredRewards;
  const communityRewards = (rewards ?? []).filter(r => r.type === 'Community');

  const localizedArea = t(localArea, { defaultValue: localArea });
  
  const getRivalProgress = (area) => {
    // To ensure the app pulls real data from Firebase, dummy data has been temporarily disabled.
    // The pseudo rival logic gracefully falls back to a default rival.
    //
    // TODO (Firebase Connection): To hook this up to real data smoothly:
    // 1. Define this as state at the top of InaamScreen: const [areas, setAreas] = useState([]);
    // 2. Fetch via useEffect:
    //    useEffect(() => {
    //      firestore().collection('config').doc('neighborhoods').get().then(doc => {
    //        if (doc.exists) setAreas(doc.data().areas || []);
    //      });
    //    }, []);
    const areas = []; /* ['DHA', 'Clifton', 'Gulshan-e-Iqbal', 'Gulistan-e-Jauhar', 'Lyari', 'Korangi', 'Malir', 'Saddar', 'North Nazimabad']; */
    
    // Seed it dynamically based on area length and current day so it changes daily but is stable during a session
    const today = new Date();
    const pseudoSeed = (area || '').length + today.getDate() + today.getMonth();
    
    const otherAreas = areas.filter(a => a !== area);
    const rivalArea = otherAreas[pseudoSeed % otherAreas.length] || 'DHA';
    
    const tasks = [
      { en: 'Local Park Cleanup', ur: 'مقامی پارک کی صفائی' },
      { en: 'Street Lights Repair', ur: 'اسٹریٹ لائٹس کی مرمت' },
      { en: 'Plant 100 Trees', ur: '100 درخت لگانا' },
      { en: 'Dengue Fumigation Drive', ur: 'ڈینگی فیومیگیشن مہم' }
    ];
    
    const task = tasks[pseudoSeed % tasks.length];
    const progress = 80 + (pseudoSeed % 15); // e.g. 80-94%
    
    return {
      area: rivalArea,
      task_en: task.en,
      task_ur: task.ur,
      progress,
      seed: pseudoSeed
    };
  };
  const rivalData = getRivalProgress(localArea);
  const localizedRivalArea = t(rivalData.area, { defaultValue: rivalData.area });

  const getMotivationText = (rivalArea, userArea, lang, seed) => {
    const locRivalArea = t(rivalArea, { defaultValue: rivalArea });
    const locUserArea = t(userArea, { defaultValue: userArea }) || (lang === 'ur' ? 'اپنے علاقے' : lang === 'sd' ? 'پنهنجي علائقي' : 'your area');
    const phrases = [
      { 
        en: `${locRivalArea} is almost completing this goal!\nContribute to help your area ${locUserArea} stay ahead and reach its goals!`, 
        ur: `${locRivalArea} یہ ہدف مکمل کرنے والا ہے!\nاپنے علاقے ${locUserArea} کی مدد کریں تاکہ وہ آگے رہے اور اپنے اہداف حاصل کر سکے!`, 
        sd: `${locRivalArea} هي حدف مڪمل ڪرڻ وارو آهي!\nپنهنجي علائقي ${locUserArea} جي مدد ڪريو ته جيئن اهو اڳتي رهي ۽ پنهنجا حدف حاصل ڪري سگهي!`,
        ru: `${locRivalArea} yeh hadaf mukammal karne wala hai!\nApne ilaqay ${locUserArea} ki madad karein taake woh aagay rahay aur apne ahdaf hasil kar sakay!`
      },
      { 
        en: `${locRivalArea} citizens are working hard!\nStep up for your area ${locUserArea} to stay ahead and reach its goals.`, 
        ur: `${locRivalArea} کے شہری محنت کر رہے ہیں!\nاپنے علاقے ${locUserArea} کے لیے آگے بڑھیں تاکہ وہ آگے رہے اور اپنے اہداف حاصل کر سکے۔`, 
        sd: `${locRivalArea} جا شهري محنت ڪري رهيا آهن!\nپنهنجي علائقي ${locUserArea} لاءِ اڳتي وڌو ته جيئن اهو اڳتي رهي ۽ پنهنجا حدف حاصل ڪري سگهي.`,
        ru: `${locRivalArea} ke shehri mehnat kar rahay hain!\nApne ilaqay ${locUserArea} ke liye aagay barhein taake woh aagay rahay aur apne ahdaf hasil kar sakay.`
      },
      { 
        en: `Competition is tight!\nRepresent your area ${locUserArea} to stay ahead and reach its goals.`, 
        ur: `مقابلہ سخت ہے!\nاپنے علاقے ${locUserArea} کی نمائندگی کریں تاکہ وہ آگے رہے اور اپنے اہداف حاصل کرے۔`, 
        sd: `مقابلو سخت آهي!\nپنهنجي علائقي ${locUserArea} جي نمائندگي ڪريو ته جيئن اهو اڳتي رهي ۽ پنهنجا حدف حاصل ڪري.`,
        ru: `Muqabla sakht hai!\nApne ilaqay ${locUserArea} ki numaindagi karein taake woh aagay rahay aur apne ahdaf hasil karay.`
      },
      { 
        en: `${locRivalArea} is setting the pace today!\nDon't let your area ${locUserArea} fall behind, help it reach its goals!`, 
        ur: `${locRivalArea} آج سب سے آگے ہے!\nاپنے علاقے ${locUserArea} کو پیچھے نہ رہنے دیں، اس کے اہداف حاصل کرنے میں مدد کریں!`, 
        sd: `${locRivalArea} اڄ سڀ کان اڳتي آهي!\nپنهنجي علائقي ${locUserArea} کي پوئتي نه رهڻ ڏيو، ان جا حدف حاصل ڪرڻ ۾ مدد ڪريو!`,
        ru: `${locRivalArea} aaj sab se aagay hai!\nApne ilaqay ${locUserArea} ko peechay na rehne dein, is ke ahdaf hasil karne mein madad karein!`
      }
    ];
    const phrase = phrases[seed % phrases.length];
    return lang === 'ur' ? phrase.ur : lang === 'sd' ? phrase.sd : lang === 'ru' ? phrase.ru : phrase.en;
  };
  const motivationText = getMotivationText(rivalData.area, localArea, language, rivalData.seed);

  // Find the closest reward the user CANNOT currently afford
  const nextGoalReward = [...(rewards ?? [])]
    .filter(r => r.cost > userStats.cityCredits)
    .sort((a, b) => a.cost - b.cost)[0];

  const goalProgress = nextGoalReward 
    ? Math.min((userStats.cityCredits / nextGoalReward.cost) * 100, 100) 
    : 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.screenLabel, { color: colors.primary }]}>{t('cityCredits')}</Text>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{t('Inaam')}</Text>
          </View>
          <View style={[styles.creditPill, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
            <Coins size={14} color={colors.primary} />
            <Text style={[styles.creditPillText, { color: colors.primary }]}>{toUrduNumerals(userStats.cityCredits)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* 7-Day Streak Banner */}
          <View style={[styles.creditBanner, {
            backgroundColor: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(11,94,43,0.07)',
            borderColor: isDark ? 'rgba(34,197,94,0.25)' : 'rgba(11,94,43,0.18)',
            borderTopColor: colors.primary,
            borderTopWidth: 2,
            flexDirection: 'column',
            alignItems: 'stretch',
          }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Award size={18} color={MUTED} />
                <Text style={{ color: MUTED, fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>{t('cityCredits')}</Text>
              </View>
              <Text style={[styles.bannerLabel, { color: MUTED, fontSize: 12, marginBottom: 2 }]}>{t('availableBalance')}</Text>
              <Text style={[styles.bannerValue, { color: colors.primary, fontSize: 56, lineHeight: 60, textAlign: 'center' }]} adjustsFontSizeToFit numberOfLines={1}>
                {toUrduNumerals(Math.floor(userStats.cityCredits).toLocaleString())}
              </Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.earnBtn, { backgroundColor: claimed ? MUTED : colors.primary, justifyContent: 'center', paddingVertical: 12 }]} 
                onPress={handleDailyStreak}
                disabled={claimed}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={claimed ? t('alreadyClaimed') : t('claimNow')}
              >
                {claimed ? <CheckCircle2 size={16} color="#fff" /> : <Flame size={16} color="#fff" />}
                <Text style={[styles.earnBtnText, { fontSize: 15, textAlign: 'center' }]}>
                  {claimed ? t('alreadyClaimed') : `${t('claimNow')} +${toUrduNumerals(nextPoints)}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.earnBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary, justifyContent: 'center', paddingVertical: 12 }]} onPress={handleHowToEarn}>
                <Text style={[styles.earnBtnText, { color: colors.primary, fontSize: 15, textAlign: 'center' }]}>{showHowToEarn ? t('hideInfo') : t('howToEarn')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Streak Progress Indicator */}
          <View style={[styles.streakContainer, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
            <View style={styles.streakHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Flame size={16} color="#F59E0B" />
                <Text style={[styles.streakTitle, { color: colors.text }]}>{t('dailyStreak')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStreakInfo(true)}>
                <Info size={16} color={MUTED} />
              </TouchableOpacity>
            </View>
            <View style={styles.streakDaysRow}>
              {STREAK_POINTS.map((pts, idx) => {
                const dayNum = idx + 1;
                const isCurrent = dayNum === visualStreakDay;
                const isCompleted = claimed ? dayNum <= visualStreakDay : dayNum < visualStreakDay;
                const isFuture = claimed ? dayNum > visualStreakDay : dayNum > visualStreakDay;
                return (
                  <View key={dayNum} style={styles.streakDayCol}>
                    <View style={[
                      styles.streakDayCircle,
                      {
                        backgroundColor: isCompleted ? colors.primary : (isCurrent && !claimed ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')),
                        borderColor: isCompleted ? colors.primary : (isCurrent && !claimed ? '#F59E0B' : CARD_BORDER),
                      }
                    ]}>
                      {isCompleted ? (
                        <CheckCircle2 size={14} color="#fff" />
                      ) : (
                        <Text style={[styles.streakDayNum, { color: isCurrent && !claimed ? '#fff' : (isDark ? MUTED : '#111111') }]}>{toUrduNumerals(dayNum)}</Text>
                      )}
                    </View>
                    <Text style={[styles.streakDayPts, { color: isCurrent ? (claimed ? colors.primary : '#F59E0B') : (isDark ? MUTED : '#111111') }]}>
                      +{toUrduNumerals(pts)}
                    </Text>
                  </View>
                );
              })}
            </View>
            {visualStreakDay === 7 && claimed && (
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
                {t('streakComplete')} {t('streakRestartTomorrow')}
              </Text>
            )}
          </View>

          {/* Next Reward Goal Progress */}
          {nextGoalReward && (
            <View style={[styles.goalContainer, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalTitle, { color: colors.text }]}>
                  {t('nextGoal')}: {language === 'ur' ? URDU_TRANSLATIONS[nextGoalReward.partner] || nextGoalReward.partner : nextGoalReward.partner}
                </Text>
                <Text style={[styles.goalAmount, { color: isDark ? MUTED : '#111111' }]}>
                  {toUrduNumerals(nextGoalReward.cost - userStats.cityCredits)} {t('moreNeeded')}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${goalProgress}%` }]} />
              </View>
            </View>
          )}

          {showHowToEarn && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: MUTED }]}>{t('tieredRewardSystem')}</Text>
              <View style={[styles.rewardsList, { backgroundColor: CARD_BG, borderColor: CARD_BORDER, padding: 16 }]}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 12, lineHeight: 20 }}>
                  {language === 'ur' ? toUrduNumerals(t('dailyRewardsDesc')) : t('dailyRewardsDesc')}
                </Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 14, lineHeight: 20 }}>
                  {language === 'ur' ? toUrduNumerals(t('earnCreditsDesc')) : t('earnCreditsDesc')}
                </Text>
                
                <View style={styles.tierRow}>
                  <Text style={[styles.tierLabel, { color: MUTED, fontSize: language === 'ur' ? 14 : 13 }]}>{toUrduNumerals(t('verifications1_10'))}</Text>
                  <Text style={[styles.tierValue, { color: colors.primary, fontSize: language === 'ur' ? 15 : 14 }]}>{toUrduNumerals(t('plus150Credits'))}</Text>
                </View>
                <View style={styles.tierRow}>
                  <Text style={[styles.tierLabel, { color: MUTED, fontSize: language === 'ur' ? 14 : 13 }]}>{toUrduNumerals(t('verifications11_20'))}</Text>
                  <Text style={[styles.tierValue, { color: colors.primary, fontSize: language === 'ur' ? 15 : 14 }]}>{toUrduNumerals(t('plus75Credits'))}</Text>
                </View>
                <View style={styles.tierRow}>
                  <Text style={[styles.tierLabel, { color: MUTED, fontSize: language === 'ur' ? 14 : 13 }]}>{toUrduNumerals(t('verifications21_30'))}</Text>
                  <Text style={[styles.tierValue, { color: colors.primary, fontSize: language === 'ur' ? 15 : 14 }]}>{toUrduNumerals(t('plus25Credits'))}</Text>
                </View>
                <View style={[styles.tierRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Text style={[styles.tierLabel, { color: MUTED, fontSize: language === 'ur' ? 14 : 13 }]}>{toUrduNumerals(t('verifications31plus'))}</Text>
                  <Text style={[styles.tierValue, { color: colors.text, fontSize: language === 'ur' ? 15 : 14 }]}>{toUrduNumerals(t('fullyValidated'))}</Text>
                </View>
                
                <View style={[styles.rowDivider, { backgroundColor: CARD_BORDER, marginVertical: 14, marginHorizontal: 0 }]} />
                
                <Text style={{ color: colors.text, fontSize: language === 'ur' ? 14 : 13, fontWeight: '600', lineHeight: 22 }}>
                  {t('verifyOthersDesc')} <Text style={{color: colors.primary, fontWeight: '900'}}>{toUrduNumerals(t('plus10Credits'))}</Text> {t('forParticipation')}
                </Text>
              </View>
            </View>
          )}

          {/* Local Partnerships — rewards in a contained card */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: MUTED, marginBottom: 0 }]}>{t('localPartnerships')}</Text>
              <TouchableOpacity 
                onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} 
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: CARD_BORDER }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' }}>
                  {sortOrder === 'asc' 
                    ? (language === 'ru' ? ROMAN_URDU_TRANSLATIONS['cheapToHigh'] : t('cheapToHigh', {defaultValue: 'Low to High'})) 
                    : (language === 'ru' ? ROMAN_URDU_TRANSLATIONS['highToCheap'] : t('highToCheap', {defaultValue: 'High to Low'}))}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {rewardCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setActiveFilter(cat);
                    setVisibleCount(5);
                  }}
                  style={[
                    styles.filterPill,
                    { 
                      backgroundColor: activeFilter === cat ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                      borderColor: activeFilter === cat ? colors.primary : CARD_BORDER,
                    }
                  ]}
                  accessible={true}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeFilter === cat }}
                  accessibilityLabel={cat === 'All' ? t('filterAll', { defaultValue: 'All' }) : cat}
                >
                  <Text style={[
                    styles.filterPillText, 
                    { color: activeFilter === cat ? '#fff' : (isDark ? MUTED : '#111111') }
                  ]}>
                    {language === 'ur' && cat !== 'All' ? URDU_TRANSLATIONS[cat] || cat : language === 'ru' && cat !== 'All' ? ROMAN_URDU_TRANSLATIONS[cat] || cat : (cat === 'All' ? t('filterAll', { defaultValue: 'All' }) : cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.rewardsList, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
              {displayRewards.map((reward, idx) => {
                const can = userStats.cityCredits >= reward.cost;
                const isLast = idx === displayRewards.length - 1;
                const translatedPartner = language === 'ur' || language === 'sd' 
                  ? (URDU_TRANSLATIONS[reward.partner] || reward.partner) 
                  : language === 'ru' 
                  ? (ROMAN_URDU_TRANSLATIONS[reward.partner] || reward.partner) 
                  : reward.partner;
                const mono = translatedPartner.substring(0, 2).toUpperCase();

                return (
                  <View key={reward.id}>
                    <TouchableOpacity
                      style={styles.rewardRow}
                      onPress={() => {
                        triggerHaptic();
                        setInfoVoucher(reward);
                      }}
                      activeOpacity={0.8}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={t('redeemReward', { defaultValue: 'View Reward Details' })}
                    >
                      {/* Rounded-square partner monogram */}
                      <View style={[styles.rewardIcon, {
                        backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(11,59,36,0.08)',
                        borderColor: isDark ? colors.glassBorder : colors.border,
                      }]}>
                        <Text style={[styles.rewardMono, { color: colors.primary }]}>{mono}</Text>
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text style={[styles.rewardPartner, { color: colors.text, textAlign: 'left' }]}>
                          {language === 'ur' ? URDU_TRANSLATIONS[reward.partner] || reward.partner : reward.partner}
                        </Text>
                        <Text style={[styles.rewardDiscount, { color: colors.primary, textAlign: 'left' }]}>
                          {toUrduNumerals(language === 'ur' ? URDU_TRANSLATIONS[reward.discount] || reward.discount : reward.discount)}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.costChip, {
                          backgroundColor: can ? colors.primaryGlow : 'rgba(239,68,68,0.12)',
                          borderColor: can ? colors.primary : colors.danger,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 12,
                          minWidth: 72,
                          justifyContent: 'center'
                        }]}
                        activeOpacity={0.8}
                        onPress={(e) => {
                          if (e && e.stopPropagation) e.stopPropagation();
                          handleRedeem(reward);
                        }}
                      >
                        <Coins size={14} color={can ? colors.primary : colors.danger} />
                        <Text style={[styles.costText, { color: can ? colors.primary : colors.danger, fontSize: 13, fontWeight: '800' }]}>{toUrduNumerals(reward.cost)}</Text>
                      </TouchableOpacity>
                      {language === 'ur' ? <ChevronLeft size={16} color={MUTED} /> : <ChevronRight size={16} color={MUTED} />}
                    </TouchableOpacity>
                    {!isLast && <View style={[styles.rowDivider, { backgroundColor: CARD_BORDER }]} />}
                  </View>
                );
              })}
              {(!rewards || displayRewards.length === 0) && (
                <View style={styles.emptyState}>
                  <Tag size={28} color={MUTED} strokeWidth={1.5} />
                  <Text style={[styles.emptyText, { color: MUTED }]}>{t('noRewardsYet')}</Text>
                </View>
              )}
              {activeFilter === 'All' && filteredRewards.length > 5 && (
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={{ 
                    paddingVertical: 16, 
                    alignItems: 'center', 
                    borderTopWidth: 1, 
                    borderTopColor: CARD_BORDER,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                  }} 
                  onPress={() => {
                    if (visibleCount >= filteredRewards.length) {
                      setVisibleCount(5);
                    } else if (visibleCount === 5) {
                      setVisibleCount(10);
                    } else if (visibleCount === 10) {
                      setVisibleCount(15);
                    } else {
                      setVisibleCount(filteredRewards.length);
                    }
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }}>
                    {language === 'ur' 
                      ? (visibleCount >= filteredRewards.length ? 'کم واؤچرز دیکھیں' : (visibleCount >= 15 ? 'تمام واؤچرز دیکھیں' : 'مزید واؤچرز دیکھیں'))
                      : (visibleCount >= filteredRewards.length ? t('seeLess', {defaultValue: 'See Less Vouchers'}) : (visibleCount >= 15 ? t('seeAllVouchers', {defaultValue: 'See All Vouchers'}) : t('seeMoreVouchers', {defaultValue: 'See More Vouchers'})))}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Civic & Community Goals */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#111111', marginBottom: 0, fontSize: 20, fontWeight: '900', letterSpacing: 0.5 }]}>
                {language === 'ur' ? 'شہری اور سماجی اہداف' : language === 'ru' ? 'SHEHRI AUR SAMAJI AHDAF' : 'CIVIC & COMMUNITY GOALS'}
              </Text>
            </View>
            <View style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(11,94,43,0.05)', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(34,197,94,0.25)' : 'rgba(11,94,43,0.15)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Users size={20} color={isDark ? colors.primary : '#111111'} />
                <Text style={{ flex: 1, color: isDark ? colors.primary : '#111111', fontWeight: '900', fontSize: 16 }}>
                  {language === 'ur' ? `اپنے علاقے کے ساتھ مل کر کام کریں!` : language === 'ru' ? `Apne ilaqay ke sath mil kar kaam karein!` : `Join forces with your area!`}
                </Text>
              </View>
              <Text style={{ color: isDark ? colors.text : '#111111', fontSize: 13, lineHeight: 21, opacity: 0.9 }}>
                {language === 'ur' 
                  ? `یہ اہداف صرف ${localizedArea} کے لیے ہیں! جب تمام شہری مل کر ہدف پورا کریں گے، تو اس کا فائدہ آپ کے پورے علاقے کو ہوگا۔ آپ کسٹم اماؤنٹ یا کم سے کم ${toUrduNumerals(50)} پوائنٹس بھی دے سکتے ہیں۔ آپ کی چھوٹی یا بڑی شراکت کمیونٹی کو بہتر بنانے کے لیے بہت اہم ہے!` 
                  : language === 'ru'
                  ? `Yeh ahdaf sirf ${localizedArea} ke liye hain! Jab tamam shehri mil kar hadaf poora karein ge, to is ka faida aap ke pooray ilaqay ko hoga. Aap custom amount ya kam se kam 50 points bhi de sakte hain. Aap ki choti ya bari shirakat community ko behtar banane ke liye bohat aham hai!`
                  : `Exclusive to ${localizedArea}! These civic goals require local citizens to participate. Once the goal is reached, the entire area will benefit! You can contribute a custom amount or as low as 50 points. Your smallest contributions count just as much as large contributions towards improving your community!`}
              </Text>
            </View>

            {/* Sleek Minimal Progress Banner */}
            <View style={{ 
              backgroundColor: isDark ? colors.surfaceElevated : '#fff', 
              paddingHorizontal: 20,
              paddingVertical: 18, 
              borderRadius: 20, 
              marginBottom: 20, 
              borderWidth: 1, 
              borderColor: isDark ? colors.glassBorder : '#F0F3F1',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 }}>
                {/* Left Icon */}
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#E7F1E9', justifyContent: 'center', alignItems: 'center' }}>
                  <Target size={24} color={isDark ? colors.primary : '#0B5E2B'} strokeWidth={2} />
                </View>
                
                {/* Center Content */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#889890', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, textAlign: 'left' }}>
                    {language === 'ur' ? `${localizedRivalArea} کا ہدف` : language === 'sd' ? `${localizedRivalArea} جو حدف` : language === 'ru' ? `${localizedRivalArea} KA HADAF` : `${localizedRivalArea} GOAL`}
                  </Text>
                  <Text style={{ color: isDark ? colors.text : '#051912', fontSize: 16, fontWeight: '800', letterSpacing: -0.2, textAlign: 'left' }}>
                    {language === 'ur' ? rivalData.task_ur : language === 'ru' ? (ROMAN_URDU_TRANSLATIONS[rivalData.task_en] || rivalData.task_en) : rivalData.task_en}
                  </Text>
                </View>
                
                {/* Right Content */}
                <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 45 }}>
                  <Text style={{ color: isDark ? colors.primary : '#0B5E2B', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>
                    {language === 'ur' || language === 'sd' ? `%${toUrduNumerals(rivalData.progress)}` : `${rivalData.progress}%`}
                  </Text>
                  <Text style={{ color: '#889890', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: -2, letterSpacing: 0.5, textAlign: 'center' }}>
                    {language === 'ur' ? 'مکمل' : language === 'sd' ? 'مڪمل' : language === 'ru' ? 'MUKAMMAL' : 'DONE'}
                  </Text>
                </View>
              </View>
              
              {/* Segmented Progress Bar */}
              <View style={{ flexDirection: 'row', height: 10, gap: 4 }}>
                {[...Array(10)].map((_, i) => {
                  const isActive = (i + 1) * 10 <= rivalData.progress;
                  const isPartial = i * 10 < rivalData.progress && (i + 1) * 10 > rivalData.progress;
                  const partialWidth = isPartial ? `${(rivalData.progress % 10) * 10}%` : '0%';
                  return (
                    <View key={i} style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F5F4', borderRadius: 5, overflow: 'hidden' }}>
                      {isActive && <View style={{ width: '100%', height: '100%', backgroundColor: isDark ? colors.primary : '#0B5E2B', borderRadius: 5 }} />}
                      {isPartial && <View style={{ width: partialWidth, height: '100%', backgroundColor: isDark ? colors.primary : '#0B5E2B', borderRadius: 5 }} />}
                    </View>
                  );
                })}
              </View>
              
              <Text style={{ color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 12, textAlign: 'center', letterSpacing: 0.2, lineHeight: 20 }}>
                {motivationText}
              </Text>
            </View>

            <View style={{ backgroundColor: 'transparent' }}>
              {communityRewards.map((reward, idx) => {
                const can = userStats.cityCredits >= reward.cost;
                const isLast = idx === communityRewards.length - 1;
                const progressPct = Math.min((reward.contributed / reward.goal) * 100, 100);
                const localizedDiscount = language === 'ur' || language === 'sd' ? (URDU_TRANSLATIONS[reward.discount] || reward.discount) : language === 'ru' ? (ROMAN_URDU_TRANSLATIONS[reward.discount] || reward.discount) : reward.discount;
                const localizedPartner = language === 'ur' || language === 'sd' ? (URDU_TRANSLATIONS[reward.partner] || reward.partner) : language === 'ru' ? (ROMAN_URDU_TRANSLATIONS[reward.partner] || reward.partner) : reward.partner;

                return (
                  <View key={reward.id}>
                    <TouchableOpacity
                      style={[{ 
                        backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        marginBottom: isLast ? 0 : 16,
                        shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.15 : 0.05, shadowRadius: 16, elevation: 2,
                        overflow: 'hidden'
                      }]}
                      onPress={() => {
                        triggerHaptic();
                        if (userStats.cityCredits < 50) {
                           const msg = language === 'ur' ? 'تعاون کے لیے کم از کم 50 پوائنٹس درکار ہیں' : language === 'sd' ? 'تعاون لاءِ گهٽ ۾ گهٽ 50 پوائنٽس گهربل آهن' : language === 'ru' ? 'Contribute karne ke liye kam az kam 50 points darkar hain' : 'Minimum 50 points required to contribute!';
                           ToastAndroid.show(msg, ToastAndroid.SHORT);
                           return;
                        }
                        setSelectedCommunityReward(reward);
                        setCustomAmount('');
                        setShowCommunityModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
                         <View style={{ width: `${progressPct}%`, backgroundColor: isDark ? 'rgba(34,197,94,0.35)' : 'rgba(11,94,43,0.25)' }} />
                      </View>

                      <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginEnd: 24 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                            <View style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginEnd: 8, marginBottom: 4 }}>
                               <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                                  {toUrduNumerals(Math.floor(progressPct))}% {language === 'ur' ? 'مکمل' : language === 'ru' ? 'MUKAMMAL' : 'FUNDED'}
                               </Text>
                            </View>
                            <Text style={{ color: MUTED, fontSize: 13, fontWeight: '700', flexShrink: 1, marginBottom: 4 }}>
                              {toUrduNumerals(reward.contributed.toLocaleString())} / {toUrduNumerals(reward.goal.toLocaleString())}
                            </Text>
                          </View>
                          
                          <Text style={{ color: isDark ? '#FFFFFF' : '#051912', fontSize: 17, fontWeight: '900', lineHeight: 24, letterSpacing: -0.3, textAlign: 'left', marginBottom: 6, flexShrink: 1 }} numberOfLines={2}>
                            {toUrduNumerals(localizedDiscount)}
                          </Text>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                             <Users size={16} color={MUTED} style={{ marginEnd: 6 }} />
                             <Text style={{ color: MUTED, fontSize: 14, fontWeight: '700', textAlign: 'left', flexShrink: 1 }} numberOfLines={1}>
                               {localizedPartner}
                           </Text>
                          </View>
                        </View>
                        
                        <TouchableOpacity 
                          style={{
                            backgroundColor: can ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'),
                            paddingHorizontal: 18,
                            paddingVertical: 18,
                            borderRadius: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 84,
                            borderWidth: 1,
                            borderColor: can ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                            shadowColor: can ? colors.primary : '#000',
                            shadowOffset: { width: 0, height: can ? 4 : 0 },
                            shadowOpacity: can ? 0.3 : 0,
                            shadowRadius: 8,
                          }}
                          activeOpacity={0.7}
                          onPress={(e) => {
                            if (e && e.stopPropagation) e.stopPropagation();
                            if (userStats.cityCredits < reward.cost) {
                               const msg = language === 'ur' ? 'کافی پوائنٹس نہیں ہیں' : language === 'ru' ? 'Kafi points nahi hain' : 'Not enough points!';
                               ToastAndroid.show(msg, ToastAndroid.SHORT);
                               return;
                            }
                            triggerHaptic();
                            requireInternet(() => {
                              const isCompleted = contributeToCommunityGoal(reward.id, reward.cost);
                              if (isCompleted) {
                                setShowCommunitySuccess(true);
                                NotificationService.showCommunityGoalReachedNotification(
                                  localizedArea, 
                                  language === 'ur' ? URDU_TRANSLATIONS[reward.discount] || reward.discount : reward.discount
                                );
                              } else {
                                ToastAndroid.show(language === 'ur' ? 'حصہ ڈالنے کا شکریہ!' : 'Thanks for contributing!', ToastAndroid.SHORT);
                              }
                            });
                          }}
                        >
                          <Text style={{ color: can ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000'), fontSize: 17, fontWeight: '900' }}>
                             {toUrduNumerals(reward.cost)}
                          </Text>
                          <Text style={{ color: can ? 'rgba(255,255,255,0.8)' : (isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)'), fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>
                             {language === 'ur' ? 'پوائنٹس' : 'PTS'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>

          {/* My Vouchers */}
          {vouchers && vouchers.length > 0 && (
            <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: MUTED }]}>{t('myVouchers')} ({toUrduNumerals(vouchers.length)})</Text>
              {vouchers.length > 3 && (
                <TouchableOpacity onPress={() => setShowAllVouchers(v => !v)}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>
                    {showAllVouchers ? t('showLess') : t('seeAll')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {((showAllVouchers ? vouchers : (vouchers || []).slice(0, 3)) || []).map((v) => (
              <View key={v.id} style={[styles.voucherCard, { backgroundColor: CARD_BG, borderColor: colors.primary }]}>
                {/* Left ticket accent */}
                <View style={[styles.voucherLeft, { backgroundColor: colors.primaryGlow }]}>
                  <Ticket size={18} color={colors.primary} />
                </View>
                {/* Dashed divider */}
                <View style={[styles.voucherDash, { borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgba(11,94,43,0.3)' }]} />
                <View style={styles.voucherInfo}>
                  <Text style={[styles.voucherPartner, { color: MUTED }]}>{language === 'ur' ? URDU_TRANSLATIONS[v.partner] || v.partner : v.partner}</Text>
                  <Text style={[styles.voucherCode, { color: colors.primary }]}>{v.code}</Text>
                  {!!v.expiry && <Text style={[styles.voucherExpiry, { color: MUTED }]}>{language === 'ur' ? 'ختم ہونے کی تاریخ:' : 'Expires:'} {toUrduNumerals(v.expiry)}</Text>}
                </View>
                <TouchableOpacity style={[styles.copyBtn, { borderColor: CARD_BORDER }]} onPress={() => handleCopy(v.code)}>
                  <Copy size={16} color={MUTED} />
                </TouchableOpacity>
              </View>
            ))}
            </View>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Voucher Info Modal */}
        <Modal visible={!!infoVoucher} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.successModal, {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: CARD_BORDER,
            }]}>
              <TouchableOpacity 
                style={[styles.closeBtn, { 
                  padding: 10, 
                  top: 14, 
                  zIndex: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 20
                }, language === 'ur' ? { left: 14, right: undefined } : { right: 14, left: undefined }]} 
                onPress={() => setInfoVoucher(null)}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={[styles.successCircle, { backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : '#F0FDF4', borderColor: colors.primary, marginTop: 10 }]}>
                <Text style={{ fontSize: 32, fontWeight: '900', color: colors.primary, letterSpacing: 1 }}>
                  {infoVoucher?.partner ? (
                    language === 'ur' || language === 'sd' ? (URDU_TRANSLATIONS[infoVoucher.partner] || infoVoucher.partner) : 
                    language === 'ru' ? (ROMAN_URDU_TRANSLATIONS[infoVoucher.partner] || infoVoucher.partner) : 
                    infoVoucher.partner
                  ).substring(0, 2).toUpperCase() : ''}
                </Text>
              </View>
              <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', fontSize: 26 }]}>
                {infoVoucher?.partner && (language === 'ur' ? URDU_TRANSLATIONS[infoVoucher.partner] || infoVoucher.partner : language === 'ru' ? ROMAN_URDU_TRANSLATIONS[infoVoucher.partner] || infoVoucher.partner : infoVoucher.partner)}
              </Text>
              <Text style={[styles.modalSub, { color: colors.primary, textAlign: 'center', fontSize: 20, marginTop: 4, marginBottom: 16, fontWeight: '900' }]}>
                {infoVoucher?.discount && (
                  language === 'ur' || language === 'sd' ? toUrduNumerals(URDU_TRANSLATIONS[infoVoucher.discount] || infoVoucher.discount) : 
                  language === 'ru' ? (ROMAN_URDU_TRANSLATIONS[infoVoucher.discount] || infoVoucher.discount) : 
                  infoVoucher.discount
                )}
              </Text>
              
              <Text style={{ color: colors.text, fontSize: 17, textAlign: 'center', lineHeight: 26, marginBottom: 14, fontWeight: '600' }}>
                {getVoucherDescription(infoVoucher?.discount, infoVoucher?.partner, language)}
              </Text>
              <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                {language === 'ur' 
                  ? 'یہ ڈسکاؤنٹ کلیم کرنے کے بعد 30 دن تک کارآمد رہے گا۔' 
                  : language === 'sd' 
                  ? 'هي ڊسڪائونٽ ڪليم ڪرڻ کان پوءِ 30 ڏينهن تائين ڪارآمد رهندو.'
                  : language === 'ru'
                  ? 'Yeh discount claim karne ke baad 30 din tak kaaramad rahega.'
                  : 'Valid for 30 days after claiming. Cannot be combined with other offers.'}
              </Text>
              
              <TouchableOpacity 
                style={[styles.copyFullBtn, { backgroundColor: colors.primary, width: '100%', justifyContent: 'center', paddingVertical: 18, borderRadius: 16 }]} 
                onPress={() => {
                  const rew = infoVoucher;
                  setInfoVoucher(null);
                  handleRedeem(rew);
                }}
              >
                <Coins size={24} color="#fff" />
                <Text style={[styles.copyFullText, { fontSize: 18 }]}>
                  {language === 'ur' ? 'واؤچر حاصل کریں' : language === 'sd' ? 'واؤچر حاصل ڪريو' : 'Claim Voucher'} ({toUrduNumerals(infoVoucher?.cost)})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Streak Info Modal */}
        <Modal visible={showStreakInfo} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.successModal, {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: CARD_BORDER,
            }]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowStreakInfo(false)}>
                <X size={20} color={MUTED} />
              </TouchableOpacity>
              <View style={[styles.successCircle, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEFCE8', borderColor: '#F59E0B' }]}>
                <Flame size={40} color="#F59E0B" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('streakInfoTitle')}</Text>
              {language === 'ur' ? (
                <>
                  <Text style={[styles.modalSub, { color: MUTED, textAlign: 'center', lineHeight: 20, width: '100%' }]}>
                    روزانہ مفت پوائنٹس حاصل کریں! ہر دن انعام بڑھتا ہے:
                  </Text>
                  <View style={{ alignSelf: 'center', marginBottom: 18 }}>
                    {STREAK_POINTS.map((pts, i) => (
                      <Text key={i} style={{ color: MUTED, fontSize: 13, marginVertical: 3, textAlign: 'right' }}>
                        🔹 دن {toUrduNumerals(i + 1)}: {toUrduNumerals(pts)} پوائنٹس {i === 6 ? '🎉' : ''}
                      </Text>
                    ))}
                  </View>
                  <Text style={[styles.modalSub, { color: MUTED, textAlign: 'center', lineHeight: 20, width: '100%', marginBottom: 18 }]}>
                    دن {toUrduNumerals(7)} کے بعد اسٹریک دوبارہ شروع ہوتا ہے۔ ایک دن چھوڑیں تو بھی دوبارہ شروع!
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.modalSub, { color: MUTED, textAlign: 'center', lineHeight: 20, width: '100%' }]}>
                    Claim free points daily! Rewards grow each day:
                  </Text>
                  <View style={{ alignSelf: 'center', marginBottom: 18 }}>
                    {STREAK_POINTS.map((pts, i) => (
                      <Text key={i} style={{ color: MUTED, fontSize: 13, marginVertical: 3, textAlign: 'left' }}>
                        🔹 Day {i + 1}: {pts} pts {i === 6 ? '🎉' : ''}
                      </Text>
                    ))}
                  </View>
                  <Text style={[styles.modalSub, { color: MUTED, textAlign: 'center', lineHeight: 20, width: '100%', marginBottom: 18 }]}>
                    After Day 7, the streak resets. Miss a day and it resets too!
                  </Text>
                </>
              )}
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowStreakInfo(false)}>
                <Text style={styles.doneBtnText}>{t('gotIt')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.successModal, {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: colors.primary,
            }]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSuccess(false)}>
                <X size={20} color={MUTED} />
              </TouchableOpacity>
              <View style={[styles.successCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                <CheckCircle2 size={48} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('rewardRedeemed')}</Text>
              <Text style={[styles.modalSub, { color: MUTED }]}>
                {generatedVoucher?.partner} · {generatedVoucher?.discount}
              </Text>
              <View style={[styles.codeBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,59,36,0.04)', borderColor: CARD_BORDER }]}>
                <Text style={[styles.codeLabel, { color: MUTED }]}>{t('voucherCode')}</Text>
                <Text style={[styles.codeValue, { color: colors.text }]}>{generatedVoucher?.code}</Text>
                <TouchableOpacity style={[styles.copyFullBtn, { backgroundColor: colors.primary }]} onPress={() => handleCopy(generatedVoucher?.code)}>
                  <Copy size={14} color="#fff" />
                  <Text style={styles.copyFullText}>{t('copyCode')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.expiryText, { color: MUTED }]}>{t('expiresIn7Days')}</Text>
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSuccess(false)}>
                <Text style={styles.doneBtnText}>{t('Done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Community Contribution Modal */}
        <Modal visible={showCommunityModal} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
            <View style={{
              width: '90%', maxWidth: 360, backgroundColor: isDark ? colors.surfaceElevated : '#fff', 
              borderRadius: 24, padding: 24, alignItems: 'center', 
              borderWidth: 1, borderColor: colors.primaryGlow,
              shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10
            }}>
              <TouchableOpacity 
                style={[
                  { position: 'absolute', top: 14, padding: 10, zIndex: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 24 },
                  language === 'ur' ? { left: 14 } : { right: 14 }
                ]} 
                onPress={() => setShowCommunityModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryGlow, justifyContent: 'center', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
                <Users size={32} color={colors.primary} />
              </View>
              
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {language === 'ur' ? 'کمیونٹی فنڈ' : language === 'sd' ? 'ڪميونٽي فنڊ' : language === 'ru' ? 'COMMUNITY FUND' : 'COMMUNITY FUND'}
              </Text>
              
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 }}>
                {language === 'ur' 
                  ? toUrduNumerals(URDU_TRANSLATIONS[selectedCommunityReward?.discount] || selectedCommunityReward?.discount) 
                  : language === 'ru' 
                  ? (ROMAN_URDU_TRANSLATIONS[selectedCommunityReward?.discount] || selectedCommunityReward?.discount)
                  : selectedCommunityReward?.discount}
              </Text>
              
              <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                {language === 'ur' 
                  ? 'اپنی مرضی کی رقم درج کریں اور اپنے علاقے کی بہتری میں حصہ ڈالیں۔' 
                  : language === 'ru'
                  ? 'Apni marzi ki raqam darj karein aur apne ilaqay ki behtari mein hissa dalein.'
                  : 'Enter any amount to contribute towards completing this civic goal for your area.'}
              </Text>

              {/* Quick Select Buttons */}
              <View style={{ flexDirection: 'row', width: '100%', gap: 12, marginBottom: 16 }}>
                {[50, 100, 500].map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 2, 
                      borderColor: customAmount === String(amt) ? colors.primary : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                      backgroundColor: customAmount === String(amt) ? colors.primaryGlow : 'transparent',
                      alignItems: 'center'
                    }}
                    onPress={() => { triggerHaptic(); setCustomAmount(String(amt)); }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: customAmount === String(amt) ? colors.primary : (isDark ? MUTED : '#111111') }}>+{toUrduNumerals(amt)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Amount Input Container */}
              <View style={{
                width: '100%', backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F9FAFB',
                borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                borderRadius: 16, flexDirection: language === 'ur' ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 24
              }}>
                <Coins size={20} color={MUTED} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'left' }}
                  placeholder={toUrduNumerals("0")}
                  placeholderTextColor={MUTED}
                  keyboardType="numeric"
                  value={toUrduNumerals(customAmount)}
                  onChangeText={(txt) => {
                    const engText = txt.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632)
                                       .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776)
                                       .replace(/[^0-9]/g, '');
                    setCustomAmount(engText);
                  }}
                  maxLength={6}
                />
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '800' }}>{language === 'ur' ? 'پوائنٹس' : 'PTS'}</Text>
              </View>
              
              <TouchableOpacity 
                style={{
                  width: '100%', backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6
                }} 
                onPress={() => {
                  triggerHaptic();
                  requireInternet(() => {
                    const amt = parseInt(customAmount);
                    if (!amt || isNaN(amt) || amt <= 0) {
                      ToastAndroid.show(language === 'ur' ? 'درست رقم درج کریں' : 'Enter a valid amount.', ToastAndroid.SHORT);
                      return;
                    }
                    if (amt > userStats.cityCredits) {
                      ToastAndroid.show(t('notEnoughCredits'), ToastAndroid.SHORT);
                      return;
                    }
                    
                    const isCompleted = contributeToCommunityGoal(selectedCommunityReward.id, amt);
                    setShowCommunityModal(false);
                    
                    if (isCompleted) {
                      setShowCommunitySuccess(true);
                      NotificationService.showCommunityGoalReachedNotification(
                        localizedArea, 
                        language === 'ur' ? URDU_TRANSLATIONS[selectedCommunityReward?.discount] || selectedCommunityReward?.discount : selectedCommunityReward?.discount
                      );
                    } else {
                      ToastAndroid.show(language === 'ur' ? 'حصہ ڈالنے کا شکریہ!' : 'Thanks for contributing!', ToastAndroid.SHORT);
                    }
                  });
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
                  {language === 'ur' ? 'حصہ ڈالیں' : 'CONTRIBUTE NOW'}
                </Text>
                {language === 'ur' ? <ChevronLeft size={18} color="#fff" strokeWidth={3} /> : <ChevronRight size={18} color="#fff" strokeWidth={3} />}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Community Success Modal */}
        <Modal visible={showCommunitySuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.successModal, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: colors.primary }]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCommunitySuccess(false)}>
                <X size={20} color={MUTED} />
              </TouchableOpacity>
              <View style={[styles.successCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                <CheckCircle2 size={48} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>
                {language === 'ur' ? 'مبارک ہو!' : 'Congratulations!'}
              </Text>
              <Text style={[styles.modalSub, { color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 20 }]}>
                {language === 'ur' 
                  ? `آپ کے علاقے ${localizedArea} نے ہدف مکمل کر لیا ہے۔ حصہ ڈالنے کا بہت شکریہ!` 
                  : `Your area ${localizedArea} has completed this task. Thank you for contributing!`}
              </Text>
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCommunitySuccess(false)}>
                <Text style={styles.doneBtnText}>{t('Done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Welcome Gift Modal */}
        <Modal visible={showWelcomeModal} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.successModal, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: colors.primary }]}>
              <View style={[styles.successCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                <Coins size={48} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>
                {language === 'ur' ? 'خوش آمدید!' : language === 'ru' ? 'Welcome!' : 'Welcome Gift!'}
              </Text>
              <Text style={[styles.modalSub, { color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 20 }]}>
                {language === 'ur' 
                  ? `آپ کو بطور خوش آمدیدی تحفہ ${toUrduNumerals('1250')} پوائنٹس دیے جا رہے ہیں! آپ ان پوائنٹس کو شاندار ڈسکاؤنٹ واؤچرز حاصل کرنے کے لیے استعمال کر سکتے ہیں، یا اپنے علاقے کو بہتر بنانے کے لیے کمیونٹی اہداف میں حصہ ڈال سکتے ہیں!` 
                  : language === 'ru'
                  ? 'Aap ko bataur welcome gift 1250 points diye ja rahe hain! Aap in points se shandar discount vouchers haasil kar sakte hain, ya apne ilaqay ko behtar banane ke liye community goals mein hissa daal sakte hain!'
                  : 'You have been awarded 1,250 points as a welcome gift! You can use these points to redeem vouchers for exciting discounts, or contribute them towards civic goals to improve your community!'}
              </Text>
              <TouchableOpacity 
                style={[styles.doneBtn, { backgroundColor: colors.primary, opacity: isClaimingWelcome ? 0.7 : 1 }]} 
                onPress={handleClaimWelcomeGift}
                disabled={isClaimingWelcome}
              >
                <Text style={styles.doneBtnText}>
                  {language === 'ur' ? 'پوائنٹس حاصل کریں' : language === 'ru' ? 'Points Hasil Karein' : 'Claim Points'}
                </Text>
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

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
  },
  screenLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  pageTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  creditPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1,
  },
  creditPillText: { fontSize: 18, fontWeight: '900' },

  scrollContent: { paddingBottom: 20 },

  /* Credit banner */
  creditBanner: {
    marginHorizontal: 16, marginTop: 4, borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1,
  },
  bannerLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  bannerValue: { fontSize: 44, fontWeight: '900', lineHeight: 48 },
  bannerUnit: { fontSize: 13, fontWeight: '600', marginTop: -2 },
  earnBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  earnBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  /* Streak */
  streakContainer: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  streakHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  streakTitle: { fontSize: 14, fontWeight: '800' },
  streakDaysRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakDayCol: { alignItems: 'center', gap: 4 },
  streakDayCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  streakDayNum: { fontSize: 12, fontWeight: '800' },
  streakDayPts: { fontSize: 9, fontWeight: '700' },

  /* Section */
  section: { marginTop: 22, paddingHorizontal: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  seeAll: { fontSize: 12, fontWeight: '800' },

  /* Tiers */
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.2)' },
  tierLabel: { fontSize: 13, fontWeight: '600' },
  tierValue: { fontSize: 14, fontWeight: '900' },

  /* Rewards — contained card */
  rewardsList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  rewardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  rewardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  rewardMono: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  rewardInfo: { flex: 1 },
  rewardPartner: { fontSize: 15, fontWeight: '800' },
  rewardDiscount: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  costChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  costText: { fontSize: 12, fontWeight: '800' },
  rowDivider: { height: 1, marginHorizontal: 14 },
  emptyState: { alignItems: 'center', padding: 28, gap: 10 },
  emptyText: { fontSize: 13, fontWeight: '600' },

  /* Voucher card — ticket style */
  voucherCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1.5, marginBottom: 10, overflow: 'hidden',
  },
  voucherLeft: {
    width: 52, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch',
    paddingVertical: 18,
  },
  voucherDash: {
    width: 1, alignSelf: 'stretch',
    borderLeftWidth: 1, borderStyle: 'dashed', marginRight: 2,
  },
  voucherInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  voucherPartner: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  voucherCode: { fontSize: 17, fontWeight: '900', letterSpacing: 2.5, marginTop: 2 },
  voucherExpiry: { fontSize: 10, fontWeight: '600', marginTop: 3, letterSpacing: 0.3 },
  copyBtn: { paddingHorizontal: 14, paddingVertical: 12 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successModal: { width: '100%', borderRadius: 24, padding: 26, alignItems: 'center', borderWidth: 1 },
  closeBtn: { position: 'absolute', top: 14, right: 14, padding: 6 },
  successCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalSub: { fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 18 },
  codeBox: { width: '100%', borderRadius: 14, padding: 18, borderWidth: 1, alignItems: 'center', marginBottom: 12 },
  codeLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: { fontSize: 26, fontWeight: '900', marginVertical: 8, letterSpacing: 3 },
  copyFullBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  copyFullText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  expiryText: { fontSize: 12, fontWeight: '600', marginBottom: 18 },
  doneBtn: { width: '100%', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // New Features Styles
  goalContainer: { marginHorizontal: 16, marginTop: 16, marginBottom: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  goalTitle: { fontSize: 14, fontWeight: '700' },
  goalAmount: { fontSize: 13, fontWeight: '600' },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterPillText: { fontSize: 13, fontWeight: '600' },
});

export default InaamScreen;
