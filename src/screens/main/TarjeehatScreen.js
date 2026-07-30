import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, StatusBar, Modal, TextInput, Vibration, Linking, ActivityIndicator, AppState
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { sanitizeText } from '../../utils/validation';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, Lock, Shield, CircleHelp, ChevronRight,
  LogOut, Moon, Sun, Info, Trash2, Wifi, Bug, Database, UserX, Image as ImageIcon, X, Send, MapPin
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { useNetwork } from '../../context/NetworkContext';
import NotificationService from '../../services/NotificationService';
import { validatePassword } from '../../utils/validation';

const FAQ_DATA = [
  {
    q_en: "How do I report an issue?",
    a_en: "Tap the '+' button at the bottom center of your screen to open the camera and report a new issue.",
    q_ur: "مسئلہ کیسے رپورٹ کروں؟",
    a_ur: "اپنی اسکرین کے نچلے حصے میں موجود '+' بٹن کو دبائیں تاکہ کیمرہ کھلے اور نیا مسئلہ رپورٹ کر سکیں۔",
    q_ru: "Masla kaise report karun?",
    a_ru: "Apni screen ke nichlay hissay mein mojood '+' button ko dabayein taake camera khulay aur naya masla report kar sakein."
  },
  {
    q_en: "How do I earn City Credits?",
    a_en: "You earn City Credits when other users verify your reported issues. You can also earn credits by verifying issues reported by others.",
    q_ur: "میں سٹی کریڈٹس کیسے کما سکتا ہوں؟",
    a_ur: "جب دوسرے صارفین آپ کی رپورٹ کی تصدیق کرتے ہیں تو آپ کو کریڈٹس ملتے ہیں۔ آپ دوسروں کی رپورٹس کی تصدیق کر کے بھی کریڈٹس کما سکتے ہیں۔",
    q_ru: "Main City Credits kaise kama sakta hoon?",
    a_ru: "Jab dosray sarifeen aap ki report ki tasdeeq karte hain to aap ko credits miltay hain. Aap dosron ki reports ki tasdeeq kar ke bhi credits kama saktay hain."
  },
  {
    q_en: "How to change my Zone?",
    a_en: "You can change your default local area from the Tarjeehat (Settings) screen under the Local Area (Zone) section.",
    q_ur: "اپنا زون (علاقہ) کیسے تبدیل کروں؟",
    a_ur: "آپ ترجیحات اسکرین پر جا کر 'مقامی علاقہ' کے حصے سے اپنا زون تبدیل کر سکتے ہیں۔",
    q_ru: "Apna Zone (ilaqa) kaise tabdeel karun?",
    a_ru: "Aap Tarjeehat screen par ja kar 'Local Area' ke hissay se apna zone tabdeel kar saktay hain."
  },
  {
    q_en: "Can I report issues anonymously?",
    a_en: "Yes, you can toggle 'Anonymous Reporting' in the Tarjeehat screen to hide your identity on public feeds.",
    q_ur: "کیا میں گمنام طور پر شکایت درج کر سکتا ہوں؟",
    a_ur: "جی ہاں، آپ ترجیحات کی اسکرین سے 'گمنام رپورٹنگ' کو آن کر سکتے ہیں تاکہ آپ کا نام خفیہ رہے۔",
    q_ru: "Kya main gumnam tor par shikayat darj kar sakta hoon?",
    a_ru: "Jee haan, aap Tarjeehat ki screen se 'Anonymous Mode' ko on kar saktay hain taake aap ka naam khufia rahay."
  },
  {
    q_en: "How are reports verified?",
    a_en: "A report becomes 'Fully Verified' instantly once it gains at least 31 verification points from other local citizens.",
    q_ur: "رپورٹس کی تصدیق کیسے ہوتی ہے؟",
    a_ur: "جب کوئی رپورٹ دیگر مقامی شہریوں سے کم از کم ۳۱ تصدیقی پوائنٹس حاصل کر لیتی ہے تو وہ فوری طور پر 'مکمل تصدیق شدہ' بن جاتی ہے۔",
    q_ru: "Reports ki tasdeeq kaise hoti hai?",
    a_ru: "Jab koi report deegar maqami shehriyon se kam az kam 31 tasdeeqi points hasil kar leti hai to woh fori tor par 'Fully Verified' ban jati hai."
  },
  {
    q_en: "What happens if my complaint isn't resolved?",
    a_en: "If a highly-verified issue remains unresolved for 7 days, our system automatically escalates it to the relevant municipal authority.",
    q_ur: "اگر میری شکایت حل نہ ہو تو کیا کروں؟",
    a_ur: "اگر مسئلہ ۷ دن تک حل نہ ہو تو ہماری ٹیم اسے خودکار طور پر متعلقہ سرکاری محکمے (کے ایم سی، کے الیکٹرک وغیرہ) تک پہنچا دیتی ہے۔",
    q_ru: "Agar meri shikayat hal na ho to kya karun?",
    a_ru: "Agar masla 7 din tak hal na ho to hamari team isay khudkar tor par mutaliqa sarkari mehkamay (KMC, K-Electric waghaira) tak pohncha deti hai."
  },
  {
    q_en: "What is the Leaderboard?",
    a_en: "The Leaderboard (Top Shehri) ranks users based on their civic contributions. Compete with citizens in your zone to reach the Top 10!",
    q_ur: "لیڈر بورڈ کیا ہے؟",
    a_ur: "لیڈر بورڈ (بہترین شہری) شہریوں کی درجہ بندی ان کی خدمات کی بنیاد پر کرتا ہے۔ ٹاپ ۱۰ میں آنے کے لیے اپنے زون کے شہریوں سے مقابلہ کریں!",
    q_ru: "Leaderboard kya hai?",
    a_ru: "Leaderboard (Top Shehri) shehriyon ki darja bandi un ki khidmat ki bunyad par karta hai. Top 10 mein anay ke liye apne zone ke shehriyon se muqabla karein!"
  },
  {
    q_en: "How do I claim a discount voucher?",
    a_en: "Go to the Rewards (Inaam) screen, browse the available community goals or individual vouchers, and tap 'Claim' using your City Credits.",
    q_ur: "میں ڈسکاؤنٹ واؤچر کیسے حاصل کروں؟",
    a_ur: "انعام اسکرین پر جائیں، کمیونٹی اہداف یا انفرادی واؤچرز میں سے انتخاب کریں اور اپنے سٹی کریڈٹس کا استعمال کرتے ہوئے 'حاصل کریں' پر کلک کریں۔",
    q_ru: "Main discount voucher kaise hasil karun?",
    a_ru: "Inaam screen par jayein, community ahdaf ya infradi vouchers mein se intikhab karein aur apne City Credits ka istemal karte hue 'Claim' par click karein."
  },
  {
    q_en: "Can I delete a complaint after posting?",
    a_en: "Yes, you can delete your own posted complaints at any time. However, you cannot delete reports posted by other citizens. You can also mark your complaint as 'Resolved' once fixed.",
    q_ur: "کیا میں پوسٹ کرنے کے بعد شکایت کو حذف کر سکتا ہوں؟",
    a_ur: "جی ہاں، آپ کسی بھی وقت اپنی جمع کرائی گئی شکایت کو حذف کر سکتے ہیں۔ تاہم، آپ دوسرے شہریوں کی رپورٹس کو حذف نہیں کر سکتے۔ مسئلہ حل ہونے پر آپ اپنی شکایت کو 'حل شدہ' بھی کر سکتے ہیں۔",
    q_ru: "Kya main post karne ke baad shikayat ko delete kar sakta hoon?",
    a_ru: "Jee haan, aap kisi bhi waqt apni jama karai gayi shikayat ko delete kar saktay hain. Taham, aap dosray shehriyon ki reports ko delete nahi kar saktay. Masla hal honay par aap apni shikayat ko 'Resolved' bhi kar saktay hain."
  },
  {
    q_en: "What are Community Goals?",
    a_en: "Community Goals are collective efforts where citizens in a zone combine their credits to fund public projects like park cleanups.",
    q_ur: "کمیونٹی گولز کیا ہیں؟",
    a_ur: "کمیونٹی گولز اجتماعی کوششیں ہیں جہاں ایک زون کے شہری عوامی منصوبوں جیسے کہ پارک کی صفائی کے لیے اپنے کریڈٹس جمع کرتے ہیں۔",
    q_ru: "Community Goals kya hain?",
    a_ru: "Community Goals ijtimai koshishen hain jahan ek zone ke shehri awami mansoobon jaisay ke park ki safai ke liye apne credits jama karte hain."
  },
  {
    q_en: "How do I unlock Elite Citizen status?",
    a_en: "You can unlock the Elite Citizen status by consistently reporting real issues and verifying others to earn all the civic badges.",
    q_ur: "میں ایلیٹ شہری کا درجہ کیسے حاصل کروں؟",
    a_ur: "آپ حقیقی مسائل کی باقاعدگی سے رپورٹ کر کے اور دوسروں کی تصدیق کر کے تمام شہری بیجز حاصل کرنے پر ایلیٹ شہری بن سکتے ہیں۔",
    q_ru: "Main Elite shehri ka darja kaise hasil karun?",
    a_ru: "Aap haqeeqi masail ki baqaidgi se report kar ke aur dosron ki tasdeeq kar ke tamam shehri badges hasil karne par Elite shehri ban saktay hain."
  },
  {
    q_en: "Why was my report removed?",
    a_en: "Reports that violate community guidelines, contain inappropriate images, or are flagged as fake by multiple users are removed by moderators.",
    q_ur: "میری رپورٹ کیوں ہٹائی گئی؟",
    a_ur: "وہ رپورٹس جو کمیونٹی کے اصولوں کی خلاف ورزی کرتی ہیں، جن میں نامناسب تصاویر ہوں، یا جنہیں جعلی قرار دیا جائے، ماڈریٹرز کی طرف سے ہٹا دی جاتی ہیں۔",
    q_ru: "Meri report kyun hatai gayi?",
    a_ru: "Woh reports jo community ke asoolon ki khilaf warzi karti hain, jin mein namunasib tasaveer hon, ya jinhein jaali qarar diya jaye, moderators ki taraf se hata di jati hain."
  },
  {
    q_en: "Can I change the app language?",
    a_en: "Yes! You can instantly switch the app language between English, Urdu, and Roman Urdu from the Tarjeehat (Settings) screen.",
    q_ur: "کیا میں ایپ کی زبان تبدیل کر سکتا ہوں؟",
    a_ur: "جی ہاں! آپ ترجیحات اسکرین سے کسی بھی وقت ایپ کی زبان کو انگریزی، اردو، اور رومن اردو کے درمیان تبدیل کر سکتے ہیں۔",
    q_ru: "Kya main app ki zaban tabdeel kar sakta hoon?",
    a_ru: "Jee haan! Aap Tarjeehat screen se kisi bhi waqt app ki zaban ko English, Urdu aur Roman Urdu ke darmayan tabdeel kar saktay hain."
  },
  {
    q_en: "Is there a limit to how many reports I can file?",
    a_en: "Yes, to ensure quality reporting, you are limited to submitting 10 reports per day. Spamming the system will lead to an account ban.",
    q_ur: "کیا شکایت درج کرنے کی کوئی حد ہے؟",
    a_ur: "جی ہاں، معیاری رپورٹنگ کو یقینی بنانے کے لیے، آپ روزانہ صرف ۱۰ رپورٹس جمع کرا سکتے ہیں۔ جعلی رپورٹس پر اکاؤنٹ بند کیا جا سکتا ہے۔",
    q_ru: "Kya shikayat darj karne ki koi had hai?",
    a_ru: "Jee haan, miyari reporting ko yaqeeni banane ke liye, aap rozana sirf 10 reports jama kara saktay hain. Jaali reports par account ban ho sakta hai."
  },
  {
    q_en: "How do I update my profile picture?",
    a_en: "Go to your 'Mera Account' screen and tap the small Edit icon next to your name to upload a new profile picture and update your bio.",
    q_ur: "میں اپنی پروفائل تصویر کیسے اپ ڈیٹ کروں؟",
    a_ur: "اپنی 'میرا اکاؤنٹ' اسکرین پر جائیں اور اپنے نام کے آگے موجود ترمیم کے آئیکن پر کلک کر کے نئی تصویر لگا سکتے ہیں۔",
    q_ru: "Main apni profile tasveer kaise update karun?",
    a_ru: "Apni 'Mera Account' screen par jayein aur apne naam ke aagay mojood Edit icon par click kar ke nai tasveer laga saktay hain."
  },
  {
    q_en: "What is the 'Streak Master' badge?",
    a_en: "You earn the Streak Master badge and a 50 XP bonus by maintaining a 7-day reporting or verifying streak.",
    q_ur: "اسٹریک ماسٹر بیج کیا ہے؟",
    a_ur: "آپ مسلسل ۷ دن تک رپورٹ یا تصدیق کرنے پر 'اسٹریک ماسٹر' بیج اور ۵۰ تجرباتی پوائنٹس کا بونس حاصل کر سکتے ہیں۔",
    q_ru: "Streak Master badge kya hai?",
    a_ru: "Aap lagatar 7 din tak report ya tasdeeq karne par Streak Master badge aur 50 XP ka bonus hasil kar saktay hain."
  },
  {
    q_en: "How is my Leaderboard score calculated?",
    a_en: "Your score is calculated based on your active reporting streak and the total number of civic badges you have unlocked.",
    q_ur: "میرا لیڈر بورڈ اسکور کیسے شمار ہوتا ہے؟",
    a_ur: "آپ کا اسکور آپ کے موجودہ اسٹریک (مسلسل رپورٹنگ) اور حاصل کردہ تمام شہری بیجز کی تعداد کی بنیاد پر شمار ہوتا ہے۔",
    q_ru: "Mera Leaderboard score kaise calculate hota hai?",
    a_ru: "Aap ka score aap ke mojooda streak (lagatar reporting) aur hasil karda tamam shehri badges ki tadad ki bunyad par calculate hota hai."
  },
  {
    q_en: "Can I report issues outside my Zone?",
    a_en: "You can use the 'Pin Report' feature to manually set a location, but you are restricted to reporting issues strictly within 200 meters of your physical GPS location to ensure authenticity.",
    q_ur: "کیا میں اپنے زون کے باہر مسائل رپورٹ کر سکتا ہوں؟",
    a_ur: "آپ 'پن رپورٹ' کا استعمال کرتے ہوئے مقام سیٹ کر سکتے ہیں، لیکن اصلیت کو یقینی بنانے کے لیے آپ صرف اپنے موجودہ مقام سے ۲۰۰ میٹر کے اندر مسائل رپورٹ کر سکتے ہیں۔",
    q_ru: "Kya main apne Zone ke bahar masail report kar sakta hoon?",
    a_ru: "Aap 'Pin Report' ka istemal kar ke location set kar saktay hain, lekin asliyat ko yaqeeni banane ke liye aap sirf apne mojooda maqam se 200 meter ke andar masail report kar saktay hain."
  },
  {
    q_en: "What happens if I submit fake reports?",
    a_en: "Submitting fake or duplicate reports violates our guidelines and will result in your account being banned.",
    q_ur: "اگر میں جعلی رپورٹس جمع کراؤں تو کیا ہوگا؟",
    a_ur: "جعلی یا ایک جیسی رپورٹس جمع کرانا ہمارے اصولوں کی خلاف ورزی ہے اور اس کے نتیجے میں آپ کا اکاؤنٹ بند کر دیا جائے گا۔",
    q_ru: "Agar main jaali reports jama karaun to kya hoga?",
    a_ru: "Jaali ya ek jaisi reports jama karana hamare asoolon ki khilaf warzi hai aur is ke nateejay mein aap ka account band kar diya jaye ga."
  },
  {
    q_en: "How do I turn on Dark Mode?",
    a_en: "You can easily toggle Dark Mode from the Tarjeehat (Settings) screen for a better viewing experience at night.",
    q_ur: "میں ڈارک موڈ کیسے آن کروں؟",
    a_ur: "رات کے وقت بہتر اسکرین کے لیے آپ ترجیحات کی اسکرین سے باآسانی ڈارک موڈ آن کر سکتے ہیں۔",
    q_ru: "Main Dark Mode kaise on karun?",
    a_ru: "Raat ke waqt behtar screen dekhne ke liye aap Tarjeehat (Settings) ki screen se aasani se Dark Mode on kar saktay hain."
  },
  {
    q_en: "How many reports can I verify in a day?",
    a_en: "While there is no daily quantity limit, you can only verify reports that are within a 3-kilometer radius of your current location, or areas you have physically visited in the last 24 hours.",
    q_ur: "میں ایک دن میں کتنی رپورٹس کی تصدیق کر سکتا ہوں؟",
    a_ur: "تصدیق کی روزانہ تعداد کی کوئی حد نہیں، لیکن آپ صرف ان رپورٹس کی تصدیق کر سکتے ہیں جو آپ کے موجودہ مقام سے ۳ کلومیٹر کے دائرے میں ہوں یا جہاں آپ پچھلے ۲۴ گھنٹوں میں گئے ہوں۔",
    q_ru: "Main ek din mein kitni reports ki tasdeeq kar sakta hoon?",
    a_ru: "Tasdeeq ki rozana miqdar ki koi had nahi, lekin aap sirf un reports ki tasdeeq kar saktay hain jo aap ke mojooda maqam se 3 kilometer ke dائرے mein hon ya jahan aap pichlay 24 ghanton mein gaye hon."
  },
  {
    q_en: "What is the difference between 'Report Here' and 'Pin Report'?",
    a_en: "'Report Here' instantly uses your exact live GPS location, while 'Pin Report' allows you to manually adjust the pin, but strictly within a 200-meter radius around your location.",
    q_ur: "'یہاں رپورٹ کریں' اور 'پن رپورٹ' میں کیا فرق ہے؟",
    a_ur: "'یہاں رپورٹ کریں' فوری طور پر آپ کا لائیو جی پی ایس استعمال کرتا ہے، جبکہ 'پن رپورٹ' آپ کو پن کو دستی طور پر ایڈجسٹ کرنے کی اجازت دیتا ہے، لیکن صرف آپ کے موجودہ مقام کے ۲۰۰ میٹر کے دائرے میں۔",
    q_ru: "'Report Here' aur 'Pin Report' mein kya farq hai?",
    a_ru: "'Report Here' fori tor par aap ka live GPS istemal karta hai, jabke 'Pin Report' aap ko pin adjust karne ki ijazat deta hai, lekin sirf aap ke mojooda maqam ke 200 meter ke daire mein."
  },
  {
    q_en: "How do I change my password?",
    a_en: "You can change your password securely from the Tarjeehat screen under the Account Settings section.",
    q_ur: "میں اپنا پاس ورڈ کیسے تبدیل کروں؟",
    a_ur: "آپ ترجیحات اسکرین پر 'اکاؤنٹ سیٹنگز' کے حصے سے اپنا پاس ورڈ محفوظ طریقے سے تبدیل کر سکتے ہیں۔",
    q_ru: "Main apna password kaise tabdeel karun?",
    a_ru: "Aap Tarjeehat screen par 'Account Settings' ke hissay se apna password mehfooz tareeqay se tabdeel kar saktay hain."
  },
  {
    q_en: "Do my City Credits expire?",
    a_en: "No, your City Credits never expire. You can save them up for larger community goals or individual vouchers.",
    q_ur: "کیا میرے سٹی کریڈٹس کی میعاد ختم ہو جاتی ہے؟",
    a_ur: "نہیں، آپ کے سٹی کریڈٹس کی میعاد کبھی ختم نہیں ہوتی۔ آپ انہیں بڑے کمیونٹی اہداف یا انفرادی واؤچرز کے لیے محفوظ کر سکتے ہیں۔",
    q_ru: "Kya mere City Credits expire ho jatay hain?",
    a_ru: "Nahi, aap ke City Credits ki miyaad kabhi khatam nahi hoti. Aap inhein baday community ahdaf ya infradi vouchers ke liye mehfooz kar saktay hain."
  },
  {
    q_en: "Can I transfer my City Credits to another user?",
    a_en: "Currently, City Credits cannot be transferred. They are tied to your personal civic contributions.",
    q_ur: "کیا میں اپنے سٹی کریڈٹس کسی دوسرے صارف کو منتقل کر سکتا ہوں؟",
    a_ur: "فی الحال، سٹی کریڈٹس منتقل نہیں کیے جا سکتے۔ یہ آپ کی ذاتی شہری خدمات سے منسلک ہیں۔",
    q_ru: "Kya main apne City Credits kisi dosray sarif ko transfer kar sakta hoon?",
    a_ru: "Filhal, City Credits transfer nahi kiye ja saktay. Yeh aap ki zati shehri khidmat se munsalik hain."
  },

  {
    q_en: "What are the notifications for?",
    a_en: "You receive notifications for badge unlocks, resolved complaints, and community goal updates in your area.",
    q_ur: "اطلاعات (نوٹیفکیشنز) کس لیے ہیں؟",
    a_ur: "آپ کو نئے بیج ملنے، شکایات کے حل ہونے اور آپ کے علاقے میں کمیونٹی اہداف کی اپ ڈیٹس کے لیے اطلاعات موصول ہوتی ہیں۔",
    q_ru: "Notifications kis liye hain?",
    a_ru: "Aap ko naye badge milne, shikayaat ke hal honay aur aap ke ilaqay mein community ahdaf ki updates ke liye notifications mosool hoti hain."
  },
  {
    q_en: "How do I turn off vibration (haptics)?",
    a_en: "You can disable haptic feedback (vibrations) anytime from the Tarjeehat (Settings) screen.",
    q_ur: "میں وائبریشن (ہیپٹکس) کو کیسے بند کروں؟",
    a_ur: "آپ ترجیحات کی اسکرین سے کسی بھی وقت وائبریشن (ہیپٹک فیڈبیک) کو بند کر سکتے ہیں۔",
    q_ru: "Main vibration (haptics) ko kaise band karun?",
    a_ru: "Aap Tarjeehat (Settings) ki screen se kisi bhi waqt vibration (haptic feedback) ko band kar saktay hain."
  },
  {
    q_en: "Can I view my past reports?",
    a_en: "Yes, all your submitted reports and their current statuses are visible in the 'Meri Shikayaat' (My Complaints) screen.",
    q_ur: "کیا میں اپنی پچھلی رپورٹس دیکھ سکتا ہوں؟",
    a_ur: "جی ہاں، آپ کی جمع کرائی گئی تمام رپورٹس اور ان کی موجودہ صورتحال 'میری شکایات' اسکرین میں نظر آتی ہیں۔",
    q_ru: "Kya main apni pichli reports dekh sakta hoon?",
    a_ru: "Jee haan, aap ki jama karai gayi tamam reports aur un ki mojooda soorat-e-haal 'Meri Shikayaat' screen mein nazar aati hain."
  },
  {
    q_en: "What are Civic Badges?",
    a_en: "Civic Badges are special achievements you unlock by performing specific actions like verifying reports or maintaining streaks.",
    q_ur: "شہری بیجز کیا ہیں؟",
    a_ur: "شہری بیجز وہ خاص انعامات ہیں جو آپ مخصوص کام انجام دے کر حاصل کرتے ہیں، جیسے رپورٹس کی تصدیق کرنا یا مسلسل رپورٹنگ کرنا۔",
    q_ru: "Civic Badges kya hain?",
    a_ru: "Civic Badges woh khaas inaamat hain jo aap makhsoos kaam anjaam de kar hasil karte hain, jaisay reports ki tasdeeq karna ya lagatar reporting karna."
  },
  {
    q_en: "Why does the app say 'Issue Already Reported'?",
    a_en: "To prevent duplicate spam, you cannot submit a report if an active issue of the same category already exists within a 30-meter radius. You can verify the existing report instead!",
    q_ur: "ایپ 'مسئلہ پہلے ہی رپورٹ ہو چکا ہے' کیوں کہتی ہے؟",
    a_ur: "جعلی اور ایک جیسی رپورٹس کو روکنے کے لیے، اگر ۳۰ میٹر کے دائرے میں اسی قسم کا مسئلہ پہلے سے موجود ہو تو آپ نئی رپورٹ جمع نہیں کرا سکتے۔ آپ اس کے بجائے موجودہ رپورٹ کی تصدیق کر سکتے ہیں!",
    q_ru: "App 'Issue Already Reported' kyun kehti hai?",
    a_ru: "Jaali aur ek jaisi reports ko roknay ke liye, agar 30 meter ke daire mein usi qism ka masla pehle se mojood ho to aap nai report jama nahi kara saktay. Aap us ke bajaye mojooda report ki tasdeeq kar saktay hain!"
  },
  {
    q_en: "Do I get more points for verifying nearby issues?",
    a_en: "Yes! Verifying an issue while you are on-site (within 500 meters) adds +2 verifications to the report, while local verification (within 3 kilometers) adds +1.",
    q_ur: "کیا مجھے قریبی مسائل کی تصدیق کرنے پر زیادہ پوائنٹس ملتے ہیں؟",
    a_ur: "جی ہاں! بالکل اسی مقام پر (۵۰۰ میٹر کے اندر) تصدیق کرنے سے رپورٹ میں ۲ تصدیقیں شامل ہوتی ہیں، جبکہ مقامی تصدیق (۳ کلومیٹر کے اندر) پر ۱ تصدیق شامل ہوتی ہے۔",
    q_ru: "Kya mujhe qareebi masail ki tasdeeq karne par zyada points miltay hain?",
    a_ru: "Jee haan! Bilkul usi maqam par (500 meter ke andar) tasdeeq karne se report mein 2 tasdeeqein shamil hoti hain, jabke maqami tasdeeq (3 kilometer ke andar) par 1 tasdeeq shamil hoti hai."
  },
  {
    q_en: "What is a 'Time-Delayed' verification?",
    a_en: "If you are currently far from an issue but physically passed within 3 kilometers of it during the last 24 hours, the system will still accept your verification.",
    q_ur: "'ٹائم ڈیلیڈ' (تاخیری) تصدیق کیا ہے؟",
    a_ur: "اگر آپ اس وقت کسی مسئلے سے دور ہیں لیکن پچھلے ۲۴ گھنٹوں کے دوران اس کے ۳ کلومیٹر کے دائرے سے گزرے ہیں، تو سسٹم پھر بھی آپ کی تصدیق قبول کر لے گا۔",
    q_ru: "'Time-Delayed' tasdeeq kya hai?",
    a_ru: "Agar aap is waqt kisi maslay se door hain lekin pichlay 24 ghanton ke douran us ke 3 kilometer ke daire se guzray hain, to system phir bhi aap ki tasdeeq qabool kar le ga."
  },
  {
    q_en: "Can I see complaints that are already fixed?",
    a_en: "Resolved complaints are hidden from the active map to reduce clutter, but you can always view your own resolved issues in the 'Meri Shikayaat' (My Reports) and Feeds screen.",
    q_ur: "کیا میں وہ شکایات دیکھ سکتا ہوں جو حل ہو چکی ہیں؟",
    a_ur: "حل شدہ شکایات نقشے سے ہٹا دی جاتی ہیں تاکہ رش کم ہو، لیکن آپ اپنی حل شدہ شکایات ہمیشہ 'میری شکایات' اور فیڈز اسکرین میں دیکھ سکتے ہیں۔",
    q_ru: "Kya main woh shikayat dekh sakta hoon jo hal ho chuki hain?",
    a_ru: "Hal shuda shikayat naqshay se hata di jati hain taake rush kam ho, lekin aap apni hal shuda shikayat hamesha 'Meri Shikayaat' (My Reports) aur Feeds screen mein dekh saktay hain."
  },
  {
    q_en: "How does the app ensure reports are real?",
    a_en: "The app enforces strict GPS distance limits, limits you to 10 reports daily, and requires at least 31 verification points from other local citizens for an issue to become 'Fully Verified'.",
    q_ur: "ایپ کیسے یقینی بناتی ہے کہ رپورٹس اصلی ہیں؟",
    a_ur: "ایپ جی پی ایس کی سخت فاصلاتی حدیں لگاتی ہے، روزانہ صرف ۱۰ رپورٹس کی اجازت دیتی ہے، اور کسی مسئلے کو 'مکمل تصدیق شدہ' قرار دینے کے لیے دیگر مقامی شہریوں سے کم از کم ۳۱ تصدیقی پوائنٹس لازمی قرار دیتی ہے۔",
    q_ru: "App kaise yaqeeni banati hai ke reports asli hain?",
    a_ru: "App GPS ki sakht faslati hadein lagati hai, rozana sirf 10 reports ki ijazat deti hai, aur kisi maslay ko 'Fully Verified' qarar dene ke liye deegar maqami shehriyon se kam az kam 31 tasdeeqi points lazmi qarar deti hai."
  }
];

/* Setting toggle row */
const ToggleRow = ({ icon: Icon, iconBg, iconColor, label, desc, value, onValueChange, isDark, colors }) => {
  const { triggerHaptic } = useAppContext();
  const { language, isRTL } = useLanguage();
  return (
  <View style={styles.settingRow}>
    <View style={[styles.settingIconBox, { backgroundColor: iconBg }]}>
      <Icon size={17} color={iconColor} />
    </View>
    <View style={styles.settingText}>
      <Text style={[styles.settingLabel, { color: colors.text, textAlign: 'left' }]}>{label}</Text>
      {desc ? <Text style={[styles.settingDesc, { color: colors.textSecondary, textAlign: 'left' }]}>{desc}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={(v) => { triggerHaptic(); onValueChange(v); }}
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel={label}
      trackColor={{ false: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1', true: colors.primary }}
      thumbColor="#fff"
      ios_backgroundColor={isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1'}
    />
  </View>
  );
};

/* Tappable row */
const TapRow = ({ icon: Icon, iconBg, iconColor, label, desc, colors, onPress, rightText, isDestructive, isLoading }) => {
  const { triggerHaptic } = useAppContext();
  const { language, isRTL } = useLanguage();
  return (
  <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={(e) => { triggerHaptic(); onPress && onPress(e); }} accessible={true} accessibilityRole="button" accessibilityLabel={label} disabled={isLoading}>
    <View style={[styles.settingIconBox, { backgroundColor: iconBg }]}>
      <Icon size={17} color={iconColor} />
    </View>
    <View style={styles.settingText}>
      <Text style={[styles.settingLabel, { color: isDestructive ? colors.danger : colors.text, textAlign: 'left' }]}>{label}</Text>
      {desc ? <Text style={[styles.settingDesc, { color: colors.textSecondary, textAlign: 'left' }]}>{desc}</Text> : null}
    </View>
    {isLoading ? (
      <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
    ) : rightText ? (
      <Text style={{ color: colors.textSecondary, marginRight: 8, fontSize: 13, fontWeight: '700' }}>{rightText}</Text>
    ) : null}
    <View style={language === 'ur' ? { transform: [{ rotate: '180deg' }] } : {}}>
      <ChevronRight size={16} color={isDestructive ? colors.danger : colors.textSecondary} />
    </View>
  </TouchableOpacity>
  );
};

const SettingsDivider = ({ borderColor }) => <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />;

const SettingsSection = ({ title, children, cardBg, cardBorder, titleColor }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: titleColor, textAlign: 'left' }]}>{title}</Text>
    <View style={[styles.settingCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {children}
    </View>
  </View>
);

const TarjeehatScreen = () => {
  const { colors, toggleTheme, isDark, resetTheme } = useTheme();
  const { language, setLanguage, t, toUrduNumerals, isRTL } = useLanguage();
  const { logout, deleteAccount, changePassword } = useAuth();
  const { requireInternet } = useNetwork();
  const { localArea, setLocalArea, isAnonymous, setIsAnonymous, triggerAppTutorial, hapticsEnabled, setHapticsEnabled, triggerHaptic } = useAppContext();
  const [hqWifiOnly, setHqWifiOnly] = React.useState(true);
  const [dataSaver, setDataSaver] = React.useState(false);
  const [cacheSize, setCacheSize] = React.useState('124 MB');
  const [showFaqModal, setShowFaqModal] = React.useState(false);
  const [showBugModal, setShowBugModal] = React.useState(false);
  const [showBugSuccessModal, setShowBugSuccessModal] = React.useState(false);
  // Reflects the REAL OS notification permission — synced on mount and on AppState focus.
  const [notifsEnabled, setNotifsEnabled] = React.useState(true);
  const [notifModalType, setNotifModalType] = React.useState(null); // 'toggle' | 'test' | null
  const [bugText, setBugText] = React.useState('');
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const [showCannotChangePasswordModal, setShowCannotChangePasswordModal] = React.useState(false);
  const [isSubmittingBug, setIsSubmittingBug] = React.useState(false);
  const [isClearingCache, setIsClearingCache] = React.useState(false);
  const [showCacheClearedModal, setShowCacheClearedModal] = React.useState(false);
  const [cacheClearedMessage, setCacheClearedMessage] = React.useState({ title: '', desc: '' });
  const [isLocalDark, setIsLocalDark] = React.useState(isDark);

  // ── Sync notification toggle with real OS permission on mount and when
  //    returning from Android system settings (AppState 'active' event).
  const syncNotifPermission = React.useCallback(async () => {
    try {
      const has = await NotificationService.hasPermission();
      setNotifsEnabled(has);
    } catch {}
  }, []);

  React.useEffect(() => {
    syncNotifPermission();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNotifPermission();
    });
    return () => sub.remove();
  }, [syncNotifPermission]);

  React.useEffect(() => {
    setIsLocalDark(isDark);
  }, [isDark]);

  const submitBugReport = async () => {
    const trimmedBug = (bugText || '').trim();
    if (trimmedBug.length === 0) return;
    
    try {
      setIsSubmittingBug(true);
      const uid = auth().currentUser?.uid || 'anonymous';
      
      // Use a Firestore Timestamp for the start-of-day boundary so the query
      // matches server-stored serverTimestamp() values exactly.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfDayTimestamp = firestore.Timestamp.fromDate(startOfDay);
      
      let todayReportCount = 0;
      try {
        const todayReports = await firestore()
          .collection('bug_reports')
          .where('userId', '==', uid)
          .where('timestamp', '>=', startOfDayTimestamp)
          .get();
        todayReportCount = todayReports.size;
      } catch (queryErr) {
        // If the rate-limit query fails (e.g. offline or permission error),
        // allow the submission to proceed rather than blocking the user.
        console.warn('Bug report rate-limit query failed, proceeding without check:', queryErr);
      }
        
      if (todayReportCount >= 10) {
        Alert.alert(
          language === 'ur' ? "حد ختم ہو گئی" : language === 'ru' ? "Limit Poori Ho Gayi" : "Limit Reached",
          language === 'ur' ? "آپ نے آج کی 10 رپورٹوں کی حد پوری کر لی ہے۔ براہ کرم کل دوبارہ کوشش کریں۔" : language === 'ru' ? "Aap ne aaj ki 10 reports ki limit poori kar li hai. Baraye meharbani kal dobara koshish karein." : "You have reached your daily limit of 10 bug reports. Please try again tomorrow."
        );
        setIsSubmittingBug(false);
        return;
      }
      
      // Sanitize the bug report text before writing to Firestore
      const sanitizedBugText = sanitizeText(trimmedBug, 2000);

      await firestore().collection('bug_reports').add({
        userId: uid,
        description: sanitizedBugText,
        timestamp: firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      });
      
      setShowBugModal(false);
      setBugText('');
      setShowBugSuccessModal(true);
    } catch (e) {
      console.error("Bug report error", e);
      Alert.alert(
        language === 'ur' ? "غلطی" : "Error", 
        language === 'ur' ? "رپورٹ جمع کرانے میں مسئلہ پیش آیا۔ براہ کرم دوبارہ کوشش کریں۔" : "Failed to submit bug report. Please try again."
      );
    } finally {
      setIsSubmittingBug(false);
    }
  };

  const handleThemeSwitch = React.useCallback((v) => {
    setIsLocalDark(v);
    toggleTheme();
  }, [toggleTheme]);

  const CARD_BG = isDark ? colors.glass : colors.surface;
  const CARD_BORDER = isDark ? colors.glassBorder : colors.border;
  const SECTION_TITLE_COLOR = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(11,59,36,0.65)';

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    resetTheme();    // → dark mode
    setLanguage('en'); // → English
    logout();
  };

  const confirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const result = await deleteAccount();
    setIsDeletingAccount(false);
    if (result.ok) {
      setShowDeleteAccountModal(false);
      resetTheme();
      setLanguage('en');
    } else {
      setShowDeleteAccountModal(false);
      Alert.alert(
        language === 'ur' ? 'غلطی' : 'Error',
        result.error === 'requires_recent_login' 
          ? (language === 'ur' ? 'براہ کرم دوبارہ لاگ ان کریں اور پھر کوشش کریں۔' : 'For security, please log out, log back in, and try again.')
          : (language === 'ur' ? 'اکاؤنٹ ڈیلیٹ کرنے میں مسئلہ پیش آیا۔' : 'Failed to delete account. Please try again.')
      );
      if (result.error === 'requires_recent_login') {
        setTimeout(() => logout(), 1000);
      }
    }
  };

  const handleOpenChangePassword = () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    const isEmailUser = currentUser.providerData.some(p => p.providerId === 'password');
    if (!isEmailUser) {
      setShowCannotChangePasswordModal(true);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const submitChangePassword = async () => {
    setPasswordError('');
    if (!currentPassword || !newPassword) {
      setPasswordError(language === 'ur' ? 'تمام خانے پر کریں۔' : 'Please fill all fields.');
      return;
    }
    if (!validatePassword(newPassword)) {
      setPasswordError(language === 'ur' ? 'پاسورڈ کم از کم 8 حروف، ایک بڑا حرف، ایک چھوٹا حرف، ایک نمبر اور 2 خاص حروف پر مشتمل ہونا چاہیے۔' : 'Password must be at least 8 characters long, with an uppercase letter, lowercase letter, a number, and 2 special characters.');
      return;
    }
    setIsChangingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);
    if (res.ok) {
      setShowPasswordModal(false);
      Alert.alert(
        language === 'ur' ? 'کامیابی' : 'Success',
        language === 'ur' ? 'آپ کا پاسورڈ کامیابی سے تبدیل ہو گیا ہے۔' : 'Your password has been changed successfully.'
      );
    } else {
      setPasswordError(res.error);
    }
  };


  /* Language options */
  const LANGS = [
    { label: 'Roman Urdu', sub: 'Naksha, Shikayat...', code: 'ru' },
    { label: 'English',    sub: 'Map, Reports...',     code: 'en' },
    { label: 'اردو',      sub: 'نقشہ، شکایتیں...',   code: 'ur' },
  ];

  /* Local Areas */
  const AREAS = [
    'Clifton', 'Gulshan-e-Iqbal', 'DHA', 'Malir', 'Gulistan-e-Jauhar', 'Saddar', 'Lyari', 'Nazimabad', 'Korangi'
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.screenLabel, { color: colors.primary }]}>{t('kcpApp')}</Text>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{t('Tarjeehat')}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* App Preferences */}
          <SettingsSection title={t('AppPreferences')} cardBg={CARD_BG} cardBorder={CARD_BORDER} titleColor={SECTION_TITLE_COLOR}>
            <ToggleRow
              icon={isLocalDark ? Moon : Sun}
              iconBg={isLocalDark ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)'}
              iconColor={isLocalDark ? '#8B5CF6' : '#F59E0B'}
              label={isLocalDark ? t('darkTheme') : t('lightTheme')}
              desc={null}
              value={isLocalDark}
              onValueChange={handleThemeSwitch}
              isDark={isLocalDark}
              colors={colors}
            />
            <SettingsDivider borderColor={CARD_BORDER} />

            {/* Notifications — single toggle reflecting real OS permission */}
            <ToggleRow
              icon={Bell}
              iconBg={isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF'}
              iconColor="#3B82F6"
              label={language === 'ur' ? 'نوٹیفیکیشنز' : language === 'ru' ? 'Notifications' : 'Notifications'}
              desc={
                notifsEnabled
                  ? (language === 'ur' ? 'الرٹس اور ریمائنڈرز فعال ہیں' : language === 'ru' ? 'Alerts aur reminders active hain' : 'Alerts & reminders are active')
                  : (language === 'ur' ? 'فون سیٹنگز سے فعال کریں' : language === 'ru' ? 'Phone settings se on karein' : 'Tap to enable in phone settings')
              }
              value={notifsEnabled}
              onValueChange={() => {
                triggerHaptic();
                setNotifModalType('toggle');
              }}
              isDark={isDark}
              colors={colors}
            />
            {/* Test notification button — always visible */}
            <View style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)' }}>
              <SettingsDivider borderColor={CARD_BORDER} />
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 }}
                onPress={async () => {
                  triggerHaptic();
                  if (!notifsEnabled) {
                    setNotifModalType('test');
                    return;
                  }
                  await NotificationService.showTestNotification(language);
                }}
              >
                <Bell size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '800' }}>
                  {language === 'ur' ? 'ٹیسٹ نوٹیفیکیشن بھیجیں' : language === 'ru' ? 'Test Notification Bhejein' : 'Send Test Notification'}
                </Text>
              </TouchableOpacity>
            </View>
            <SettingsDivider borderColor={CARD_BORDER} />

            <ToggleRow
              icon={ImageIcon}
              iconBg={isDark ? 'rgba(16,185,129,0.15)' : '#F0FDF4'}
              iconColor="#10B981"
              label={t('hqWifi')}
              desc={t('saveData')}
              value={hqWifiOnly}
              onValueChange={(v) => { setHqWifiOnly(v); triggerHaptic(); }}
              isDark={isDark}
              colors={colors}
            />
            <SettingsDivider borderColor={CARD_BORDER} />
            <ToggleRow
              icon={Wifi}
              iconBg={isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB'}
              iconColor="#F59E0B"
              label={language === 'ur' ? 'ڈیٹا سیور موڈ' : language === 'ru' ? 'Data Saver Mode' : 'Data Saver Mode'}
              desc={language === 'ur' ? 'کم نیٹ ورک استعمال، کم تصاویر' : language === 'ru' ? 'Data bachane ke liye image quality kam karta hai' : 'Reduces image quality to save mobile data'}
              value={dataSaver}
              onValueChange={(v) => { setDataSaver(v); triggerHaptic(); }}
              isDark={isDark}
              colors={colors}
            />
          </SettingsSection>



          {/* Language — segmented control */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: SECTION_TITLE_COLOR }]}>{t('Language')}</Text>
            <View style={[styles.segmentContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(11,59,36,0.06)', borderColor: CARD_BORDER }]}>
              {LANGS.map(({ label, sub, code }, idx) => {
                const active = language === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.segmentPill,
                      active && { backgroundColor: colors.primary, borderRadius: 10 },
                      idx < LANGS.length - 1 && !active && styles.segmentDivide,
                    ]}
                    onPress={() => requireInternet(() => setLanguage(code, true))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentMain, { color: active ? '#fff' : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(11,59,36,0.7)') }]}>
                      {label}
                    </Text>
                    <Text style={[styles.segmentSub, { color: active ? 'rgba(255,255,255,0.6)' : (isDark ? 'rgba(255,255,255,0.38)' : 'rgba(11,59,36,0.38)') }]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Local Area */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: SECTION_TITLE_COLOR }]}>{t('localArea')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaScroll}>
              {AREAS.map((area) => {
                const active = localArea === area;
                return (
                  <TouchableOpacity
                    key={area}
                    style={[
                      styles.areaPill,
                      {
                        backgroundColor: active ? colors.primary : CARD_BG,
                        borderColor: active ? colors.primary : CARD_BORDER,
                      }
                    ]}
                    onPress={() => requireInternet(() => setLocalArea(area))}
                    activeOpacity={0.8}
                  >
                    <Text numberOfLines={1} style={[styles.areaPillText, { color: active ? '#fff' : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(11,59,36,0.7)') }]}>
                      {t(area)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Privacy & Security */}
          <SettingsSection title={t('PrivacySecurity')} cardBg={CARD_BG} cardBorder={CARD_BORDER} titleColor={SECTION_TITLE_COLOR}>
            <ToggleRow
              icon={Shield}
              iconBg={isDark ? 'rgba(16,185,129,0.15)' : '#F0FDF4'}
              iconColor="#10B981"
              label={t('AnonymousMode')}
              desc={t('AnonymousDesc')}
              value={isAnonymous}
              onValueChange={(val) => { requireInternet(() => { setIsAnonymous(val); triggerHaptic(); }); }}
              isDark={isDark}
              colors={colors}
            />
            <SettingsDivider borderColor={CARD_BORDER} />
            <TapRow
              icon={Lock}
              iconBg={isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF'}
              iconColor="#8B5CF6"
              label={t('changePassword')}
              colors={colors}
              onPress={() => requireInternet(handleOpenChangePassword)}
            />
            <SettingsDivider borderColor={CARD_BORDER} />
            <TapRow
              icon={UserX}
              iconBg={isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2'}
              iconColor="#EF4444"
              label={t('deleteAccount')}
              desc={t('permRemove')}
              colors={colors}
              isDestructive
              onPress={() => requireInternet(() => setShowDeleteAccountModal(true))}
            />
          </SettingsSection>

          {/* Accessibility */}
          <SettingsSection
            title={language === 'ur' ? 'رسائی کی سہولیات' : language === 'ru' ? 'Accessibility' : 'Accessibility'}
            cardBg={CARD_BG} cardBorder={CARD_BORDER} titleColor={SECTION_TITLE_COLOR}
          >
            <ToggleRow
              icon={Bell}
              iconBg={isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB'}
              iconColor="#F59E0B"
              label={language === 'ur' ? 'ہیپٹک فیڈ بیک' : language === 'ru' ? 'Haptic Feedback' : 'Haptic Feedback'}
              desc={language === 'ur' ? 'بٹن دبانے پر ہلکی تھرتھراہٹ' : language === 'ru' ? 'Button dabane par halki vibration' : 'Subtle vibration on button presses'}
              value={hapticsEnabled}
              onValueChange={(v) => { setHapticsEnabled(v); if (v) Vibration.vibrate(30); }}
              isDark={isDark}
              colors={colors}
            />
            <SettingsDivider borderColor={CARD_BORDER} />
            <TapRow
              icon={Info}
              iconBg={isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF'}
              iconColor="#3B82F6"
              label={language === 'ur' ? 'ٹیکسٹ سائز' : language === 'ru' ? 'Text Size' : 'Text Size'}
              desc={language === 'ur' ? 'اپنے فون کی ایکسیسبیلٹی ترتیبات میں تبدیل کریں' : language === 'ru' ? "Apne phone ki Accessibility settings mein tabdeel karein" : 'Change in your phone\'s Accessibility settings'}
              colors={colors}
              onPress={() => Linking.openSettings()}
            />
          </SettingsSection>

          {/* Permissions */}
          <SettingsSection
            title={language === 'ur' ? 'اجازتیں' : language === 'ru' ? 'Permissions' : 'Permissions'}
            cardBg={CARD_BG} cardBorder={CARD_BORDER} titleColor={SECTION_TITLE_COLOR}
          >
            <TapRow
              icon={MapPin}
              iconBg={isDark ? 'rgba(22,163,74,0.15)' : '#F0FDF4'}
              iconColor={colors.primary}
              label={language === 'ur' ? 'مقام کی اجازت' : language === 'ru' ? 'Location Permission' : 'Location Permission'}
              desc={language === 'ur' ? 'نقشے کی درستگی کے لیے ضروری' : language === 'ru' ? 'Sahi map aur reporting ke liye zaroori hai' : 'Required for accurate map & reporting'}
              colors={colors}
              onPress={() => Linking.openSettings()}
            />

          </SettingsSection>

          {/* Support */}
          <SettingsSection
            title={t('support')}
            cardBg={CARD_BG} cardBorder={CARD_BORDER} titleColor={SECTION_TITLE_COLOR}
          >
            <TapRow
              icon={CircleHelp}
              iconBg={CARD_BG}
              iconColor={colors.textSecondary}
              label={t('helpCenter')}
              desc={t('faqGuides')}
              colors={colors}
              onPress={() => setShowFaqModal(true)}
            />
            <SettingsDivider borderColor={CARD_BORDER} />
            <TapRow
              icon={Info}
              iconBg={CARD_BG}
              iconColor={colors.primary}
              label={language === 'ur' ? 'ایپ کا استعمال سیکھیں' : language === 'ru' ? 'App ka istemal seekhein' : 'How to use the app'}
              desc={language === 'ur' ? 'رہنمائی کا سبق دوبارہ دیکھیں' : language === 'ru' ? 'Guide dobara dekhein' : 'Replay the guided tutorial'}
              colors={colors}
              onPress={triggerAppTutorial}
            />
            <SettingsDivider borderColor={CARD_BORDER} />
            <TapRow
              icon={Bug}
              iconBg={CARD_BG}
              iconColor={colors.textSecondary}
              label={t('reportBug')}
              desc={t('improveKcp')}
              colors={colors}
              onPress={() => requireInternet(() => setShowBugModal(true))}
            />
            <SettingsDivider borderColor={CARD_BORDER} />
            <TapRow
              icon={Database}
              iconBg={CARD_BG}
              iconColor={colors.textSecondary}
              label={t('clearCache')}
              desc={t('freeStorage')}
              rightText={language === 'ur' ? toUrduNumerals(cacheSize).replace('MB', 'ایم بی') : cacheSize}
              colors={colors}
              isLoading={isClearingCache}
              onPress={async () => {
                if (cacheSize === '0 MB') {
                  setCacheClearedMessage({
                    title: language === 'ur' ? "کیشے پہلے ہی صاف ہے" : language === 'ru' ? "Cache pehlay hi saaf hai" : "Cache already cleared",
                    desc: language === 'ur' ? "آپ کی ایپ مکمل طور پر آپٹمائزڈ ہے۔" : language === 'ru' ? "Aap ki app mukammal tor par optimized hai." : "Your app is fully optimized."
                  });
                  setShowCacheClearedModal(true);
                  return;
                }
                
                setIsClearingCache(true);
                try {
                  // Wait 1.5s to simulate clearing heavy app files/images locally
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  // Clear database cache (Firestore)
                  try {
                    await firestore().clearPersistence();
                  } catch (e) {
                    console.log('Firestore clear persistence error (might be expected if online):', e);
                  }
                  
                  setCacheSize('0 MB');
                  setCacheClearedMessage({
                    title: language === 'ur' ? "کیشے صاف ہو گیا" : language === 'ru' ? "Cache saaf ho gaya" : "Cache Cleared", 
                    desc: language === 'ur' ? "ایپ اور ڈیٹا بیس کا کیشے کامیابی سے صاف کر دیا گیا ہے۔" : language === 'ru' ? "App aur database ka cache kamyabi se saaf kar diya gaya hai." : "App and database cache have been successfully cleared."
                  });
                  setShowCacheClearedModal(true);
                } catch (error) {
                  setCacheSize('0 MB');
                  setCacheClearedMessage({
                    title: language === 'ur' ? "کیشے صاف ہو گیا" : language === 'ru' ? "Cache saaf ho gaya" : "Cache Cleared", 
                    desc: language === 'ur' ? "عارضی فائلیں ہٹا دی گئی ہیں۔" : language === 'ru' ? "Aarzi files hata di gayi hain." : "Temporary files have been removed."
                  });
                  setShowCacheClearedModal(true);
                } finally {
                  setIsClearingCache(false);
                }
              }}
            />
          </SettingsSection>

          {/* App info chip */}
          <View style={[styles.infoChip, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
            <Info size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {toUrduNumerals(t('appVersion'))}
            </Text>
          </View>

          {/* Logout — full-width red outlined destructive button */}
          <TouchableOpacity
            style={[styles.logoutRow, { borderColor: colors.danger }]}
            onPress={handleLogout}
          >
            <View style={language === 'ur' ? { transform: [{ scaleX: -1 }] } : {}}>
              <LogOut size={20} color={colors.danger} />
            </View>
            <Text style={[styles.logoutText, { color: colors.danger }]}>{t('LogOut')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* FAQ Modal */}
      <Modal visible={showFaqModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                <CircleHelp size={22} color="#3B82F6" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('helpCenter')}</Text>
              <TouchableOpacity style={[styles.closeBtn, { padding: 8, backgroundColor: isDark ? '#374151' : '#F3F4F6', borderRadius: 20 }]} onPress={() => setShowFaqModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {FAQ_DATA.map((faq, index) => (
                <View key={index} style={{ marginBottom: 16 }}>
                  <Text style={[styles.faqQuestion, { color: colors.text, textAlign: 'auto' }]}>
                    {language === 'ur' ? toUrduNumerals(faq.q_ur) : language === 'sd' ? faq.q_sd : language === 'ru' ? faq.q_ru : faq.q_en}
                  </Text>
                  <Text style={[styles.faqAnswer, { color: colors.textSecondary, textAlign: 'auto' }]}>
                    {language === 'ur' ? toUrduNumerals(faq.a_ur) : language === 'sd' ? faq.a_sd : language === 'ru' ? faq.a_ru : faq.a_en}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bug Report / Suggestion Modal */}
      <Modal visible={showBugModal} transparent animationType="fade">
        <View style={styles.bugModalOverlayCenter}>
          <View style={[styles.bugModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
            <TouchableOpacity 
              style={[
                styles.closeBtnAbsolute,
                { backgroundColor: isDark ? '#374151' : '#F3F4F6', borderRadius: 20 },
                isRTL ? { left: 16 } : { right: 16 }
              ]} 
              onPress={() => { setShowBugModal(false); setBugText(''); }}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={[styles.modalIconBoxLarge, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2' }]}>
              <Bug size={32} color="#EF4444" />
            </View>
            <Text style={[styles.bugModalTitle, { 
              color: colors.text,
              fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
              fontSize: language === 'ur' ? 24 : 20,
              lineHeight: language === 'ur' ? 40 : undefined,
              writingDirection: isRTL ? 'rtl' : 'ltr',
              includeFontPadding: false,
            }]}>{language === 'ur' ? 'بگ رپورٹ یا تجویز' : language === 'ru' ? 'Bug Report / Suggestion' : 'Report a Bug / Suggestion'}</Text>
            <Text style={[styles.bugModalSub, { 
              color: colors.textSecondary,
              fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
              fontSize: language === 'ur' ? 16 : 14,
              lineHeight: language === 'ur' ? 34 : 22,
              writingDirection: isRTL ? 'rtl' : 'ltr',
            }]}>
              {language === 'ur' ? 'براہ کرم مسئلے کی تفصیل بتائیں، یا نئے فیچرز اور بہتری کے لیے اپنی تجاویز شیئر کریں۔' : language === 'ru' ? 'Baraye meharbani maslay ki tafseel batayein, ya naye features aur behtari ke liye apni tajaweez share karein.' : 'Please describe the issue, or share your suggestions and ideas for new features.'}
            </Text>
            
            <TextInput
              style={[styles.bugInput, { 
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#f3f4f6', 
                color: colors.text, 
                borderColor: CARD_BORDER,
                fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr'
              }]}
              placeholder={language === 'ur' ? "مسئلے کی تفصیل یا تجویز یہاں لکھیں..." : language === 'ru' ? "Bug ki tafseel ya tajweez yahan likhein..." : "Describe the bug or suggest a feature here..."}
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
              value={bugText}
              onChangeText={setBugText}
            />

            <TouchableOpacity
              style={[styles.bugSubmitBtn, { backgroundColor: bugText.trim().length > 0 ? colors.primary : colors.border, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}
              disabled={bugText.trim().length === 0 || isSubmittingBug}
              onPress={submitBugReport}
            >
              {isSubmittingBug ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={16} color="#fff" />
                  <Text style={[styles.bugSubmitText, {
                    fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
                    fontSize: language === 'ur' ? 17 : 15,
                    lineHeight: language === 'ur' ? 30 : undefined,
                    includeFontPadding: false
                  }]}>{language === 'ur' ? 'رپورٹ جمع کرائیں' : language === 'ru' ? 'Report Jama Karayein' : 'Submit Report'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.logoutModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER, alignSelf: 'center' }]}>
            <View style={{ width: '100%', alignItems: 'flex-start', paddingRight: isRTL ? 16 : 0 }}>
              <Text style={[styles.logoutModalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('LogOut')}</Text>
              <Text style={[styles.logoutModalSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('logOutConfirm')}
              </Text>
            </View>
            
            <View style={[styles.modalActions, { marginTop: 24, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]} onPress={() => setShowLogoutModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.danger }]} onPress={confirmLogout}>
                <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>{t('LogOut')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteAccountModal} transparent animationType="fade" onRequestClose={() => !isDeletingAccount && setShowDeleteAccountModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: CARD_BORDER }]}>
            <View style={[styles.modalIconBoxLarge, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2' }]}>
              <UserX size={32} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', flex: 0, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined, fontSize: language === 'ur' ? 22 : 20 }]}>
              {language === 'ur' ? 'اکاؤنٹ ڈیلیٹ کریں' : language === 'ru' ? 'Account Delete Karein' : 'Delete Account'}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary, textAlign: 'center', marginBottom: 24, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined, fontSize: language === 'ur' ? 16 : 15, lineHeight: language === 'ur' ? 28 : 22 }]}>
              {language === 'ur' ? 'کیا آپ واقعی اپنا اکاؤنٹ اور تمام ڈیٹا مستقل طور پر ڈیلیٹ کرنا چاہتے ہیں؟ اس عمل کو واپس نہیں کیا جا سکتا۔' : language === 'ru' ? 'Kya aap waqai apna account aur sara data hamesha ke liye delete karna chahte hain? Is amal ko wapas nahi kiya ja sakta.' : 'Are you sure you want to permanently delete your account and all data? This action cannot be undone.'}
            </Text>

            {isDeletingAccount ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#EF4444" />
                <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : 'PlusJakartaSans-Medium' }}>
                  {language === 'ur' ? 'ڈیلیٹ کیا جا رہا ہے...' : 'Deleting Account...'}
                </Text>
              </View>
            ) : (
              <View style={[styles.modalActions, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                  onPress={() => { triggerHaptic(); setShowDeleteAccountModal(false); }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>{language === 'ur' ? 'منسوخ کریں' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => { triggerHaptic(); confirmDeleteAccount(); }}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>{language === 'ur' ? 'ڈیلیٹ کریں' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => !isChangingPassword && setShowPasswordModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: CARD_BORDER, width: '90%', maxWidth: 400 }]}>
            <View style={[styles.modalIconBoxLarge, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF' }]}>
              <Lock size={32} color="#8B5CF6" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', flex: 0, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined, fontSize: language === 'ur' ? 22 : 20 }]}>
              {language === 'ur' ? 'پاسورڈ تبدیل کریں' : 'Change Password'}
            </Text>
            
            <View style={{ width: '100%', marginTop: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, alignSelf: 'flex-start' }}>
                {language === 'ur' ? 'موجودہ پاسورڈ' : 'Current Password'}
              </Text>
              <TextInput
                style={[{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#f3f4f6', color: colors.text, borderColor: CARD_BORDER, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, textAlign: isRTL ? 'right' : 'left', marginBottom: 16 }]}
                secureTextEntry
                value={currentPassword}
                onChangeText={(text) => { setCurrentPassword(text); setPasswordError(''); }}
                placeholder={language === 'ur' ? 'موجودہ پاسورڈ درج کریں' : 'Enter current password'}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 2, alignSelf: 'flex-start' }}>
                {language === 'ur' ? 'نیا پاسورڈ' : language === 'ru' ? 'Naya Password' : 'New Password'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textSecondary, marginBottom: 8, alignSelf: 'flex-start', opacity: 0.8 }}>
                {language === 'ur' ? 'کم از کم 8 حروف، 1 بڑا حرف، 1 نمبر، 2 خاص حروف' : language === 'ru' ? 'Kam az kam 8 huruf, 1 bara harf, 1 number, 2 khaas huruf' : 'Min 8 chars, 1 uppercase, 1 num, 2 special chars'}
              </Text>
              <TextInput
                style={[{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#f3f4f6', color: colors.text, borderColor: CARD_BORDER, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, textAlign: isRTL ? 'right' : 'left', marginBottom: passwordError ? 8 : 24 }]}
                secureTextEntry
                value={newPassword}
                onChangeText={(text) => { setNewPassword(text); setPasswordError(''); }}
                placeholder={language === 'ur' ? 'نیا پاسورڈ درج کریں' : language === 'ru' ? 'Naya password darj karein' : 'Enter new password'}
                placeholderTextColor={colors.textSecondary}
              />
              
              {passwordError ? (
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700', marginBottom: 20, alignSelf: 'flex-start', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }}>
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {isChangingPassword ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : 'PlusJakartaSans-Medium' }}>
                  {language === 'ur' ? 'تبدیل کیا جا رہا ہے...' : 'Changing Password...'}
                </Text>
              </View>
            ) : (
              <View style={[styles.modalActions, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                  onPress={() => { triggerHaptic(); setShowPasswordModal(false); }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>{language === 'ur' ? 'منسوخ کریں' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => { triggerHaptic(); submitChangePassword(); }}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>{language === 'ur' ? 'تبدیل کریں' : 'Change'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Notification Permission Modal */}
      <Modal visible={notifModalType !== null} transparent animationType="fade" onRequestClose={() => setNotifModalType(null)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.logoutModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER, alignSelf: 'center' }]}>
            <View style={{ width: '100%', alignItems: 'flex-start' }}>
              <View style={[styles.modalIconBox, {
                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
                width: 44, height: 44, borderRadius: 22,
                justifyContent: 'center', alignItems: 'center',
                alignSelf: 'flex-start'
              }]}>
                <Bell size={24} color="#3B82F6" />
              </View>

              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000', flex: 0, textAlign: 'left', width: '100%', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined, marginTop: 16 }]}>
                {notifModalType === 'toggle' 
                  ? (language === 'ur' ? 'ڈیوائس کی سیٹنگز' : language === 'ru' ? 'Device Settings' : 'Device Settings')
                  : (language === 'ur' ? 'اجازت درکار ہے' : language === 'ru' ? 'Permission Required' : 'Permission Required')
                }
              </Text>
              
              <Text style={[styles.modalDesc, { color: isDark ? '#F3F4F6' : '#111827', flex: 0, textAlign: 'left', width: '100%', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined, fontSize: language === 'ur' ? 15 : 14, lineHeight: language === 'ur' ? 28 : 20, marginBottom: 24, marginTop: 8 }]}>
                {notifModalType === 'toggle'
                  ? (language === 'ur' ? 'نوٹیفیکیشنز کی اجازت فون کی سیٹنگز سے تبدیل کی جا سکتی ہے۔ کیا آپ سیٹنگز کھولنا چاہتے ہیں؟' : language === 'ru' ? 'Notification permission phone ki settings se tabdeel hoti hai. Kya aap settings kholna chahte hain?' : 'Notification permissions are managed in your device settings. Open settings now?')
                  : (language === 'ur' ? 'ٹیسٹ الرٹ حاصل کرنے کے لیے پہلے نوٹیفیکیشنز آن کریں۔' : language === 'ru' ? 'Test alert hasil karne ke liye pehle notifications on karein.' : 'Please enable notifications first to receive the test alert.')
                }
              </Text>

              <View style={[styles.modalActions, { flexDirection: 'row' }]}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                  onPress={() => { triggerHaptic(); setNotifModalType(null); }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text, fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>
                    {language === 'ur' ? 'کینسل' : language === 'ru' ? 'Cancel' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={() => {
                    triggerHaptic();
                    setNotifModalType(null);
                    Linking.openSettings();
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>
                    {language === 'ur' ? 'سیٹنگز کھولیں' : language === 'ru' ? 'Open Settings' : 'Open Settings'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cannot Change Password Modal */}
      <Modal visible={showCannotChangePasswordModal} transparent animationType="fade" onRequestClose={() => setShowCannotChangePasswordModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.logoutModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER, alignSelf: 'center' }]}>
            <View style={{ width: '100%', alignItems: 'flex-start' }}>
              {/* Icon + Title header row */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 14,
                gap: 12,
              }}>
                <View style={[styles.modalIconBox, {
                  backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2',
                  width: 44,
                  height: 44,
                  alignSelf: 'center',
                }]}>
                  <Shield size={20} color="#EF4444" />
                </View>
                <Text style={[
                  styles.logoutModalTitle,
                  {
                    color: colors.text,
                    marginBottom: 0,
                    fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
                    fontSize: language === 'ur' ? 22 : 20,
                    lineHeight: language === 'ur' ? 38 : 26,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                    flexShrink: 1,
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}>
                  {language === 'ur' ? 'معذرت' : 'Cannot Change Password'}
                </Text>
              </View>

              {/* Body text */}
              <Text style={[
                styles.logoutModalSub,
                {
                  color: colors.textSecondary,
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
                  fontSize: language === 'ur' ? 16 : 15,
                  lineHeight: language === 'ur' ? 34 : 22,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}>
                {language === 'ur'
                  ? 'آپ نے گوگل یا فون کے ذریعے لاگ ان کیا ہے۔ پاسورڈ تبدیل کرنے کے لیے اپنے متعلقہ اکاؤنٹ کی ترتیبات میں جائیں۔'
                  : 'You logged in using Google or Phone. To change your password, please use your respective account settings.'}
              </Text>
            </View>

            {/* OK button */}
            <View style={[styles.modalActions, { marginTop: 24, flexDirection: 'row' }]}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={() => { triggerHaptic(); setShowCannotChangePasswordModal(false); }}>
                <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>
                  {language === 'ur' ? 'ٹھیک ہے' : 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bug/Suggestion Success Modal */}
      <Modal visible={showBugSuccessModal} transparent animationType="fade" onRequestClose={() => setShowBugSuccessModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.logoutModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER, alignSelf: 'center' }]}>
            <View style={{ width: '100%', alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[
                styles.logoutModalTitle,
                {
                  color: colors.text,
                  marginBottom: 12,
                  fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
                  fontSize: language === 'ur' ? 22 : 20,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                  textAlign: 'left',
                  width: '100%',
                },
              ]}>
                {language === 'ur' ? 'رپورٹ درج ہو گئی' : language === 'ru' ? 'Report Jama Ho Gayi' : 'Report Submitted'}
              </Text>
              
              <Text style={[
                styles.logoutModalSub,
                {
                  color: colors.textSecondary,
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
                  fontSize: language === 'ur' ? 16 : 15,
                  lineHeight: language === 'ur' ? 34 : 22,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}>
                {language === 'ur' ? 'شکریہ! ہماری انجینئرنگ ٹیم اس کا جائزہ لے گی۔' : language === 'ru' ? 'Shukriya! Hamari engineering team is ka jaiza lay gi.' : 'Thank you! Our engineering team will look into this.'}
              </Text>
            </View>

            <View style={[styles.modalActions, { marginTop: 24, flexDirection: 'row' }]}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={() => { triggerHaptic(); setShowBugSuccessModal(false); }}>
                <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>
                  {language === 'ur' ? 'ٹھیک ہے' : 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cache Cleared Modal */}
      <Modal visible={showCacheClearedModal} transparent animationType="fade" onRequestClose={() => setShowCacheClearedModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.logoutModalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER, alignSelf: 'center' }]}>
            <View style={{ width: '100%', alignItems: 'flex-start' }}>
              <Text style={[
                styles.logoutModalTitle,
                {
                  color: colors.text,
                  marginBottom: 12,
                  fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
                  fontSize: language === 'ur' ? 22 : 20,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                  textAlign: 'left',
                  width: '100%',
                },
              ]}>
                {cacheClearedMessage.title}
              </Text>
              
              <Text style={[
                styles.logoutModalSub,
                {
                  color: colors.textSecondary,
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined,
                  fontSize: language === 'ur' ? 16 : 15,
                  lineHeight: language === 'ur' ? 34 : 22,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}>
                {cacheClearedMessage.desc}
              </Text>
            </View>

            <View style={[styles.modalActions, { marginTop: 24, flexDirection: 'row' }]}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={() => { triggerHaptic(); setShowCacheClearedModal(false); }}>
                <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: language === 'ur' ? 'NotoNastaliqUrdu' : undefined }]}>
                  {language === 'ur' ? 'ٹھیک ہے' : 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  screenLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  pageTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 1 },

  scrollContent: { paddingBottom: 40 },

  section: { marginTop: 22, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 10,
  },

  settingCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },

  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  settingIconBox: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  settingText:  { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '800' },
  settingDesc:  { fontSize: 13, fontWeight: '600', marginTop: 2 },
  rowDivider:   { height: 1, marginHorizontal: 14 },

  /* Language — segmented control */
  segmentContainer: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4,
  },
  segmentPill: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
  },
  segmentDivide: {},  // placeholder for future divider line if needed
  segmentMain: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  segmentSub:  { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  /* Area Scroll */
  areaScroll: { gap: 8, paddingVertical: 2 },
  areaPill: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  areaPillText: { fontSize: 13, fontWeight: '800' },

  /* Info chip */
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 20, padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  infoText: { fontSize: 12, fontWeight: '600' },

  /* Logout */
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 14, marginHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '800' },

  /* Modal Styling */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20, alignItems: 'center' },
  bugModalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 12, alignItems: 'center' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '90%', borderWidth: 1 },
  modalContent: { width: '85%', borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center' },
  bugModalCard: { width: '100%', maxWidth: 500, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  modalIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalIconBoxLarge: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: '900' },
  modalDesc: { fontSize: 15, fontWeight: '500', lineHeight: 22, marginTop: 12 },
  modalActions: { width: '100%', marginTop: 32, gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '800' },
  closeBtn: { padding: 4 },
  closeBtnAbsolute: { position: 'absolute', top: 16, padding: 8, zIndex: 10 },
  modalScroll: { flex: 1 },
  
  faqQuestion: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  faqAnswer: { fontSize: 14, fontWeight: '500', lineHeight: 22, marginBottom: 20 },

  bugModalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  bugModalSub: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  bugInput: { width: '100%', minHeight: 220, borderRadius: 16, padding: 18, fontSize: 16, borderWidth: 1, marginBottom: 24, lineHeight: 24 },
  bugSubmitBtn: { width: '100%', paddingVertical: 14, borderRadius: 14 },
  bugSubmitText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  logoutModalCard: { width: '85%', borderRadius: 16, padding: 24, borderWidth: 1 },
  logoutModalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  logoutModalSub: { fontSize: 16, fontWeight: '500', lineHeight: 24, marginBottom: 24 },
  logoutModalActions: { marginTop: 8, gap: 16 },
  logoutBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  logoutBtnText: { fontSize: 15, fontWeight: '800' },

  /* Phone notification settings deep-link */
  notifPhoneSettingsBtn: {
    width: '100%', marginTop: 12, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  notifPhoneSettingsBtnText: {
    fontSize: 14, fontWeight: '700',
  },

});

export default TarjeehatScreen;
