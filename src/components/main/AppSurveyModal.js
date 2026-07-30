import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNetwork } from '../../context/NetworkContext';
import { CheckCircle2, Star, X, ChevronRight, ChevronLeft } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const L = (lang, en, ru, ur) => lang === 'ur' ? ur : lang === 'ru' ? ru : en;

const AppSurveyModal = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { requireInternet } = useNetwork();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState('prompt'); // 'prompt', 0..5 (questions), 'thanks'
  const [answers, setAnswers] = useState({});

  const isRTL = language === 'ur' || language === 'sd';
  const MUTED = isDark ? '#9CA3AF' : '#6B7280';
  const CARD_BORDER = isDark ? '#374151' : '#E5E7EB';

  const questions = [
    {
      id: 'q1',
      type: 'mcq',
      q: L(language, 'How easy is it to report an issue?', 'Masla report karna kitna asaan hai?', 'مسئلہ رپورٹ کرنا کتنا آسان ہے؟'),
      options: [
        L(language, 'Very Easy', 'Bohat Asaan', 'بہت آسان'),
        L(language, 'Easy', 'Asaan', 'آسان'),
        L(language, 'Neutral', 'Darmiyana', 'درمیانہ'),
        L(language, 'Hard', 'Mushkil', 'مشکل'),
      ]
    },
    {
      id: 'q2',
      type: 'mcq',
      q: L(language, 'Are you satisfied with the issue verification system?', 'Kya aap maslay ki tasdeeq ke nizam se mutmain hain?', 'کیا آپ مسئلے کی تصدیق کے نظام سے مطمئن ہیں؟'),
      options: [
        L(language, 'Very Satisfied', 'Bohat Mutmain', 'بہت مطمئن'),
        L(language, 'Satisfied', 'Mutmain', 'مطمئن'),
        L(language, 'Not Sure', 'Yaqeen Nahi', 'یقین نہیں'),
        L(language, 'Dissatisfied', 'Ghair Mutmain', 'غیر مطمئن'),
      ]
    },
    {
      id: 'q3',
      type: 'mcq',
      q: L(language, 'How useful do you find the community rewards (Inaam)?', 'Aap ko community inaam kitne mufeed lagte hain?', 'آپ کو کمیونٹی انعامات (انعام) کتنے مفید لگتے ہیں؟'),
      options: [
        L(language, 'Very Useful', 'Bohat Mufeed', 'بہت مفید'),
        L(language, 'Useful', 'Mufeed', 'مفید'),
        L(language, 'Rarely Use', 'Kam Istemaal Karta Hoon', 'شاذ و نادر استعمال کرتا ہوں'),
        L(language, 'Not Useful', 'Mufeed Nahi', 'مفید نہیں'),
      ]
    },
    {
      id: 'q4',
      type: 'mcq',
      q: L(language, 'Is the map interface (Naksha) intuitive and easy to use?', 'Kya nakshay ka interface asaan aur samajh mein aane wala hai?', 'کیا نقشے کا انٹرفیس (نقشہ) بدیہی اور استعمال میں آسان ہے؟'),
      options: [
        L(language, 'Yes, completely', 'Haan, bilkul', 'جی ہاں، بالکل'),
        L(language, 'Mostly', 'Zyada tar', 'زیادہ تر'),
        L(language, 'Needs Improvement', 'Behtari ki zaroorat hai', 'بہتری کی ضرورت ہے'),
        L(language, 'No', 'Nahi', 'نہیں'),
      ]
    },
    {
      id: 'q5',
      type: 'mcq',
      q: L(language, 'Would you recommend this app to other citizens?', 'Kya aap doosre shehriyon ko is app ka mashwara denge?', 'کیا آپ دوسرے شہریوں کو اس ایپ کی سفارش کریں گے؟'),
      options: [
        L(language, 'Definitely', 'Zaroor', 'یقینی طور پر'),
        L(language, 'Maybe', 'Shayad', 'شاید'),
        L(language, 'Not Sure', 'Yaqeen Nahi', 'یقین نہیں'),
        L(language, 'No', 'Nahi', 'نہیں'),
      ]
    },
    {
      id: 'q6',
      type: 'rating',
      q: L(language, 'Please rate your overall experience out of 5 stars.', 'Bara-e-meharbani apne majmooi tajurbay ko 5 sitaron mein se rate karein.', 'براہ کرم 5 ستاروں میں سے اپنے مجموعی تجربے کی درجہ بندی کریں۔'),
    }
  ];

  const handleSelectOption = (qIndex, optionIndex) => {
    setAnswers({ ...answers, [qIndex]: optionIndex });
  };

  const handleNext = () => {
    requireInternet(async () => {
      if (currentStep === 'prompt') {
        setCurrentStep(0);
      } else if (typeof currentStep === 'number') {
        if (currentStep < questions.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          try {
            await firestore().collection('surveys').add({
              userId: user?.id || 'anonymous',
              answers,
              timestamp: firestore.FieldValue.serverTimestamp()
            });
          } catch (e) {
            console.warn('Survey save error:', e);
          }
          setCurrentStep('thanks');
        }
      }
    });
  };

  const handleClose = () => {
    setCurrentStep('prompt');
    setAnswers({});
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDark ? colors.surfaceElevated : '#fff', borderColor: CARD_BORDER }]}>
          
          {currentStep === 'prompt' && (
            <View style={styles.content}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '40' }]}>
                <CheckCircle2 size={40} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {L(language, 'We Value Your Feedback', 'Hum Aap Ki Raye Ki Qadar Karte Hain', 'ہم آپ کی رائے کی قدر کرتے ہیں')}
              </Text>
              <Text style={[styles.desc, { color: MUTED }]}>
                {L(language, 
                  'Help us improve the Karachi Complaint Portal by taking a quick 6-question survey.',
                  'Ek mukhtasar 6 sawalon ka survey kar ke Karachi Complaint Portal ko behtar banane mein hamari madad karein.',
                  'ایک مختصر 6 سوالوں کا سروے کر کے کراچی کمپلینٹ پورٹل کو بہتر بنانے میں ہماری مدد کریں۔'
                )}
              </Text>
              
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, marginBottom: 12 }]} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>{L(language, 'Start Survey', 'Survey Shuru Karein', 'سروے شروع کریں')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#EF4444' }]} onPress={handleClose}>
                <Text style={styles.primaryBtnText}>{L(language, 'Skip Survey', 'Survey Chhordein', 'سروے چھوڑیں')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {typeof currentStep === 'number' && (
            <View style={styles.content}>
              <View style={[styles.topBar, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={[styles.stepCount, { color: MUTED }]}>
                  {currentStep + 1} / {questions.length}
                </Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{top:15, bottom:15, left:15, right:15}} style={{ padding: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: 20 }}>
                  <X size={26} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.questionText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {questions[currentStep].q}
              </Text>

              {questions[currentStep].type === 'mcq' && (
                <View style={styles.optionsList}>
                  {questions[currentStep].options.map((opt, i) => {
                    const isSelected = answers[currentStep] === i;
                    return (
                      <TouchableOpacity 
                        key={i} 
                        style={[
                          styles.optionBtn, 
                          { 
                            backgroundColor: isSelected ? colors.primaryGlow : (isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB'),
                            borderColor: isSelected ? colors.primary : CARD_BORDER,
                            flexDirection: isRTL ? 'row-reverse' : 'row'
                          }
                        ]}
                        onPress={() => handleSelectOption(currentStep, i)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.radio, { borderColor: isSelected ? colors.primary : MUTED }]}>
                          {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                        </View>
                        <Text style={[styles.optionText, { color: isSelected ? colors.primary : colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {questions[currentStep].type === 'rating' && (
                <View style={[styles.ratingBox, isRTL && { flexDirection: 'row-reverse' }]}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity 
                      key={star} 
                      onPress={() => handleSelectOption(currentStep, star)}
                      style={styles.starBtn}
                    >
                      <Star 
                        size={40} 
                        color={answers[currentStep] >= star ? '#F59E0B' : (isDark ? '#374151' : '#E5E7EB')} 
                        fill={answers[currentStep] >= star ? '#F59E0B' : 'transparent'} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={[styles.navRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity 
                  style={[styles.backBtn, { borderColor: CARD_BORDER, opacity: currentStep === 0 ? 0 : 1 }]} 
                  onPress={() => setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 0}
                >
                  {isRTL ? <ChevronRight size={20} color={colors.text} /> : <ChevronLeft size={20} color={colors.text} />}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.nextBtn, { backgroundColor: colors.primary, opacity: answers[currentStep] !== undefined ? 1 : 0.5 }]} 
                  onPress={handleNext}
                  disabled={answers[currentStep] === undefined}
                >
                  <Text style={styles.primaryBtnText}>
                    {currentStep === questions.length - 1 
                      ? L(language, 'Submit', 'Jama Karein', 'جمع کرائیں')
                      : L(language, 'Next', 'Agla', 'اگلا')}
                  </Text>
                  {currentStep !== questions.length - 1 && (isRTL ? <ChevronLeft size={16} color="#fff" /> : <ChevronRight size={16} color="#fff" />)}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentStep === 'thanks' && (
            <View style={styles.content}>
              <View style={[styles.iconCircle, { backgroundColor: '#10B98120', borderColor: '#10B98140' }]}>
                <CheckCircle2 size={40} color="#10B981" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {L(language, 'Thank You!', 'Shukriya!', 'آپ کا شکریہ!')}
              </Text>
              <Text style={[styles.desc, { color: MUTED }]}>
                {L(language, 
                  'Your feedback is invaluable and helps us make the platform better for everyone.',
                  'Aap ki raye anmol hai aur platform ko sab ke liye behtar banane mein hamari madad karti hai.',
                  'آپ کی رائے انمول ہے اور پلیٹ فارم کو سب کے لیے بہتر بنانے میں ہماری مدد کرتی ہے۔'
                )}
              </Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleClose}>
                <Text style={styles.primaryBtnText}>{L(language, 'Close', 'Band Karein', 'بند کریں')}</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  card: {
    width: '100%', maxWidth: 400, borderRadius: 24, borderWidth: 1,
    overflow: 'hidden', padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10
  },
  content: { alignItems: 'center', width: '100%' },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20
  },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  desc: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  primaryBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipBtn: { width: '100%', paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  skipText: { fontSize: 14, fontWeight: '700' },
  
  topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  stepCount: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  questionText: { fontSize: 18, fontWeight: '800', width: '100%', marginBottom: 24, lineHeight: 26 },
  
  optionsList: { width: '100%', gap: 12, marginBottom: 32 },
  optionBtn: {
    width: '100%', padding: 16, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 15, fontWeight: '700', flex: 1 },
  
  ratingBox: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 40, width: '100%' },
  starBtn: { padding: 4 },
  
  navRow: { width: '100%', flexDirection: 'row', gap: 12 },
  backBtn: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  nextBtn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }
});

export default AppSurveyModal;
