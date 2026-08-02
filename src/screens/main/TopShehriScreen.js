import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, RefreshControl, Modal, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, MapPin, TrendingUp, Medal, Crown, X, Star, Shield, Award, ChevronDown, User, Target, Flame } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const AVATAR_SIZE = 68; // equal for all podium spots

// ─── Leader Pools ───────────────────────────────────────────────────────────
// Each leader has:
//   basePoints   — points per time period (thisWeek | thisMonth | allTime)
//   catAffinity  — per-category multiplier (1.0 = average; 2.0 = specialist; 0.3 = weak)
//                  Keys: all | verifier | sewerage | pothole | waste | kunda | encroachment
//   baseIssues   — base issues-reported count (varied ±30% per filter combo)
//   area         — home neighbourhood shown in profile
//
// This affinity table is the engine that makes the leaderboard genuinely re-order
// when the user switches filters — a sewerage specialist beats the pothole expert
// only when "Sewerage" is selected, not in "All".
// ─────────────────────────────────────────────────────────────────────────────

// 15-person global pool (top-6 surface per zone+filter combo)
// To ensure the app pulls real data from Firebase, dummy data has been temporarily disabled.
// The app will run normally and just show the current user in the leaderboard.
//
// TODO (Firebase Connection): To hook this up to real data smoothly:
// 1. Move this to a state inside the component: const [globalPool, setGlobalPool] = useState([]);
// 2. Fetch via useEffect:
//    useEffect(() => {
//      firestore().collection('leaderboard_global').get().then(snap => {
//        setGlobalPool(snap.docs.map(d => ({ id: d.id, ...d.data() })));
//      });
//    }, []);
const GLOBAL_LEADER_POOL = []; /* [
  {
    id: 'g1', name: 'Nadia Rauf', area: 'FB Area', baseIssues: 31,
    basePoints: { thisWeek: 3150, thisMonth: 3750, allTime: 38200 },
    catAffinity: { all: 1.0, verifier: 1.8, sewerage: 0.6, pothole: 0.9, waste: 1.4, kunda: 0.5, encroachment: 1.1 },
  },
  {
    id: 'g2', name: 'Saad Tariq', area: 'Clifton', baseIssues: 47,
    basePoints: { thisWeek: 2980, thisMonth: 7100, allTime: 55000 },
    catAffinity: { all: 1.0, verifier: 0.7, sewerage: 1.9, pothole: 0.8, waste: 0.5, kunda: 1.2, encroachment: 0.6 },
  },
  {
    id: 'g3', name: 'Ayesha Omer', area: 'Nazimabad', baseIssues: 22,
    basePoints: { thisWeek: 2840, thisMonth: 4900, allTime: 32500 },
    catAffinity: { all: 1.0, verifier: 1.3, sewerage: 0.4, pothole: 0.7, waste: 2.0, kunda: 0.9, encroachment: 1.5 },
  },
  {
    id: 'g4', name: 'Zia Ahmed', area: 'Clifton', baseIssues: 63,
    basePoints: { thisWeek: 2720, thisMonth: 8450, allTime: 58200 },
    catAffinity: { all: 1.0, verifier: 0.6, sewerage: 0.8, pothole: 2.2, waste: 0.7, kunda: 0.4, encroachment: 1.0 },
  },
  {
    id: 'g5', name: 'Murtaza Ali', area: 'Lyari', baseIssues: 19,
    basePoints: { thisWeek: 2610, thisMonth: 3900, allTime: 28100 },
    catAffinity: { all: 1.0, verifier: 0.9, sewerage: 1.6, pothole: 0.5, waste: 1.1, kunda: 2.1, encroachment: 0.4 },
  },
  {
    id: 'g6', name: 'Sara Khan', area: 'Gulshan-e-Iqbal', baseIssues: 54,
    basePoints: { thisWeek: 2500, thisMonth: 6850, allTime: 51850 },
    catAffinity: { all: 1.0, verifier: 2.0, sewerage: 0.7, pothole: 1.2, waste: 0.6, kunda: 0.8, encroachment: 1.3 },
  },
  {
    id: 'g7', name: 'Hassan Raza', area: 'Malir', baseIssues: 71,
    basePoints: { thisWeek: 1900, thisMonth: 5600, allTime: 62450 },
    catAffinity: { all: 1.0, verifier: 0.8, sewerage: 2.3, pothole: 0.9, waste: 1.0, kunda: 0.5, encroachment: 0.7 },
  },
  {
    id: 'g8', name: 'Fahad Aziz', area: 'DHA', baseIssues: 45,
    basePoints: { thisWeek: 1750, thisMonth: 7200, allTime: 41750 },
    catAffinity: { all: 1.0, verifier: 1.1, sewerage: 0.5, pothole: 1.8, waste: 0.8, kunda: 1.6, encroachment: 0.9 },
  },
  {
    id: 'g9', name: 'Bilal Malik', area: 'Saddar', baseIssues: 38,
    basePoints: { thisWeek: 1600, thisMonth: 5400, allTime: 44900 },
    catAffinity: { all: 1.0, verifier: 0.5, sewerage: 1.0, pothole: 0.6, waste: 2.1, kunda: 0.7, encroachment: 1.8 },
  },
  {
    id: 'g10', name: 'Kiran Shah', area: 'Korangi', baseIssues: 57,
    basePoints: { thisWeek: 1450, thisMonth: 4200, allTime: 49400 },
    catAffinity: { all: 1.0, verifier: 1.6, sewerage: 1.7, pothole: 0.4, waste: 0.9, kunda: 1.0, encroachment: 0.6 },
  },
  {
    id: 'g11', name: 'Imran Abbas', area: 'Nazimabad', baseIssues: 17,
    basePoints: { thisWeek: 1300, thisMonth: 3100, allTime: 21000 },
    catAffinity: { all: 1.0, verifier: 0.4, sewerage: 0.9, pothole: 2.0, waste: 0.6, kunda: 1.9, encroachment: 0.5 },
  },
  {
    id: 'g12', name: 'Tariq Ghauri', area: 'Bahadurabad', baseIssues: 14,
    basePoints: { thisWeek: 1150, thisMonth: 2800, allTime: 18500 },
    catAffinity: { all: 1.0, verifier: 1.4, sewerage: 0.6, pothole: 1.1, waste: 1.7, kunda: 0.8, encroachment: 2.0 },
  },
  {
    id: 'g13', name: 'Kamran Shah', area: 'DHA', baseIssues: 12,
    basePoints: { thisWeek: 1050, thisMonth: 2600, allTime: 15200 },
    catAffinity: { all: 1.0, verifier: 1.9, sewerage: 1.3, pothole: 0.7, waste: 0.5, kunda: 0.9, encroachment: 1.6 },
  },
  {
    id: 'g14', name: 'Bilal Qureshi', area: 'Saddar', baseIssues: 10,
    basePoints: { thisWeek: 950,  thisMonth: 2100, allTime: 12800 },
    catAffinity: { all: 1.0, verifier: 0.6, sewerage: 2.0, pothole: 1.4, waste: 0.8, kunda: 0.5, encroachment: 1.1 },
  },
  {
    id: 'g15', name: 'Qasim Mahmood', area: 'Lyari', baseIssues: 8,
    basePoints: { thisWeek: 820,  thisMonth: 1900, allTime: 9400  },
    catAffinity: { all: 1.0, verifier: 0.7, sewerage: 0.5, pothole: 0.9, waste: 2.2, kunda: 1.7, encroachment: 0.8 },
  },
  { id: 'g16', name: 'Zoya Arif', area: 'Korangi', baseIssues: 41, basePoints: { thisWeek: 2200, thisMonth: 6100, allTime: 42000 }, catAffinity: { all: 1.0, verifier: 0.9, sewerage: 1.5, pothole: 1.1, waste: 0.8, kunda: 1.2, encroachment: 0.7 } },
  { id: 'g17', name: 'Farhan Sheikh', area: 'Gulistan-e-Jauhar', baseIssues: 56, basePoints: { thisWeek: 2100, thisMonth: 5900, allTime: 39500 }, catAffinity: { all: 1.0, verifier: 1.2, sewerage: 0.6, pothole: 1.7, waste: 0.9, kunda: 0.8, encroachment: 1.1 } },
  { id: 'g18', name: 'Mahnoor Baloch', area: 'DHA', baseIssues: 33, basePoints: { thisWeek: 1950, thisMonth: 5100, allTime: 35000 }, catAffinity: { all: 1.0, verifier: 1.8, sewerage: 0.5, pothole: 0.6, waste: 1.4, kunda: 1.1, encroachment: 0.5 } },
  { id: 'g19', name: 'Taimoor Baig', area: 'FB Area', baseIssues: 48, basePoints: { thisWeek: 1850, thisMonth: 4800, allTime: 32000 }, catAffinity: { all: 1.0, verifier: 0.5, sewerage: 1.1, pothole: 1.9, waste: 0.7, kunda: 0.6, encroachment: 2.1 } },
  { id: 'g20', name: 'Sana Javed', area: 'Clifton', baseIssues: 27, basePoints: { thisWeek: 1700, thisMonth: 4500, allTime: 29500 }, catAffinity: { all: 1.0, verifier: 1.5, sewerage: 0.8, pothole: 0.5, waste: 2.2, kunda: 0.7, encroachment: 1.3 } },
  { id: 'g21', name: 'Usman Ghani', area: 'Malir', baseIssues: 62, basePoints: { thisWeek: 1550, thisMonth: 4100, allTime: 27000 }, catAffinity: { all: 1.0, verifier: 0.7, sewerage: 2.5, pothole: 1.2, waste: 0.6, kunda: 0.9, encroachment: 0.8 } },
  { id: 'g22', name: 'Kashif Ali', area: 'Nazimabad', baseIssues: 29, basePoints: { thisWeek: 1400, thisMonth: 3800, allTime: 25000 }, catAffinity: { all: 1.0, verifier: 0.6, sewerage: 0.7, pothole: 1.4, waste: 0.8, kunda: 2.3, encroachment: 1.0 } },
  { id: 'g23', name: 'Rida Zain', area: 'Saddar', baseIssues: 39, basePoints: { thisWeek: 1250, thisMonth: 3500, allTime: 22000 }, catAffinity: { all: 1.0, verifier: 1.4, sewerage: 1.0, pothole: 0.8, waste: 1.7, kunda: 0.5, encroachment: 1.6 } },
  { id: 'g24', name: 'Ali Zafar', area: 'Lyari', baseIssues: 18, basePoints: { thisWeek: 1100, thisMonth: 3200, allTime: 19500 }, catAffinity: { all: 1.0, verifier: 0.8, sewerage: 0.6, pothole: 2.4, waste: 1.1, kunda: 0.9, encroachment: 0.7 } },
  { id: 'g25', name: 'Nida Yasir', area: 'Bahadurabad', baseIssues: 51, basePoints: { thisWeek: 950, thisMonth: 2900, allTime: 17000 }, catAffinity: { all: 1.0, verifier: 1.1, sewerage: 1.2, pothole: 0.7, waste: 1.8, kunda: 1.4, encroachment: 0.5 } },
  { id: 'g26', name: 'Salman Ahmed', area: 'Gulshan-e-Iqbal', baseIssues: 24, basePoints: { thisWeek: 850, thisMonth: 2600, allTime: 15500 }, catAffinity: { all: 1.0, verifier: 0.9, sewerage: 1.8, pothole: 1.0, waste: 0.5, kunda: 2.0, encroachment: 0.8 } },
  { id: 'g27', name: 'Anum Fayyaz', area: 'Clifton', baseIssues: 36, basePoints: { thisWeek: 750, thisMonth: 2300, allTime: 13000 }, catAffinity: { all: 1.0, verifier: 1.6, sewerage: 0.5, pothole: 0.9, waste: 1.2, kunda: 0.6, encroachment: 1.9 } },
  { id: 'g28', name: 'Hamza Ali', area: 'DHA', baseIssues: 15, basePoints: { thisWeek: 650, thisMonth: 1900, allTime: 11500 }, catAffinity: { all: 1.0, verifier: 0.5, sewerage: 0.9, pothole: 1.6, waste: 0.8, kunda: 1.5, encroachment: 1.2 } },
  { id: 'g29', name: 'Bushra Ansari', area: 'Korangi', baseIssues: 43, basePoints: { thisWeek: 550, thisMonth: 1600, allTime: 9500 }, catAffinity: { all: 1.0, verifier: 1.3, sewerage: 1.4, pothole: 0.6, waste: 1.9, kunda: 0.8, encroachment: 0.7 } },
  { id: 'g30', name: 'Fawad Khan', area: 'Saddar', baseIssues: 11, basePoints: { thisWeek: 450, thisMonth: 1300, allTime: 8000 }, catAffinity: { all: 1.0, verifier: 0.8, sewerage: 0.7, pothole: 1.1, waste: 0.6, kunda: 1.8, encroachment: 2.4 } },
]; */

// 18-person local pool — zone+filter hashing surfaces 10 of these per combo,
// so switching zones or categories brings entirely different faces to the front.
// To ensure the app pulls real data from Firebase, dummy data has been temporarily disabled.
//
// TODO (Firebase Connection): To hook this up to real data smoothly:
// 1. Move this to a state inside the component: const [localPool, setLocalPool] = useState([]);
// 2. Fetch via useEffect:
//    useEffect(() => {
//      firestore().collection('leaderboard_local').get().then(snap => {
//        setLocalPool(snap.docs.map(d => ({ id: d.id, ...d.data() })));
//      });
//    }, []);
const LOCAL_LEADER_POOL = []; /* [
  { id: 'l_a',  name: 'Kamran Shah',  basePoints: { thisWeek: 4200,  thisMonth: 18000, allTime: 95000  }, baseIssues: 28, catAffinity: { all: 1.0, verifier: 0.7, sewerage: 1.8, pothole: 0.6, waste: 0.9, kunda: 2.0, encroachment: 0.5 } },
  { id: 'l_b',  name: 'Hina Pervez',  basePoints: { thisWeek: 5850,  thisMonth: 22000, allTime: 120000 }, baseIssues: 41, catAffinity: { all: 1.0, verifier: 1.9, sewerage: 0.6, pothole: 1.4, waste: 0.7, kunda: 0.5, encroachment: 1.8 } },
  { id: 'l_c',  name: 'Tariq Ghauri', basePoints: { thisWeek: 3100,  thisMonth: 13500, allTime: 72000  }, baseIssues: 19, catAffinity: { all: 1.0, verifier: 0.5, sewerage: 2.1, pothole: 0.8, waste: 1.5, kunda: 0.7, encroachment: 0.9 } },
  { id: 'l_d',  name: 'Ali Raza',     basePoints: { thisWeek: 2100,  thisMonth: 9500,  allTime: 51000  }, baseIssues: 14, catAffinity: { all: 1.0, verifier: 1.2, sewerage: 0.7, pothole: 2.0, waste: 0.6, kunda: 1.1, encroachment: 0.8 } },
  { id: 'l_e',  name: 'Salman Khan',  basePoints: { thisWeek: 1800,  thisMonth: 8200,  allTime: 44000  }, baseIssues: 11, catAffinity: { all: 1.0, verifier: 0.8, sewerage: 0.9, pothole: 0.5, waste: 2.2, kunda: 0.6, encroachment: 1.4 } },
  { id: 'l_f',  name: 'Ahmed K.',     basePoints: { thisWeek: 1500,  thisMonth: 6800,  allTime: 37000  }, baseIssues: 8,  catAffinity: { all: 1.0, verifier: 2.0, sewerage: 0.5, pothole: 1.1, waste: 0.8, kunda: 1.7, encroachment: 0.6 } },
  { id: 'l_g',  name: 'Sara J.',      basePoints: { thisWeek: 1200,  thisMonth: 5500,  allTime: 30000  }, baseIssues: 6,  catAffinity: { all: 1.0, verifier: 0.6, sewerage: 1.4, pothole: 0.7, waste: 1.9, kunda: 0.8, encroachment: 1.2 } },
  { id: 'l_h',  name: 'Omer T.',      basePoints: { thisWeek: 800,   thisMonth: 3700,  allTime: 20000  }, baseIssues: 4,  catAffinity: { all: 1.0, verifier: 1.5, sewerage: 0.8, pothole: 1.8, waste: 0.5, kunda: 0.9, encroachment: 2.1 } },
  { id: 'l_i',  name: 'Zainab R.',    basePoints: { thisWeek: 450,   thisMonth: 2100,  allTime: 11500  }, baseIssues: 2,  catAffinity: { all: 1.0, verifier: 0.9, sewerage: 2.0, pothole: 0.6, waste: 0.7, kunda: 1.5, encroachment: 0.8 } },
  { id: 'l_j',  name: 'Faisal Baig',  basePoints: { thisWeek: 6200,  thisMonth: 25000, allTime: 80000  }, baseIssues: 35, catAffinity: { all: 1.0, verifier: 0.4, sewerage: 0.6, pothole: 2.3, waste: 0.8, kunda: 0.7, encroachment: 1.6 } },
  { id: 'l_k',  name: 'Rabia Naz',    basePoints: { thisWeek: 3800,  thisMonth: 16000, allTime: 61000  }, baseIssues: 23, catAffinity: { all: 1.0, verifier: 1.7, sewerage: 1.0, pothole: 0.5, waste: 2.0, kunda: 0.6, encroachment: 0.9 } },
  { id: 'l_l',  name: 'Danish A.',    basePoints: { thisWeek: 2700,  thisMonth: 11500, allTime: 48000  }, baseIssues: 16, catAffinity: { all: 1.0, verifier: 0.6, sewerage: 1.6, pothole: 1.2, waste: 0.5, kunda: 2.2, encroachment: 0.7 } },
  { id: 'l_m',  name: 'Lubna Irfan',  basePoints: { thisWeek: 900,   thisMonth: 4200,  allTime: 22000  }, baseIssues: 5,  catAffinity: { all: 1.0, verifier: 2.1, sewerage: 0.7, pothole: 0.9, waste: 1.3, kunda: 0.5, encroachment: 1.8 } },
  { id: 'l_n',  name: 'Waseem Akram', basePoints: { thisWeek: 5100,  thisMonth: 19500, allTime: 105000 }, baseIssues: 33, catAffinity: { all: 1.0, verifier: 0.8, sewerage: 2.2, pothole: 0.7, waste: 0.6, kunda: 1.0, encroachment: 1.5 } },
  { id: 'l_o',  name: 'Noor Fatima',  basePoints: { thisWeek: 2200,  thisMonth: 9800,  allTime: 53000  }, baseIssues: 13, catAffinity: { all: 1.0, verifier: 1.0, sewerage: 0.8, pothole: 1.9, waste: 1.4, kunda: 0.9, encroachment: 0.6 } },
  { id: 'l_p',  name: 'Adeel Raza',   basePoints: { thisWeek: 680,   thisMonth: 3100,  allTime: 17000  }, baseIssues: 3,  catAffinity: { all: 1.0, verifier: 0.5, sewerage: 0.9, pothole: 0.6, waste: 2.3, kunda: 1.4, encroachment: 0.8 } },
  { id: 'l_q',  name: 'Shaheen Baloch',   basePoints: { thisWeek: 4500,  thisMonth: 17000, allTime: 89000  }, baseIssues: 26, catAffinity: { all: 1.0, verifier: 1.6, sewerage: 0.5, pothole: 0.8, waste: 0.7, kunda: 1.8, encroachment: 2.2 } },
  { id: 'l_r',  name: 'Mohsin Ali',   basePoints: { thisWeek: 1050,  thisMonth: 4700,  allTime: 25000  }, baseIssues: 7,  catAffinity: { all: 1.0, verifier: 0.9, sewerage: 1.2, pothole: 2.1, waste: 0.8, kunda: 0.6, encroachment: 1.0 } },
  { id: 'l_s',  name: 'Mehwish Hayat', basePoints: { thisWeek: 5500, thisMonth: 21000, allTime: 95000 }, baseIssues: 38, catAffinity: { all: 1.0, verifier: 1.4, sewerage: 0.8, pothole: 1.5, waste: 0.9, kunda: 1.1, encroachment: 0.6 } },
  { id: 'l_t',  name: 'Adeel Hussain', basePoints: { thisWeek: 4800, thisMonth: 19000, allTime: 82000 }, baseIssues: 31, catAffinity: { all: 1.0, verifier: 0.7, sewerage: 1.9, pothole: 0.5, waste: 1.4, kunda: 0.8, encroachment: 1.3 } },
  { id: 'l_u',  name: 'Sanam Saeed',   basePoints: { thisWeek: 3500, thisMonth: 15000, allTime: 65000 }, baseIssues: 25, catAffinity: { all: 1.0, verifier: 1.8, sewerage: 0.6, pothole: 1.1, waste: 2.1, kunda: 0.5, encroachment: 0.9 } },
  { id: 'l_v',  name: 'Mikaal Zulf.',  basePoints: { thisWeek: 2900, thisMonth: 12000, allTime: 55000 }, baseIssues: 18, catAffinity: { all: 1.0, verifier: 0.6, sewerage: 1.2, pothole: 2.2, waste: 0.7, kunda: 1.5, encroachment: 0.8 } },
  { id: 'l_w',  name: 'Aiman Khan',    basePoints: { thisWeek: 2400, thisMonth: 10000, allTime: 47000 }, baseIssues: 15, catAffinity: { all: 1.0, verifier: 1.1, sewerage: 0.9, pothole: 0.6, waste: 1.8, kunda: 2.0, encroachment: 0.5 } },
  { id: 'l_x',  name: 'Muneeb Butt',   basePoints: { thisWeek: 1900, thisMonth: 8500,  allTime: 39000 }, baseIssues: 12, catAffinity: { all: 1.0, verifier: 0.8, sewerage: 1.6, pothole: 1.3, waste: 0.5, kunda: 0.9, encroachment: 1.7 } },
  { id: 'l_y',  name: 'Hania Aamir',   basePoints: { thisWeek: 1600, thisMonth: 7000,  allTime: 32000 }, baseIssues: 9,  catAffinity: { all: 1.0, verifier: 1.5, sewerage: 0.5, pothole: 0.8, waste: 1.2, kunda: 0.7, encroachment: 2.3 } },
  { id: 'l_z',  name: 'Asim Azhar',    basePoints: { thisWeek: 1300, thisMonth: 5800,  allTime: 26000 }, baseIssues: 7,  catAffinity: { all: 1.0, verifier: 0.5, sewerage: 2.4, pothole: 0.9, waste: 0.8, kunda: 1.4, encroachment: 0.6 } },
  { id: 'l_aa', name: 'Iqra Aziz',     basePoints: { thisWeek: 1100, thisMonth: 4900,  allTime: 21000 }, baseIssues: 6,  catAffinity: { all: 1.0, verifier: 1.9, sewerage: 0.7, pothole: 1.6, waste: 0.6, kunda: 0.8, encroachment: 1.1 } },
  { id: 'l_bb', name: 'Yasir Hussain', basePoints: { thisWeek: 850,  thisMonth: 3900,  allTime: 16000 }, baseIssues: 4,  catAffinity: { all: 1.0, verifier: 0.6, sewerage: 1.0, pothole: 0.5, waste: 2.5, kunda: 1.2, encroachment: 0.7 } },
  { id: 'l_cc', name: 'Sajal Aly',     basePoints: { thisWeek: 600,  thisMonth: 2800,  allTime: 12000 }, baseIssues: 3,  catAffinity: { all: 1.0, verifier: 1.3, sewerage: 0.8, pothole: 1.9, waste: 0.7, kunda: 0.5, encroachment: 1.6 } },
  { id: 'l_dd', name: 'Ahad Raza',     basePoints: { thisWeek: 350,  thisMonth: 1800,  allTime: 8000  }, baseIssues: 1,  catAffinity: { all: 1.0, verifier: 0.8, sewerage: 1.5, pothole: 0.7, waste: 1.1, kunda: 2.1, encroachment: 0.5 } },
]; */

// Medal tints for top 3
const MEDAL = {
  '1': { color: '#F59E0B', label: '1st' },
  '2': { color: '#94A3B8', label: '2nd' },
  '3': { color: '#B45309', label: '3rd' },
};

const TopShehriScreen = () => {
  const { colors, isDark } = useTheme();
  const { t, language, toUrduNumerals, translateName } = useLanguage();
  const { userStats, complaints, localArea, triggerHaptic } = useAppContext();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Global');

  const CARD_BG     = isDark ? colors.glass : colors.surface;
  const CARD_BORDER = isDark ? colors.glassBorder : colors.border;
  const MUTED       = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,59,36,0.55)';

  const [timeFilter, setTimeFilter] = useState('thisMonth');
  const [catFilter, setCatFilter] = useState('all');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const TIME_FILTERS = [
    { key: 'thisWeek', label: t('thisWeek', { defaultValue: 'This Week' }) },
    { key: 'thisMonth', label: t('thisMonth', { defaultValue: 'This Month' }) },
    { key: 'allTime', label: t('allTime', { defaultValue: 'All Time' }) },
  ];

  const CATEGORY_FILTERS = [
    { key: 'all', label: t('filterAll', { defaultValue: 'All' }) },
    { key: 'verifier', label: t('topVerifier', { defaultValue: 'Top Verifier' }) },
    { key: 'sewerage', label: t('filterSewerage', { defaultValue: 'Sewerage' }) },
    { key: 'pothole', label: t('filterRoads', { defaultValue: 'Broken Roads' }) },
    { key: 'waste', label: t('filterWaste', { defaultValue: 'Waste' }) },
    { key: 'kunda', label: t('filterKunda', { defaultValue: 'Kunda' }) },
    { key: 'encroachment', label: t('filterEncroachment', { defaultValue: 'Encroachment' }) },
  ];

  const ZONES = [localArea, 'Clifton', 'Gulshan-e-Iqbal', 'DHA', 'Malir', 'Gulistan-e-Jauhar', 'Saddar', 'Lyari', 'Nazimabad', 'Korangi'].filter((v, i, a) => a.indexOf(v) === i);
  const [selectedZone, setSelectedZone] = useState(localArea);

  useEffect(() => {
    setSelectedZone(localArea);
  }, [localArea]);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRewards, setShowRewards] = useState(false);
  const [showNemesisModal, setShowNemesisModal] = useState(false);
  const [showFactionModal, setShowFactionModal] = useState(false);

  const [seasonEnd] = useState(new Date().getTime() + 4 * 24 * 60 * 60 * 1000);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const distance = seasonEnd - new Date().getTime();
      if (distance < 0) {
        setTimeRemaining(language === 'ur' ? 'ختم ہو گیا!' : language === 'sd' ? 'ختم ٿي ويو!' : 'Ended!');
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(
        language === 'ur'
          ? `${toUrduNumerals(days)} دن ${toUrduNumerals(hours)} گھنٹے ${toUrduNumerals(mins)} منٹ`
          : language === 'sd'
          ? `${toUrduNumerals(days)} ڏينهن ${toUrduNumerals(hours)} ڪلاڪ ${toUrduNumerals(mins)} منٽ`
          : `${days}d ${hours}h ${mins}m`
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [seasonEnd, language, toUrduNumerals]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  // Stable hash function for deterministic pseudo-randomness
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  // ─── Base scalars ───────────────────────────────────────────────────────────
  // These are only used for the USER's own score; NPC leaders use catAffinity instead.
  const timeScalar  = timeFilter === 'thisWeek' ? 0.1 : timeFilter === 'allTime' ? 5 : 1;
  const isDifferentZone = selectedZone !== localArea;
  const userPts = isDifferentZone
    ? Math.floor(userStats.xp * timeScalar * 0.4)
    : Math.floor(userStats.xp * timeScalar);

  // ─── Issues-reported helper ─────────────────────────────────────────────────
  // Vary ±30% per leader+filter combo so every card shows a unique number.
  const getIssuesReported = (baseIssues, leaderId) => {
    const seed = hashString(`issues_${leaderId}_${selectedZone}_${timeFilter}_${catFilter}`);
    const variance = (seed % 61) - 30; // -30 to +30 integer
    return Math.max(1, baseIssues + Math.round(baseIssues * variance / 100));
  };

  // ─── Core scoring function ──────────────────────────────────────────────────
  // Scores an NPC leader by:
  //  1. Their base points for the selected time period
  //  2. × their category affinity (specialist multiplier — this is what truly reorders them)
  //  3. × a zone-seeded ±70% shuffle so the same category shows different ranks per zone
  const scoreLeader = (leader, zoneSeed) => {
    const timeKey  = timeFilter === 'thisWeek' ? 'thisWeek' : timeFilter === 'allTime' ? 'allTime' : 'thisMonth';
    const basePts  = leader.basePoints[timeKey] || leader.basePoints.thisMonth;
    // Category affinity is the MAIN driver — a 2.3× specialist jumps over a 0.4× generalist
    const affinity = leader.catAffinity?.[catFilter] ?? 1.0;
    const afterAffinity = Math.floor(basePts * affinity);
    // Zone shuffle: ±70% so zone changes meaningfully reorder even close competitors
    const shuffleHash  = hashString(`${leader.id}_${zoneSeed}`);
    const shufflePct   = (shuffleHash % 141) - 70; // -70 to +70
    const finalPts = Math.max(10, Math.floor(afterAffinity * (1 + shufflePct / 100)));
    return finalPts;
  };

  // ─── Global Rankings ────────────────────────────────────────────────────────
  const globalZoneSeed = hashString(`global_${selectedZone}_${catFilter}_${timeFilter}`);

  const scoredGlobalPool = GLOBAL_LEADER_POOL.map(leader => ({
    ...leader,
    name: translateName(leader.name),
    points: scoreLeader(leader, globalZoneSeed),
    issuesReported: getIssuesReported(leader.baseIssues, leader.id),
  }));

  const sortedGlobalPool = [...scoredGlobalPool].sort((a, b) => b.points - a.points);

  const userGlobalEntry = {
    id: 'you', nameKey: 'you', name: t('you'),
    points: userPts, area: localArea,
    issuesReported: userStats.totalComplaints,
  };
  
  let dynamicGlobalRank;
  let displayGlobalLeaders;
  
  // For Global, the user should always simulate being around the 400-480 mark initially
  const ptsBucket   = Math.floor(userPts / 25);
  const filterCombo = `${timeFilter}_${catFilter}_${selectedZone}_${ptsBucket}`;
  const hashVal     = hashString(filterCombo);
  
  // Map XP progress to a rank advantage: up to 400 positions better
  const expectedMax = Math.max(userPts, 15000 * timeScalar);
  const progress    = Math.min(1, userPts / expectedMax);
  const xpAdvantage = Math.floor(400 * progress);         // 0–400 better positions
  const noise       = hashVal % 45;                       // ±45 positions of noise
  let calcRank = 480 - xpAdvantage - noise;               // 480 (new) to ~35 (maxed out)
  calcRank = Math.max(21, calcRank);                      // hard clamp: always outside top 20 unless real
  dynamicGlobalRank = String(calcRank);
  
  displayGlobalLeaders = sortedGlobalPool
    .slice(0, 20)
    .map((item, idx) => ({ ...item, rank: String(idx + 1), points: item.points.toLocaleString() }));

  // ─── Local Rankings ─────────────────────────────────────────────────────────
  const localZoneSeed = hashString(`local_${selectedZone}_${catFilter}_${timeFilter}`);

  const FIRST_NAMES = ['Ali', 'Ahmed', 'Sara', 'Fatima', 'Usman', 'Zainab', 'Kamran', 'Bilal', 'Ayesha', 'Hassan', 'Omer', 'Nadia', 'Saad', 'Kiran', 'Tariq', 'Murtaza', 'Danish', 'Sana', 'Rabia', 'Farhan'];
  const LAST_NAMES = ['Raza', 'Ali', 'Khan', 'Ahmed', 'Shah', 'Malik', 'Baig', 'Tariq', 'Sheikh', 'Baloch', 'Qureshi', 'Javed', 'Aziz', 'Ghauri', 'Zafar'];

  let scoredLocalNPCs = [];
  for (let i = 0; i < 25; i++) {
    const npcHash = hashString(`${localZoneSeed}_npc_${i}`);
    const fName = FIRST_NAMES[npcHash % FIRST_NAMES.length];
    const lName = LAST_NAMES[(npcHash >> 2) % LAST_NAMES.length];
    
    // Base score between 1000 and 7000 depending on rank position to simulate realistic curve
    const baseCurvePts = 6000 - (i * 180) + (npcHash % 1000); 
    const timeMult = timeFilter === 'thisWeek' ? 0.3 : timeFilter === 'allTime' ? 3.5 : 1;
    const catMult = catFilter !== 'all' ? 0.4 + ((npcHash % 100) / 100) : 1; // 0.4 to 1.4
    
    // Add 1200 base so local zone users never have abnormally low XP
    const finalPts = Math.floor(baseCurvePts * timeMult * catMult) + 1200; 
    
    scoredLocalNPCs.push({
      id: `local_npc_${i}`,
      name: `${fName} ${lName}`,
      area: selectedZone,
      points: finalPts,
      issuesReported: 5 + (npcHash % 40),
    });
  }
  
  // Sort naturally by points
  scoredLocalNPCs.sort((a, b) => b.points - a.points);

  const localUserEntry = {
    id: 'you', name: t('you'), area: selectedZone,
    points: userPts, issuesReported: userStats.totalComplaints,
  };
  
  // Merge user into local list
  const allLocal = [...scoredLocalNPCs, localUserEntry].sort((a, b) => b.points - a.points);

  let dynamicLocalRank;
  const userLocalIndex = allLocal.findIndex(l => l.id === 'you');
  if (userLocalIndex < 20) {
    dynamicLocalRank = String(userLocalIndex + 1);
  } else {
    // Generate a realistic lower rank (e.g. 50-75) if they don't have enough XP to be in the top 20
    const lowestNpcPts = scoredLocalNPCs[scoredLocalNPCs.length - 1].points;
    const localProgress = Math.min(1, userPts / Math.max(1, lowestNpcPts));
    const localAdvantage = Math.floor(40 * localProgress);
    dynamicLocalRank = String(75 - localAdvantage - (hashString(selectedZone + timeFilter) % 15));
  }

  const localLeaders = allLocal
    .slice(0, 20)
    .map((item, idx) => ({ ...item, rank: String(idx + 1), points: item.points.toLocaleString() }));

  const leaders = activeTab === 'Global' ? displayGlobalLeaders : localLeaders;

  // Find local rival for Faction Wars (the person just above the user)
  const localRivalRaw = userLocalIndex > 0 ? allLocal[userLocalIndex - 1] : allLocal[1];
  const rivalPtsDiff = localRivalRaw ? Math.max(1, localRivalRaw.points - userPts) : 100;

  const eastScore = 40 + (hashString(timeFilter + catFilter + 'score') % 21); // 40-60 range
  const isEastLeading = eastScore >= 50;

  const myRankObj = {
    id: 'you', nameKey: 'you', name: t('you'),
    rank: activeTab === 'Global' ? dynamicGlobalRank : dynamicLocalRank,
    points: userPts.toLocaleString(),
    area: localArea,
    issuesReported: userStats.totalComplaints,
  };

  const TAB_LABELS = {
    Global: t('global'),
    Local:  `${t('local')} (${t(localArea)})`,
  };

  /* ── Podium ── */
  const renderPodium = () => {
    const top3 = (leaders || []).slice(0, 3);
    // Visual order: 2nd | 1st | 3rd
    const ordered = [top3[1], top3[0], top3[2]];
    const medalKeys = ['2', '1', '3'];

    return (
      <View style={styles.podiumOuter}>
        {ordered.map((leader, idx) => {
          const isFirst = idx === 1;
          const medal = MEDAL[medalKeys[idx]];
          const initials = leader.name.split(' ').map(n => n[0]).join('');

          return (
            <View key={leader.id} style={[styles.podiumSpot, isFirst && styles.podiumSpotFirst]}>
              {/* Crown above 1st — NOT absolute, sits in flow above avatar */}
              {isFirst && (
                <Crown size={22} color="#F59E0B" fill="#F59E0B" style={styles.crown} />
              )}

              {/* Avatar ring */}
              <View style={[styles.podiumRing, { borderColor: medal.color }]}>
                <View style={[styles.podiumAvatar, { backgroundColor: medal.color + '22' }]}>
                  {leader.id === 'you' && user?.profileImage ? (
                    <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 99 }} />
                  ) : (
                    <Text style={[styles.podiumInitials, { color: medal.color }]}>{initials}</Text>
                  )}
                </View>
              </View>

              {/* Rank pill — below avatar in normal flow */}
              <View style={[styles.podiumRankPill, { backgroundColor: medal.color }]}>
                <Text style={styles.podiumRankText}>{toUrduNumerals(leader.rank)}</Text>
              </View>

              <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                {leader.name.split(' ')[0]}
              </Text>
              <Text style={[styles.podiumPts, { color: medal.color }]}>{toUrduNumerals(leader.points)}</Text>
              <Text style={[styles.podiumLabel, { color: MUTED }]}>
                {language === 'ur' ? (medalKeys[idx] === '1' ? 'پہلا' : medalKeys[idx] === '2' ? 'دوسرا' : 'تیسرا') : language === 'sd' ? (medalKeys[idx] === '1' ? 'پهريون' : medalKeys[idx] === '2' ? 'ٻيو' : 'ٽيون') : medal.label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.screenLabel, { color: colors.primary }]}>{t('kcpRankings')}</Text>
            <Text 
              style={[styles.pageTitle, { color: colors.text }]} 
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
              {t('Shehri')}
            </Text>
          </View>
          <View style={[styles.trophyChip, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
            <Trophy size={18} color={colors.primary} />
          </View>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(11,94,43,0.06)', borderColor: CARD_BORDER }]}
              accessible={true} accessibilityRole="tablist">
          {['Global', 'Local'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabPill, activeTab === tab && { backgroundColor: colors.primary }]}
              onPress={() => { triggerHaptic(); setActiveTab(tab); }}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
              accessibilityLabel={TAB_LABELS[tab]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : MUTED }]}>
                {TAB_LABELS[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >

            {/* Cross-Zone Viewing (only when Local tab is selected) */}
          {activeTab === 'Local' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, marginTop: 10, gap: 8 }}>
              {ZONES.map(zone => (
                <TouchableOpacity
                  key={zone}
                  onPress={() => { triggerHaptic(); setSelectedZone(zone); }}
                  style={[{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER }, selectedZone === zone && { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: selectedZone === zone ? colors.primary : MUTED }}>{t(zone)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Tiered Leagues Banner */}
          <View style={{ paddingHorizontal: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>
                {userStats.level < 3 ? (language === 'ur' ? 'نئے شہری لیگ' : 'Bronze Shehri League') : 
                 userStats.level < 6 ? (language === 'ur' ? 'سلور شہری لیگ' : 'Silver Shehri League') : 
                 (language === 'ur' ? 'گولڈ شہری لیگ' : 'Gold Shehri League')}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED }}>
                {userStats.level < 3 ? (language === 'ur' ? `ٹاپ ${toUrduNumerals('20')}% سلور میں جائیں گے` : 'Top 20% advance to Silver') : 
                 userStats.level < 6 ? (language === 'ur' ? `ٹاپ ${toUrduNumerals('20')}% گولڈ میں جائیں گے` : 'Top 20% advance to Gold') : 
                 (language === 'ur' ? `ٹاپ ${toUrduNumerals('5')}% ماسٹر میں جائیں گے` : 'Top 5% advance to Master')}
              </Text>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
              <Medal size={20} color={userStats.level < 3 ? '#B45309' : userStats.level < 6 ? (isDark ? '#E2E8F0' : "#94A3B8") : '#F59E0B'} />
            </View>
          </View>

          {/* Filters Bar */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 10, zIndex: 10 }}>
            {/* Time Filter */}
            <TouchableOpacity 
              style={[styles.dropdownPill, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}
              onPress={() => { triggerHaptic(); setShowTimeModal(true); }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                {TIME_FILTERS.find(f => f.key === timeFilter)?.label}
              </Text>
              <ChevronDown size={14} color={MUTED} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* Category Filter */}
            <TouchableOpacity 
              style={[styles.dropdownPill, { backgroundColor: catFilter !== 'all' ? colors.primaryGlow : CARD_BG, borderColor: catFilter !== 'all' ? colors.primary : CARD_BORDER }]}
              onPress={() => { triggerHaptic(); setShowCatModal(true); }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: catFilter !== 'all' ? colors.primary : colors.text }} numberOfLines={1}>
                {CATEGORY_FILTERS.find(f => f.key === catFilter)?.label}
              </Text>
              <ChevronDown size={14} color={catFilter !== 'all' ? colors.primary : MUTED} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Season Countdown */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowRewards(true)} style={[styles.seasonBanner, { backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : colors.primaryGlow, borderColor: colors.primary }]}>
            <Text style={[styles.seasonText, { color: isDark ? '#4ADE80' : colors.primary }]}>🔥 {t('seasonEndsSoon', { defaultValue: 'Civic Season 2 ends in' })} {timeRemaining}</Text>
            <Text style={[styles.seasonSub, { color: MUTED }]}>{t('seasonPrize', { defaultValue: 'Tap to see the physical rewards!' })}</Text>
          </TouchableOpacity>

          {/* Podium (Now applies to both Global and Local) */}
          {renderPodium()}

          {/* Faction Wars & Nemesis System */}
          {activeTab === 'Local' ? (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => { triggerHaptic(); setShowNemesisModal(true); }}
              style={[styles.challengeBanner, {
              backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
              borderColor: '#EF4444',
              borderWidth: 2,
            }]}>
              <View style={[styles.challengeIconBox, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                <Flame size={20} color="#EF4444" />
              </View>
              <View style={[styles.challengeInfo, { flex: 1, paddingRight: 12 }]}>
                <Text style={[styles.challengeTitle, { color: colors.text, textAlign: 'left' }]}>
                  {language === 'ur' ? 'آپ کا حریف (نیمیسس)' : language === 'sd' ? 'توهان جو حریف' : 'Your Nemesis Tracker'}
                </Text>
                <Text style={[styles.challengeDesc, { color: MUTED, textAlign: 'left' }]}>
                  {language === 'ur' ? `${localRivalRaw?.name} کو پیچھے چھوڑنے کے لیے ${toUrduNumerals(Math.max(1, rivalPtsDiff))} XP مزید درکار ہیں!` : language === 'sd' ? `${localRivalRaw?.name} کان اڳتي وڌڻ لاءِ ${toUrduNumerals(Math.max(1, rivalPtsDiff))} XP وڌيڪ گهربل آهن!` : `You need ${toUrduNumerals(Math.max(1, rivalPtsDiff))} more XP to beat ${localRivalRaw?.name}!`}
                </Text>
              </View>
              <Text style={[styles.challengeTrend, { color: '#EF4444', fontSize: 12, fontWeight: '800' }]}>Vs.</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => { triggerHaptic(); setShowFactionModal(true); }}
              style={[styles.challengeBanner, {
              backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF',
              borderColor: '#3B82F6',
              borderWidth: 2,
              flexDirection: 'column',
              alignItems: 'stretch',
              paddingVertical: 14,
              gap: 12
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.challengeIconBox, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
                  <Shield size={20} color="#3B82F6" />
                </View>
                <View style={[styles.challengeInfo, { flex: 1 }]}>
                  <Text style={[styles.challengeTitle, { color: colors.text, textAlign: 'left' }]}>
                    {language === 'ur' ? `علاقائی جنگ: ایسٹ کراچی بمقابلہ ویسٹ کراچی` : language === 'sd' ? `علائقائي جنگ: ايسٽ ڪراچي بمقابلا ويسٽ ڪراچي` : `Faction Wars: East Karachi vs West Karachi`}
                  </Text>
                  <Text style={[styles.challengeDesc, { color: MUTED, textAlign: 'left' }]}>
                    {language === 'ur' ? `${isEastLeading ? 'ایسٹ کراچی' : 'ویسٹ کراچی'} فی الحال آگے ہے!` : language === 'sd' ? `${isEastLeading ? 'ايسٽ ڪراچي' : 'ويسٽ ڪراچي'} في الحال اڳتي آهي!` : `${isEastLeading ? 'East Karachi' : 'West Karachi'} is currently leading!`}
                  </Text>
                </View>
              </View>
              
              {/* Tug of War Visual (Sleek Bar Design) */}
              <View style={{ width: '100%', marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#3B82F6' }}>{language === 'ur' ? 'ایسٹ کراچی' : language === 'sd' ? 'ايسٽ ڪراچي' : 'East Karachi'} ({toUrduNumerals(eastScore)}%)</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>{language === 'ur' ? 'ویسٹ کراچی' : language === 'sd' ? 'ويسٽ ڪراچي' : 'West Karachi'} ({toUrduNumerals(100 - eastScore)}%)</Text>
                </View>
                {/* Sleek Dual-Color Bar */}
                <View style={{ width: '100%', position: 'relative', paddingVertical: 2 }}>
                  {/* Main Track */}
                  <View style={{ width: '100%', height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', zIndex: 1 }}>
                    <View style={{ flex: eastScore, height: '100%', backgroundColor: '#3B82F6' }} />
                    <View style={{ width: 4, height: '100%', backgroundColor: 'transparent' }} />
                    <View style={{ flex: 100 - eastScore, height: '100%', backgroundColor: '#EF4444' }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Rank list */}
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <TrendingUp size={16} color={colors.primary} />
              <Text style={[styles.listTitle, { color: colors.text }]}>{t('topContributors')}</Text>
            </View>

            {leaders.map((item) => {
              const isMe = item.id === 'you';
              const medal = MEDAL[item.rank];
              const medalColor = medal?.color;
              const initials = item.name.split(' ').map(n => n[0]).join('');

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedUser(item)}
                  style={[
                    styles.rankRow,
                    {
                      backgroundColor: isMe
                        ? (isDark ? 'rgba(34,197,94,0.08)' : 'rgba(11,94,43,0.06)')
                        : CARD_BG,
                      borderColor: isMe ? colors.primary : CARD_BORDER,
                    },
                  ]}
                >
                  {/* Rank pill */}
                  <View style={[styles.rankPill, {
                    backgroundColor: medalColor
                      ? medalColor + '22'
                      : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(11,59,36,0.07)'),
                  }]}>
                    <Text style={[styles.rankNum, { color: medalColor ?? MUTED }]}>
                      #{toUrduNumerals(item.rank)}
                    </Text>
                  </View>

                  {/* Avatar */}
                  <View style={[styles.rankAvatar, { backgroundColor: isMe ? colors.primaryGlow : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(11,59,36,0.07)') }]}>
                    {isMe && user?.profileImage ? (
                      <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                    ) : (
                      <Text style={[styles.rankAvatarText, { color: isMe ? colors.primary : MUTED }]}>
                        {initials}
                      </Text>
                    )}
                  </View>

                  <View style={styles.rankMeta}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.rankName, { color: isMe ? colors.primary : colors.text }]}>
                        {item.name}
                      </Text>
                      {/* Streak Indicator for active users */}
                      {parseInt(item.rank) % 3 === 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6 }}>
                          <Flame size={10} color="#F59E0B" />
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#F59E0B', marginLeft: 2 }}>{toUrduNumerals(item.rank * 2)}</Text>
                        </View>
                      )}
                      {/* Random Trend Indicator for Demo */}
                      {parseInt(item.rank) % 2 === 0 ? (
                        <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>▲ {toUrduNumerals('2')}</Text>
                      ) : parseInt(item.rank) > 3 ? (
                        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>▼ {toUrduNumerals('1')}</Text>
                      ) : null}
                    </View>
                    <View style={styles.areaRow}>
                      <MapPin size={11} color={MUTED} />
                      <Text style={[styles.areaText, { color: MUTED }]}>{t(item.area)}</Text>
                    </View>
                  </View>

                  <View style={styles.scoreBlock}>
                    <Text style={[styles.scoreVal, { color: colors.primary }]}>{toUrduNumerals(item.points)}</Text>
                    <Text style={[styles.scoreUnit, { color: MUTED }]}>XP</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Sticky You Bar */}
        {myRankObj && (
          <View style={[styles.stickyYouBar, { 
            backgroundColor: isDark ? '#121212' : '#FFFFFF', 
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            shadowColor: colors.primary, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 15 
          }]}>
            <Text style={[{ color: colors.primary, minWidth: 56, textAlign: 'center', fontSize: 20, fontWeight: '900' }]}>#{toUrduNumerals(myRankObj.rank)}</Text>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>{language === 'ur' ? 'آپ' : language === 'sd' ? 'توهان' : 'You'}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: MUTED, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{toUrduNumerals(myRankObj.points)} XP • {t(myRankObj.area)}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedUser(myRankObj)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryGlow, justifyContent: 'center', alignItems: 'center' }}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 22 }} />
              ) : (
                <User size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* User Profile Modal */}
        <Modal visible={!!selectedUser} transparent animationType="fade" onRequestClose={() => setSelectedUser(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              
              <View style={[styles.podiumRing, { borderColor: colors.primary, marginBottom: 12 }]}>
                <View style={[styles.podiumAvatar, { backgroundColor: colors.primaryGlow }]}>
                  {selectedUser?.id === 'you' && user?.profileImage ? (
                    <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 99 }} />
                  ) : (
                    <Text style={[styles.podiumInitials, { color: colors.primary }]}>
                      {selectedUser?.name.split(' ').map(n => n[0] || '').join('')}
                    </Text>
                  )}
                </View>
              </View>
              
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedUser?.name}</Text>
              <Text style={[styles.modalSub, { color: MUTED, marginBottom: 20 }]}>{t(selectedUser?.area || localArea)} • {toUrduNumerals(selectedUser?.points || '0')} XP</Text>
              
              <Text style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: '800', color: MUTED, textTransform: 'uppercase', marginBottom: 12 }}>{language === 'ur' ? 'کارکردگی کی جھلکیاں' : 'Performance Highlights'}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <TrendingUp size={24} color={colors.primary} style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>#{toUrduNumerals(selectedUser?.rank || '1')}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textAlign: 'center' }}>{language === 'ur' ? 'موجودہ رینک' : 'Current Rank'}</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: CARD_BORDER }}>
                  <Award size={24} color="#F59E0B" style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{language === 'ur' ? 'ٹاپ' : 'Top'} {toUrduNumerals('5')}%</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textAlign: 'center' }}>{language === 'ur' ? 'اپنے علاقے میں' : 'In Local Area'}</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <MapPin size={24} color="#3B82F6" style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                    {toUrduNumerals(String(selectedUser?.issuesReported ?? 0))}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textAlign: 'center' }}>{language === 'ur' ? 'مسائل رپورٹ کیے' : 'Issues Reported'}</Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setSelectedUser(null)}>
                <Text style={styles.doneBtnText}>{language === 'ur' ? 'بند کریں' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Season Rewards Modal */}
        <Modal visible={showRewards} transparent animationType="slide" onRequestClose={() => setShowRewards(false)}>
          <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}>
            <View style={[{ width: '100%', padding: 32, paddingBottom: 40, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.background }]}>
              <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginBottom: 24 }} />
              
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(245, 158, 11, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <Crown size={32} color="#F59E0B" />
                </View>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 6 }}>{language === 'ur' ? 'سیزن ۲ کے انعامات' : language === 'sd' ? 'سيزن ۲ جا انعام' : 'Season 2 Rewards'}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B' }}>{timeRemaining} {language === 'ur' ? 'باقی ہیں' : language === 'sd' ? 'باقي آهن' : 'remaining'}</Text>
                
                <Text style={{ fontSize: 14, fontWeight: '600', color: MUTED, textAlign: 'center', marginTop: 12, paddingHorizontal: 16, lineHeight: 22 }}>
                  {language === 'ur' ? 'مسائل رپورٹ کریں اور لیڈر بورڈ میں اوپر آئیں! سیزن کے اختتام پر گلوبل رینکنگ میں ٹاپ ۳ شہریوں کو شاندار انعامات دیے جائیں گے۔' : language === 'sd' ? 'مسئلا رپورٽ ڪريو ۽ ليڊر بورڊ ۾ مٿي اچو! سيزن جي آخر ۾ گلوبل رينڪنگ ۾ ٽاپ ۳ شهرين کي شاندار انعام ڏنا ويندا.' : 'Report issues and stay active to climb the leaderboard! Top 3 citizens in the Global rankings at the end of the season will receive physical rewards.'}
                </Text>
              </View>
              
              <View style={{ gap: 12, marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: CARD_BG, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F59E0B55' }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245, 158, 11, 0.2)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24 }}>🥇</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{language === 'ur' ? 'پہلا انعام' : language === 'sd' ? 'پهريون انعام' : '1st Place'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B', marginTop: 2 }}>{language === 'ur' ? `دراز واؤچر ${toUrduNumerals('5000')} روپے` : language === 'sd' ? `دراز واؤچر ${toUrduNumerals('5000')} روپيا` : 'Rs. 5,000 Daraz Voucher'}</Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: CARD_BG, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24 }}>🥈</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{language === 'ur' ? 'دوسرا انعام' : language === 'sd' ? 'ٻيو انعام' : '2nd Place'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: MUTED, marginTop: 2 }}>{language === 'ur' ? `فوڈ پانڈا واؤچر ${toUrduNumerals('3000')} روپے` : language === 'sd' ? `فوڊ پانڊا واؤچر ${toUrduNumerals('3000')} روپيا` : 'Rs. 3,000 Foodpanda Voucher'}</Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: CARD_BG, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(217, 119, 6, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24 }}>🥉</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{language === 'ur' ? 'تیسرا انعام' : language === 'sd' ? 'ٽيون انعام' : '3rd Place'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#D97706', marginTop: 2 }}>{language === 'ur' ? `موبائل بیلنس ${toUrduNumerals('1000')} روپے` : language === 'sd' ? `موبائل بيلنس ${toUrduNumerals('1000')} روپيا` : 'Rs. 1,000 Mobile Top-up'}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowRewards(false)}>
                <Text style={[styles.doneBtnText, { color: '#ffffff' }]}>{language === 'ur' ? 'سمجھ گیا' : language === 'sd' ? 'سمجھي ويس' : 'Got it'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Time Filter Modal */}
        <Modal visible={showTimeModal} transparent animationType="fade" onRequestClose={() => setShowTimeModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTimeModal(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.bottomSheetCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 32 }} />
                <Text style={[styles.bottomSheetTitle, { color: colors.text, marginBottom: 0 }]}>{language === 'ur' ? 'وقت منتخب کریں' : language === 'sd' ? 'وقت چونڊيو' : 'Select Timeframe'}</Text>
                <TouchableOpacity onPress={() => setShowTimeModal(false)} style={{ padding: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 20 }}>
                  <X size={20} color={MUTED} />
                </TouchableOpacity>
              </View>
              {TIME_FILTERS.map(f => (
                <TouchableOpacity key={f.key} style={[styles.sheetOption, timeFilter === f.key && { backgroundColor: colors.primaryGlow }]} onPress={() => { triggerHaptic(); setTimeFilter(f.key); setShowTimeModal(false); }}>
                  <Text style={[styles.sheetOptionText, { color: timeFilter === f.key ? colors.primary : colors.text, fontWeight: timeFilter === f.key ? '800' : '600' }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Category Filter Modal */}
        <Modal visible={showCatModal} transparent animationType="fade" onRequestClose={() => setShowCatModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCatModal(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.bottomSheetCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 32 }} />
                <Text style={[styles.bottomSheetTitle, { color: colors.text, marginBottom: 0 }]}>{language === 'ur' ? 'زمرہ منتخب کریں' : language === 'sd' ? 'ڪيٽيگري چونڊيو' : 'Select Category'}</Text>
                <TouchableOpacity onPress={() => setShowCatModal(false)} style={{ padding: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 20 }}>
                  <X size={20} color={MUTED} />
                </TouchableOpacity>
              </View>
              {CATEGORY_FILTERS.map(f => (
                <TouchableOpacity key={f.key} style={[styles.sheetOption, catFilter === f.key && { backgroundColor: colors.primaryGlow }]} onPress={() => { triggerHaptic(); setCatFilter(f.key); setShowCatModal(false); }}>
                  <Text style={[styles.sheetOptionText, { color: catFilter === f.key ? colors.primary : colors.text, fontWeight: catFilter === f.key ? '800' : '600' }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Nemesis Modal */}
        <Modal visible={showNemesisModal} transparent animationType="fade" onRequestClose={() => setShowNemesisModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Flame size={32} color="#EF4444" />
              </View>
              
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'ur' ? 'حریف (نیمیسس) ٹریکر' : language === 'sd' ? 'حريف ٽريڪر' : 'Nemesis Tracker'}
              </Text>
              
              <Text style={[styles.modalSub, { color: MUTED, marginBottom: 24, paddingHorizontal: 10, lineHeight: 22 }]}>
                {language === 'ur' ? `آپ اور ${localRivalRaw?.name} کے درمیان سخت مقابلہ ہے! انہیں پیچھے چھوڑنے کے لیے آپ کو مزید ${toUrduNumerals(Math.max(1, rivalPtsDiff))} XP درکار ہیں۔ مسائل رپورٹ کریں اور لیڈر بورڈ میں اپنی جگہ پکی کریں!` : language === 'sd' ? `توهان ۽ ${localRivalRaw?.name} جي وچ ۾ سخت مقابلو آهي! انهن کي پوئتي ڇڏڻ لاءِ توهان کي ${toUrduNumerals(Math.max(1, rivalPtsDiff))} XP وڌيڪ گهربل آهن. مسئلا رپورٽ ڪريو ۽ پنهنجي جاءِ پڪي ڪريو!` : `It's a tight race between you and ${localRivalRaw?.name}! You need ${toUrduNumerals(Math.max(1, rivalPtsDiff))} more XP to overtake them and climb the ranks. Keep reporting issues to secure your spot!`}
              </Text>

              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: '#EF4444' }]} onPress={() => setShowNemesisModal(false)}>
                <Text style={[styles.doneBtnText, { color: '#ffffff' }]}>{language === 'ur' ? 'مقابلہ جاری رکھیں' : language === 'sd' ? 'مقابلو جاري رکو' : 'Keep Competing'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Faction Wars Modal */}
        <Modal visible={showFactionModal} transparent animationType="fade" onRequestClose={() => setShowFactionModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: CARD_BORDER }]}>
              
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Shield size={32} color="#3B82F6" />
              </View>
              
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'ur' ? 'علاقائی جنگ: ایسٹ بمقابلہ ویسٹ' : language === 'sd' ? 'علائقائي جنگ: ايسٽ بمقابلا ويسٽ' : 'Faction Wars: East vs West'}
              </Text>
              
              <Text style={[styles.modalSub, { color: MUTED, marginBottom: 20, paddingHorizontal: 10, lineHeight: 22 }]}>
                {language === 'ur' ? `شہر دو حصوں میں بٹ چکا ہے! مسائل رپورٹ کر کے اپنے علاقے کو پوائنٹس دلائیں۔ ${isEastLeading ? 'ایسٹ کراچی' : 'ویسٹ کراچی'} فی الحال ${toUrduNumerals(isEastLeading ? eastScore : 100 - eastScore)}% کے ساتھ آگے ہے۔` : language === 'sd' ? `شهر ٻن حصن ۾ ورهائجي چڪو آهي! مسئلا رپورٽ ڪري پنهنجي علائقي کي پوائنٽس ڏياريو. ${isEastLeading ? 'ايسٽ ڪراچي' : 'ويسٽ ڪراچي'} في الحال ${toUrduNumerals(isEastLeading ? eastScore : 100 - eastScore)}% سان اڳتي آهي.` : `The city is divided! Report issues to earn points for your faction. ${isEastLeading ? 'East Karachi' : 'West Karachi'} is currently dominating with ${toUrduNumerals(isEastLeading ? eastScore : 100 - eastScore)}% of the total score.`}
              </Text>

              {/* Progress Bar inside Modal */}
              <View style={{ width: '100%', marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#3B82F6' }}>{language === 'ur' ? 'ایسٹ کراچی' : language === 'sd' ? 'ايسٽ ڪراچي' : 'East Karachi'} ({toUrduNumerals(eastScore)}%)</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>{language === 'ur' ? 'ویسٹ کراچی' : language === 'sd' ? 'ويسٽ ڪراچي' : 'West Karachi'} ({toUrduNumerals(100 - eastScore)}%)</Text>
                </View>
                <View style={{ width: '100%', position: 'relative', paddingVertical: 4 }}>
                  {/* Main Track */}
                  <View style={{ width: '100%', height: 14, borderRadius: 7, overflow: 'hidden', flexDirection: 'row', zIndex: 1 }}>
                    <View style={{ flex: eastScore, height: '100%', backgroundColor: '#3B82F6' }} />
                    <View style={{ width: 4, height: '100%', backgroundColor: 'transparent' }} />
                    <View style={{ flex: 100 - eastScore, height: '100%', backgroundColor: '#EF4444' }} />
                  </View>
                </View>
              </View>

              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: '#3B82F6' }]} onPress={() => setShowFactionModal(false)}>
                <Text style={[styles.doneBtnText, { color: '#ffffff' }]}>{language === 'ur' ? 'بند کریں' : language === 'sd' ? 'بند ڪريو' : 'Close'}</Text>
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
  safeArea:  { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  screenLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  pageTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  trophyChip: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 4,
    borderRadius: 14, padding: 4, borderWidth: 1,
  },
  tabPill: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabText: { fontSize: 13, fontWeight: '800' },

  scrollContent: { paddingBottom: 110 },

  /* Podium */
  podiumOuter: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    paddingTop: 16, paddingBottom: 12, gap: 12,
  },
  podiumSpot: { alignItems: 'center', width: width * 0.28 },
  podiumSpotFirst: { marginBottom: 24 },
  crown: { marginBottom: 4 },
  podiumRing: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2.5, padding: 4, justifyContent: 'center', alignItems: 'center',
  },
  podiumAvatar: {
    flex: 1, width: '100%', borderRadius: 99,
    justifyContent: 'center', alignItems: 'center',
  },
  podiumInitials: { fontSize: 20, fontWeight: '900' },
  podiumRankPill: {
    marginTop: 6, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, alignItems: 'center',
  },
  podiumRankText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  podiumName: { fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 5 },
  podiumPts:  { fontSize: 11, fontWeight: '700', marginTop: 1 },
  podiumLabel:{ fontSize: 10, fontWeight: '600', marginTop: 1 },

  /* Challenge banner */
  challengeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 14,
  },
  challengeIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  challengeInfo: { flex: 1 },
  challengeTitle: { fontSize: 14, fontWeight: '800' },
  challengeDesc: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  challengeTrend: { fontSize: 14, fontWeight: '900' },

  /* List */
  listSection: { paddingHorizontal: 16 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  listTitle: { fontSize: 15, fontWeight: '900' },

  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  /* New Leaderboard Features */
  dropdownPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  bottomSheetCard: { width: '100%', padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, position: 'absolute', bottom: 0 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  sheetOption: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8 },
  sheetOptionText: { fontSize: 16, textAlign: 'center' },
  seasonBanner: { marginHorizontal: 16, marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  seasonText: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  seasonSub: { fontSize: 12, fontWeight: '600' },

  rankPill: {
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 10, alignItems: 'center', minWidth: 36,
  },
  rankNum: { fontSize: 12, fontWeight: '900' },
  rankAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rankAvatarText: { fontSize: 13, fontWeight: '900' },
  rankMeta: { flex: 1 },
  rankName: { fontSize: 14, fontWeight: '800' },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  areaText: { fontSize: 12, fontWeight: '600' },
  scoreBlock: { alignItems: 'flex-end' },
  scoreVal: { fontSize: 16, fontWeight: '900' },
  scoreUnit: { fontSize: 10, fontWeight: '700', marginTop: -1 },

  stickyYouBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
    borderWidth: 1, borderRadius: 26,
    position: 'absolute', bottom: 20, left: 20, right: 20,
  },

  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', padding: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  doneBtn: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export default TopShehriScreen;
