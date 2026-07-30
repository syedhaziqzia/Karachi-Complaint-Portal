import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useAuth } from './AuthContext';
import NotificationService from '../services/NotificationService';
import { registerMultiLangSetter } from './LanguageContext';
import { registerReconnectListener } from './NetworkContext';
import { safeParseJSON, sanitizeText } from '../utils/validation';

// ─── Hardening constants ───────────────────────────────────────────────────
const MAX_ACTIVE_DATES = 400; // Cap activeDates array to prevent unbounded growth
const MAX_LOCATION_HISTORY = 500; // Cap locationHistory array
const MAX_DESCRIPTION_LEN = 1000;
const MAX_LOCATION_LEN = 200;
const MAX_BUG_REPORT_LEN = 2000;

/**
 * Generates a collision-resistant device ID.
 * Uses multiple Math.random() rounds plus a timestamp prefix for ~28 chars of entropy.
 */
const generateDeviceId = () => {
  const ts = Date.now().toString(36);
  const r1 = Math.random().toString(36).substring(2);
  const r2 = Math.random().toString(36).substring(2);
  const r3 = Math.random().toString(36).substring(2);
  return `${ts}-${r1}${r2}${r3}`.substring(0, 40);
};

const AppContext = createContext(undefined);

const STREAK_POINTS = [25, 50, 75, 100, 125, 150, 200]; // Day 1-7

export const CATEGORY_DETAILS = {
  'Waste': [
    'A huge pile of uncollected garbage is rotting here. The smell is unbearable and it is attracting stray animals.',
    'Trash bins have overflowed and now the waste is spilling onto the main road, making it hard to walk.',
    'Someone has dumped construction debris along with household waste right on the corner of the street.',
    'Garbage has been burning here since morning, creating thick toxic smoke that makes it hard to breathe.',
    'Plastic bags and household waste are blocking the drainage path, causing water to pool around it.',
    'Market waste, mostly rotting vegetables and plastic packaging, has been left unattended for days.',
    'A large accumulation of solid waste near the residential area is becoming a serious health hazard.',
    'People are throwing trash in this empty plot instead of designated bins, and it is piling up rapidly.',
    'Medical or industrial waste has been dangerously mixed with regular garbage and dumped on the sidewalk.',
    'Scattered garbage across the park area is ruining the public space and needs immediate cleanup.'
  ],
  'Broken Roads': [
    'Deep potholes have formed across the entire width of the road, causing severe damage to passing vehicles.',
    'The road surface has completely eroded away after the recent rains, leaving a dangerous dirt track.',
    'An open, deep trench was left after some pipeline work and has not been filled or paved back properly.',
    'The asphalt has caved in at the center of the road, creating a massive sinkhole that causes huge traffic jams.',
    'A missing manhole cover on this busy street is extremely dangerous for bikers, especially at night.',
    'The lane divider is broken and scattered across the road, creating a hazard for high-speed traffic.',
    'Uneven patching and bumpy surfaces make it almost impossible to drive smoothly, causing daily delays.',
    'The service road is completely destroyed with large cracks and loose gravel everywhere.',
    'Continuous water leakage has damaged the road structure, causing the upper layer to peel off completely.',
    'A large section of the pavement has collapsed near the intersection, forcing cars into the oncoming lane.'
  ],
  'Sewerage': [
    'Filthy sewage water is overflowing from a choked gutter line and spreading all over the main street.',
    'A ruptured underground sewerage pipe has caused dirty water to pool around the roundabout, creating a horrible stench.',
    'Gutter water is mixing with the clean water supply pipeline nearby, posing a massive health risk to residents.',
    'An open, overflowing manhole is continuously gushing out sewage water onto the pedestrian walkway.',
    'The main drain is completely choked with plastic bags and solid waste, causing water to back up into the streets.',
    'Stagnant sewage water has been sitting here for days, becoming a breeding ground for mosquitoes and diseases.',
    'Sewage water is flowing freely onto the highway, making the road slippery and causing a severe traffic bottleneck.',
    'A blocked sewerage line is causing filthy water to enter the ground floors of nearby homes and shops.',
    'The drainage system has collapsed, and black, foul-smelling water is flooded across the entire residential block.',
    'Heavy rain has worsened the sewerage issue, with drains overflowing and waste floating on the main road.'
  ],
  'Kunda': [
    'A massive, tangled mesh of illegal Kunda wires is hanging dangerously low over the street, posing an electrocution threat.',
    'Multiple illegal hook connections are clearly visible on the main PMT pole, causing severe voltage fluctuations.',
    'Open, live wires from illegal connections are crossing right in front of residential balconies, which is extremely dangerous.',
    'Local shops are running heavy equipment on direct illegal Kunda lines, stealing electricity and tripping the local transformer.',
    'A dangerous network of unauthorized power lines has been set up, causing frequent sparking during the evenings.',
    'Illegal wires have been tied directly to metal grilles and street light poles, creating a fatal shock hazard.',
    'Heavy wire tapping on the main supply line is causing daily power outages and low voltage in the neighborhood.',
    'Tangled wires from illegal connections are almost touching the ground, putting playing children at severe risk.',
    'A huge cluster of illegal connections is putting so much load on the transformer that it overheats and sparks constantly.',
    'Unregulated, exposed wiring for illegal electricity usage is spanning across the alleyway, ready to snap at any moment.'
  ],
  'Encroachment': [
    'Local shopkeepers have extended their stalls right onto the pedestrian footpath, forcing people to walk on the busy road.',
    'A restaurant has illegally placed tables and chairs on the street, blocking almost an entire lane of traffic.',
    'Pathirana shops and temporary food stalls have completely taken over the sidewalk, leaving no room for pedestrians.',
    'Cars are being parked illegally on the footpath by a private valet service, blocking public access completely.',
    'A huge pile of construction materials (sand, bricks) has been dumped on the road, encroaching on public space.',
    'Hawkers and street vendors have blocked the main entrance of the market entirely, causing massive congestion.',
    'Private security guards have placed illegal barriers and cones on the public street to reserve parking.',
    'An illegal permanent structure is being built over the public drain, which will cause flooding during rains.',
    'Commercial goods and large crates are being stored on the service road, severely restricting vehicle movement.',
    'The entire service lane has been taken over by illegal pushcarts and vendors, disrupting the flow of traffic.'
  ]
};


const INITIAL_USER_STATS = {
  level: 1,
  rank: 'New Citizen',
  xp: 0,
  nextLevelXp: 500,
  totalComplaints: 0,
  cityCredits: 0,
  verifiedCreditsEarned: 0,
  trustScore: 0,
  trustTier: 'Evaluating',
  impactScore: 100,
  impactTier: 'Newcomer',
};

const INITIAL_REWARDS = [
  // ─── FOOD (10) ─── Bronze to Gold tier
  { id: 'f1', partner: 'Chai Wala', discount: 'Free Chai & Paratha', cost: 800, type: 'Food' },
  { id: 'f2', partner: 'Biryani Center', discount: 'Free Single Plate', cost: 1500, type: 'Food' },
  { id: 'f3', partner: 'Foodpanda', discount: 'Rs. 200 Off', cost: 2500, type: 'Food' },
  { id: 'f7', partner: 'Hardee\'s', discount: 'Free Combo Meal', cost: 3000, type: 'Food' },
  { id: 'f4', partner: 'KFC', discount: 'Free Zinger Burger', cost: 3500, type: 'Food' },
  { id: 'f5', partner: 'McDonald\'s', discount: 'Free Value Meal', cost: 4000, type: 'Food' },
  { id: 'f8', partner: 'Pizza Hut', discount: 'Buy 1 Get 1 Pizza', cost: 4500, type: 'Food' },
  { id: 'f6', partner: 'Dominos', discount: 'Buy 1 Get 1 Free', cost: 5500, type: 'Food' },
  { id: 'f9', partner: 'Student Biryani', discount: 'Family Pack', cost: 6000, type: 'Food' },
  { id: 'f10', partner: 'Kababjees', discount: 'Rs. 500 Dinner Voucher', cost: 7500, type: 'Food' },

  // ─── TRANSPORT (9) ─── Bronze to Gold tier
  { id: 't1', partner: 'InDrive', discount: 'Rs. 50 Off', cost: 600, type: 'Transport' },
  { id: 't2', partner: 'Bykea', discount: 'Rs. 100 Off', cost: 1200, type: 'Transport' },
  { id: 't3', partner: 'Yango', discount: 'Rs. 100 Off 3 Rides', cost: 2000, type: 'Transport' },
  { id: 't4', partner: 'Careem', discount: '15% Off', cost: 2500, type: 'Transport' },
  { id: 't7', partner: 'Uber', discount: '5 Rides 20% Off', cost: 3500, type: 'Transport' },
  { id: 't8', partner: 'Airlift', discount: 'Free Weekly Pass', cost: 4500, type: 'Transport' },
  { id: 't5', partner: 'PSO', discount: 'Rs. 500 Fuel', cost: 5000, type: 'Transport' },
  { id: 't9', partner: 'Swvl', discount: '10 Free Rides', cost: 7000, type: 'Transport' },
  { id: 't6', partner: 'Careem', discount: 'Free 3 Month Pass', cost: 10000, type: 'Transport' },

  // ─── UTILITY (8) ─── Silver to Gold tier
  { id: 'u6', partner: 'Telenor', discount: 'Rs. 300 Balance', cost: 2000, type: 'Utility' },
  { id: 'u1', partner: 'Nayatel', discount: 'Free 10GB Addon', cost: 1800, type: 'Utility' },
  { id: 'u2', partner: 'StormFiber', discount: 'Free Month Upgrade', cost: 2500, type: 'Utility' },
  { id: 'u7', partner: 'Jazz', discount: 'Free 20GB Data', cost: 2500, type: 'Utility' },
  { id: 'u8', partner: 'Zong', discount: 'Monthly Data Package', cost: 3000, type: 'Utility' },
  { id: 'u3', partner: 'Daraz', discount: 'Rs. 500 Wallet Credit', cost: 4000, type: 'Utility' },
  { id: 'u4', partner: 'K-Electric', discount: '5% Bill Rebate', cost: 8000, type: 'Utility' },
  { id: 'u5', partner: 'PTCL', discount: 'Rs. 500 Bill Discount', cost: 9000, type: 'Utility' },

  // ─── SHOPPING (9) ─── Silver to Platinum tier
  { id: 'sh1', partner: 'Bin Hashim', discount: 'Free Home Delivery', cost: 1200, type: 'Shopping' },
  { id: 'sh2', partner: 'Naheed', discount: 'Rs. 300 Off Grocery', cost: 4500, type: 'Shopping' },
  { id: 'sh7', partner: 'Al-Fatah', discount: 'Rs. 500 Grocery Voucher', cost: 5000, type: 'Shopping' },
  { id: 'sh8', partner: 'Bata', discount: 'Rs. 500 Off Shoes', cost: 6000, type: 'Shopping' },
  { id: 'sh3', partner: 'Imtiaz Super Market', discount: 'Rs. 500 Voucher', cost: 8000, type: 'Shopping' },
  { id: 'sh5', partner: 'J.', discount: 'Rs. 500 Voucher', cost: 9000, type: 'Shopping' },
  { id: 'sh6', partner: 'Khaadi', discount: 'Rs. 1000 Gift Card', cost: 12000, type: 'Shopping' },
  { id: 'sh4', partner: 'Chase Up', discount: 'Rs. 1000 Voucher', cost: 14000, type: 'Shopping' },
  { id: 'sh9', partner: 'Sapphire', discount: 'Rs. 1000 Voucher', cost: 15000, type: 'Shopping' },
  { id: 'sh10', partner: 'Metro Cash & Carry', discount: 'Rs. 1500 Voucher', cost: 18000, type: 'Shopping' },
  { id: 'sh11', partner: 'Daraz', discount: 'Rs. 2500 Voucher', cost: 25000, type: 'Shopping' },

  // ─── ENTERTAINMENT (5) ─── NEW CATEGORY: Silver to Gold tier
  { id: 'en1', partner: 'Arena Gaming', discount: '1 Hour Free Gaming', cost: 2000, type: 'Entertainment' },
  { id: 'en2', partner: 'Cinepax', discount: '2 Movie Tickets', cost: 3000, type: 'Entertainment' },
  { id: 'en3', partner: 'Escape Room Karachi', discount: '1 Free Game', cost: 3500, type: 'Entertainment' },
  { id: 'en4', partner: 'Fun City', discount: 'Unlimited Rides Pass', cost: 5000, type: 'Entertainment' },
  { id: 'en5', partner: 'Port Grand', discount: 'Rs. 500 Food Credit', cost: 6000, type: 'Entertainment' },

  // ─── NEW VOUCHERS (20) ───
  // 60% (12 vouchers) cost between 600-900 points
  { id: 'nv1', partner: 'Baskin Robbins', discount: 'Free Scoop', cost: 600, type: 'Food' },
  { id: 'nv2', partner: 'Optp', discount: 'Buy 1 Get 1 Fries', cost: 650, type: 'Food' },
  { id: 'nv3', partner: 'Airlift', discount: 'Rs. 50 Off', cost: 700, type: 'Transport' },
  { id: 'nv4', partner: 'Swvl', discount: '1 Free Ride', cost: 750, type: 'Transport' },
  { id: 'nv5', partner: 'Jazz', discount: 'Free 5GB Data', cost: 800, type: 'Utility' },
  { id: 'nv6', partner: 'Telenor', discount: 'Rs. 100 Balance', cost: 800, type: 'Utility' },
  { id: 'nv7', partner: 'Imtiaz Super Market', discount: 'Rs. 100 Off', cost: 850, type: 'Shopping' },
  { id: 'nv8', partner: 'Daraz', discount: 'Rs. 200 Off', cost: 850, type: 'Shopping' },
  { id: 'nv9', partner: 'Fun City', discount: '2 Free Tokens', cost: 850, type: 'Entertainment' },
  { id: 'nv10', partner: 'Arena Gaming', discount: '30 Mins Free', cost: 900, type: 'Entertainment' },
  { id: 'nv11', partner: 'KFC', discount: 'Free Drink', cost: 900, type: 'Food' },
  { id: 'nv12', partner: 'Bykea', discount: 'Rs. 200 Off', cost: 900, type: 'Transport' },
  // Remaining 40% (8 vouchers) cost > 5700 points
  { id: 'nv13', partner: 'Sapphire', discount: 'Rs. 500 Off', cost: 6000, type: 'Shopping' },
  { id: 'nv14', partner: 'Khaadi', discount: 'Rs. 500 Off', cost: 6500, type: 'Shopping' },
  { id: 'nv15', partner: 'K-Electric', discount: '10% Rebate', cost: 7500, type: 'Utility' },
  { id: 'nv16', partner: 'PTCL', discount: 'Rs. 1000 Bill Discount', cost: 8500, type: 'Utility' },
  { id: 'nv17', partner: 'Cinepax', discount: '3 Movie Tickets', cost: 10000, type: 'Entertainment' },
  { id: 'nv18', partner: 'Uber', discount: 'Free Monthly Pass', cost: 12000, type: 'Transport' },
  { id: 'nv19', partner: 'Student Biryani', discount: 'Party Pack', cost: 15000, type: 'Food' },
  { id: 'nv20', partner: 'Daraz', discount: 'Rs. 1500 Voucher', cost: 20000, type: 'Shopping' },
  // ─── EXTRA REQUESTED VOUCHERS (5) ───
  { id: 'nv21', partner: 'Ginsoy', discount: 'Free Appetizer', cost: 800, type: 'Food' },
  { id: 'nv22', partner: 'Careem', discount: 'Rs. 150 Off', cost: 1000, type: 'Transport' },
  { id: 'nv23', partner: 'Nuplex', discount: '1 Free Ticket', cost: 1200, type: 'Entertainment' },
  { id: 'nv24', partner: 'Zong', discount: 'Free 10GB Data', cost: 1500, type: 'Utility' },
  { id: 'nv25', partner: 'Gul Ahmed', discount: 'Rs. 500 Voucher', cost: 2500, type: 'Shopping' },

  // ─── MASSIVE ADDITION (25) ───
  // Food
  { id: 'f_new1', partner: 'California Pizza', discount: 'Rs. 300 Off', cost: 1000, type: 'Food' },
  { id: 'f_new2', partner: 'Nando\'s', discount: 'Free Quarter Chicken', cost: 2000, type: 'Food' },
  { id: 'f_new3', partner: 'Burger O\'Clock', discount: 'Free Fries', cost: 800, type: 'Food' },
  { id: 'f_new4', partner: 'Hoagies', discount: '15% Off', cost: 1500, type: 'Food' },
  { id: 'f_new5', partner: 'Chop Chop Wok', discount: 'Rs. 500 Off', cost: 3000, type: 'Food' },
  // Transport
  { id: 't_new1', partner: 'InDrive', discount: 'Rs. 100 Off', cost: 1500, type: 'Transport' },
  { id: 't_new2', partner: 'Yango', discount: '5 Rides 10% Off', cost: 1200, type: 'Transport' },
  { id: 't_new3', partner: 'Careem', discount: '50% Off Next Ride', cost: 2000, type: 'Transport' },
  { id: 't_new4', partner: 'Uber', discount: 'Rs. 300 Off', cost: 1800, type: 'Transport' },
  { id: 't_new5', partner: 'Bykea', discount: '3 Free Deliveries', cost: 2500, type: 'Transport' },
  // Utility
  { id: 'u_new1', partner: 'Jazz', discount: 'Free 500 SMS', cost: 500, type: 'Utility' },
  { id: 'u_new2', partner: 'Zong', discount: '500 Free Mins', cost: 1000, type: 'Utility' },
  { id: 'u_new3', partner: 'Ufone', discount: 'Rs. 200 Balance', cost: 1500, type: 'Utility' },
  { id: 'u_new4', partner: 'PTCL', discount: 'Free Installation', cost: 3000, type: 'Utility' },
  { id: 'u_new5', partner: 'Telenor', discount: 'Weekly Internet', cost: 2000, type: 'Utility' },
  // Shopping
  { id: 's_new1', partner: 'Outfitters', discount: 'Rs. 1000 Off', cost: 3500, type: 'Shopping' },
  { id: 's_new2', partner: 'Ideas by Gul Ahmed', discount: '20% Off', cost: 4000, type: 'Shopping' },
  { id: 's_new3', partner: 'Miniso', discount: 'Rs. 500 Voucher', cost: 2000, type: 'Shopping' },
  { id: 's_new4', partner: 'Imtiaz Super Market', discount: 'Free Delivery', cost: 800, type: 'Shopping' },
  { id: 's_new5', partner: 'Carrefour', discount: 'Rs. 1000 Voucher', cost: 4500, type: 'Shopping' },
  // Entertainment
  { id: 'e_new1', partner: 'Sindbad', discount: 'Rs. 500 Card Balance', cost: 1500, type: 'Entertainment' },
  { id: 'e_new2', partner: 'Bounce', discount: '1 Hour Jump Pass', cost: 2000, type: 'Entertainment' },
  { id: 'e_new3', partner: 'Nuplex', discount: 'Free Large Popcorn', cost: 1000, type: 'Entertainment' },
  { id: 'e_new4', partner: 'Bahria Adventure Land', discount: '1 Free Ticket', cost: 5000, type: 'Entertainment' },
  { id: 'e_new5', partner: 'Winterland', discount: '1 Free Pass', cost: 4000, type: 'Entertainment' },

  // Community Vouchers are now dynamically generated in AppProvider based on localArea.
];
export const AppProvider = ({ children }) => {
  const [complaints, setComplaints] = useState([]);
  const [mapComplaints, setMapComplaints] = useState([]); // Lightweight full list for map pins only
  const [complaintLimit, setComplaintLimit] = useState(20);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMoreComplaints, setHasMoreComplaints] = useState(true);
  const [feedError, setFeedError] = useState(null); // null | 'network' | 'permission' | 'unknown'
  const [userStats, setUserStats] = useState(INITIAL_USER_STATS);
  const [vouchers, setVouchers] = useState([]);
  const [localArea, setLocalArea] = useState('Gulshan-e-Iqbal');
  const [isAnonymous, setIsAnonymousState] = useState(false);
  const [communityContributions, setCommunityContributions] = useState({});
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [hasUsedMultipleLanguages, setHasUsedMultipleLanguages] = useState(false);
  const [globalContributions, setGlobalContributions] = useState({});

  useEffect(() => {
    const subscriber = firestore()
      .collection('global_data')
      .doc('community_goals')
      .onSnapshot(docSnap => {
        if (docSnap && docSnap.exists) {
          setGlobalContributions(docSnap.data() || {});
        }
      }, e => console.warn('Global goals error:', e));
    return () => subscriber();
  }, []);

  // Register the multi-lang setter so LanguageContext can call it
  // without a circular dependency
  useEffect(() => {
    registerMultiLangSetter(setHasUsedMultipleLanguages);
    return () => registerMultiLangSetter(null);
  }, []);

  const rewards = useMemo(() => {
    // Rank areas by socio-economic tiers to tailor community vouchers
    const richAreas = ['DHA', 'Clifton'];
    const poorAreas = ['Lyari', 'Korangi', 'Malir'];

    const isRichArea = richAreas.includes(localArea);
    const isPoorArea = poorAreas.includes(localArea);

    // Filter out any static community rewards just in case
    const baseRewards = INITIAL_REWARDS.filter(r => r.type !== 'Community');

    let communityRewards = [];

    if (isRichArea) {
      // Well-off areas (5 Vouchers) - Focus on beautification, environment, and maintenance
      communityRewards = [
        { id: 'cv_r1', partner: 'Green Crescent Trust', discount: 'Plant 100 Trees in Parks', cost: 1500, type: 'Community', contributed: 450000, goal: 500000 },
        { id: 'cv_r2', partner: 'Alkhidmat', discount: 'Solar Street Lights', cost: 2500, type: 'Community', contributed: 750000, goal: 800000 },
        { id: 'cv_r3', partner: 'Saylani Welfare', discount: 'Beach/Public Space Cleanup', cost: 3000, type: 'Community', contributed: 1200000, goal: 1500000 },
        { id: 'cv_r4', partner: 'JDC', discount: 'Sponsor Road/Pothole Repairs', cost: 4000, type: 'Community', contributed: 2500000, goal: 3000000 },
        { id: 'cv_r5', partner: 'ACF Animal Rescue', discount: 'Animal Rescue & Welfare', cost: 500, type: 'Community', contributed: 950000, goal: 1000000 }
      ];
    } else if (isPoorArea) {
      // Backward/Working-class areas (10 Vouchers) - Focus on critical infrastructure, health, and basic needs
      communityRewards = [
        { id: 'cv_p1', partner: 'JDC', discount: 'Sponsor Water Tankers', cost: 500, type: 'Community', contributed: 10000, goal: 200000 },
        { id: 'cv_p2', partner: 'Alkhidmat', discount: 'Dengue Fumigation Drive', cost: 800, type: 'Community', contributed: 25000, goal: 300000 },
        { id: 'cv_p3', partner: 'Saylani Welfare', discount: 'Install Garbage Bins', cost: 750, type: 'Community', contributed: 15000, goal: 250000 },
        { id: 'cv_p4', partner: 'JDC', discount: 'Fund Sewerage Repairs', cost: 1500, type: 'Community', contributed: 50000, goal: 500000 },
        { id: 'cv_p5', partner: 'Indus Hospital', discount: 'Free Medical Camp & Meds', cost: 1000, type: 'Community', contributed: 80000, goal: 400000 },
        { id: 'cv_p6', partner: 'Edhi Foundation', discount: 'Rs. 100k Charity Fund', cost: 500, type: 'Community', contributed: 400000, goal: 2000000 },
        { id: 'cv_p7', partner: 'TCF', discount: 'Sponsor School Desks & Supplies', cost: 1200, type: 'Community', contributed: 60000, goal: 600000 },
        { id: 'cv_p8', partner: 'Alkhidmat', discount: 'Sponsor Youth Sports Gear', cost: 1000, type: 'Community', contributed: 45000, goal: 500000 },
        { id: 'cv_p9', partner: 'Saylani Welfare', discount: 'Fund Community Center Repair', cost: 2000, type: 'Community', contributed: 120000, goal: 800000 },
        { id: 'cv_p10', partner: 'Saylani Welfare', discount: 'Free IT Training Camp', cost: 1500, type: 'Community', contributed: 90000, goal: 700000 },
        { id: 'cv_p11', partner: 'Local Residents', discount: 'Local Park Cleanup', cost: 600, type: 'Community', contributed: 20000, goal: 50000 },
        { id: 'cv_p12', partner: 'Community Volunteers', discount: 'Street Lights Repair', cost: 800, type: 'Community', contributed: 15000, goal: 100000 },
        { id: 'cv_p13', partner: 'Local Residents', discount: 'Pothole Filling', cost: 1000, type: 'Community', contributed: 40000, goal: 150000 }
      ];
    } else {
      // Middle-class areas (7 Vouchers) - Focus on civic amenities, traffic, and general maintenance
      communityRewards = [
        { id: 'cv_m1', partner: 'TCF', discount: 'Fund Local Library', cost: 1500, type: 'Community', contributed: 200000, goal: 500000 },
        { id: 'cv_m2', partner: 'JDC', discount: 'Sponsor Traffic Mirrors/Signs', cost: 2000, type: 'Community', contributed: 350000, goal: 800000 },
        { id: 'cv_m3', partner: 'Alkhidmat', discount: 'Build Public Restrooms', cost: 2500, type: 'Community', contributed: 400000, goal: 1000000 },
        { id: 'cv_m4', partner: 'JDC', discount: 'Sponsor Street Light Repairs', cost: 1000, type: 'Community', contributed: 150000, goal: 600000 },
        { id: 'cv_m5', partner: 'Edhi Foundation', discount: 'Rs. 50k Charity Fund', cost: 500, type: 'Community', contributed: 800000, goal: 1000000 },
        { id: 'cv_m6', partner: 'Saylani Welfare', discount: 'Sponsor 50 Ration Bags', cost: 3000, type: 'Community', contributed: 600000, goal: 1500000 },
        { id: 'cv_m7', partner: 'Alkhidmat', discount: 'Build a Public Bus Shelter', cost: 1800, type: 'Community', contributed: 250000, goal: 700000 },
        { id: 'cv_m8', partner: 'Local Residents', discount: 'Local Park Cleanup', cost: 600, type: 'Community', contributed: 50000, goal: 100000 },
        { id: 'cv_m9', partner: 'Community Volunteers', discount: 'Street Lights Repair', cost: 800, type: 'Community', contributed: 40000, goal: 200000 },
        { id: 'cv_m10', partner: 'Local Residents', discount: 'Pothole Filling', cost: 1000, type: 'Community', contributed: 60000, goal: 250000 },
        { id: 'cv_m11', partner: 'Local Residents', discount: 'Minor Road Fixes', cost: 1500, type: 'Community', contributed: 90000, goal: 400000 }
      ];
    }

    return [...baseRewards, ...communityRewards].map(r => {
      if (r.type === 'Community') {
        const extra = (globalContributions || {})[r.id] || 0;
        return { ...r, contributed: r.contributed + extra };
      }
      return r;
    });
  }, [localArea, globalContributions]);
  const [showAppTutorial, setShowAppTutorial] = useState(false);
  const [showFeedTutorial, setShowFeedTutorial] = useState(false);
  const [hasCheckedTutorial, setHasCheckedTutorial] = useState(false);
  const [appLaunchCount, setAppLaunchCount] = useState(1);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [locationHistory, setLocationHistory] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  // Tracks whether the Firestore complaints snapshot has delivered its first result.
  // Screens use this to show a loading state instead of stale mock data.
  const [complaintsLoaded, setComplaintsLoaded] = useState(false);

  // ─── 7-Day Streak System ───
  const [streakDay, setStreakDay] = useState(1);
  const [lastClaimDate, setLastClaimDate] = useState(null);
  const [activeDates, setActiveDates] = useState([]);
  const [hasClaimedWelcomeGift, setHasClaimedWelcomeGift] = useState(false);
  // Guard: prevents the save effect from overwriting AsyncStorage before the initial load finishes
  const [isLoaded, setIsLoaded] = useState(false);
  // Guard: skip N save triggers after isLoaded becomes true.
  // React batches setState calls from loadData, so multiple save effect fires happen before
  // all loaded values have propagated. We need to skip enough of them.
  const savesToSkipRef = useRef(2);
  const dbLoadFailedRef = useRef(false);
  // Track which user we last loaded data for, to prevent cross-user save contamination
  const lastLoadedUserIdRef = useRef(null);
  // Debounce timer for the save effect
  const saveTimerRef = useRef(null);
  // Timestamp of when the initial load finished — used to suppress the stats-sync
  // useEffect for the first few seconds while Firestore's onSnapshot is still delivering
  // the initial batch of complaints. Without this guard the effect fires many times
  // as each document arrives, causing expensive re-computation and re-renders.
  const loadFinishedAtRef = useRef(0);

  const { isLoggedIn, isBooting, user } = useAuth();

  useEffect(() => {
    // Wait until user is authenticated to subscribe, preventing the listener
    // from failing or returning empty data due to unauthenticated state.
    if (!user?.id) return;
    // Only show full loading spinner if we have no complaints yet
    if (complaints.length === 0) setComplaintsLoaded(false);
    setFeedError(null); // Clear any previous error on new attempt

    const subscriber = firestore()
      .collection('complaints')
      .orderBy('timestamp', 'desc')
      .limit(complaintLimit)
      .onSnapshot(querySnapshot => {
        if (!querySnapshot) return;
        const fbComplaints = [];
        querySnapshot.forEach(doc => {
          fbComplaints.push({ ...doc.data(), id: doc.id });
        });

        setComplaints(fbComplaints);

        // Pagination checks
        setHasMoreComplaints(querySnapshot.size >= complaintLimit);
        setIsFetchingMore(false);
        setFeedError(null);
        setComplaintsLoaded(true);
      }, error => {
        console.error('Firestore complaints listener error:', error);
        setIsFetchingMore(false);
        // Classify error type so the UI can show an appropriate message
        if (error?.code === 'firestore/unavailable' || error?.code === 'firestore/deadline-exceeded') {
          setFeedError('network');
        } else if (error?.code === 'firestore/permission-denied') {
          setFeedError('permission');
        } else {
          setFeedError('unknown');
        }
        // Still mark as loaded so the UI doesn't hang on skeletons forever
        setComplaintsLoaded(true);
      });

    return () => subscriber();
  }, [user?.id, complaintLimit]);

  // Exposed so the feed screen can trigger a fresh retry after an error
  const retryFeedLoad = useCallback(() => {
    setFeedError(null);
    setComplaintsLoaded(false);
    // Reset limit to trigger a fresh onSnapshot subscription
    setComplaintLimit(15);
  }, []);

  // Separate lightweight listener for the map — fetches minimal fields for ALL complaints.
  // This is intentionally kept separate from the paginated feed listener so the map always
  // shows every pin regardless of how far the user has scrolled in the feed.
  useEffect(() => {
    if (!user?.id) return;
    const mapSubscriber = firestore()
      .collection('complaints')
      .orderBy('timestamp', 'desc')
      .limit(100) // Lowered ceiling to save reads for demo
      .onSnapshot(snap => {
        if (!snap) return;
        const pins = [];
        snap.forEach(doc => {
          const d = doc.data();
          // Pull coords plus the lightweight fields needed for the Map Popup
          if (d.coords) {
            pins.push({
              id: doc.id,
              coords: d.coords,
              category: d.category,
              reporter: d.reporter,
              location: d.location,
              location_ur: d.location_ur,
              location_en: d.location_en,
              status: d.status,
              verifiedCount: d.verifiedCount || 0,
              isOwnReport: Boolean(user?.id && d.userId === user.id),
            });
          }
        });
        setMapComplaints(pins);
      }, err => {
        console.warn('Map complaints listener error:', err);
      });
    return () => mapSubscriber();
  }, [user?.id]);

  const fetchMoreComplaints = useCallback(() => {
    if (isFetchingMore || !hasMoreComplaints) return;
    setIsFetchingMore(true);
    setComplaintLimit(prev => prev + 15);
  }, [isFetchingMore, hasMoreComplaints]);

  // Load state from local storage if available
  useEffect(() => {
    const loadData = async () => {
      if (isBooting) return;
      setIsLoaded(false); // Prevent saving while loading new user data
      try {
        let currentDeviceId = await AsyncStorage.getItem('kcp_device_id');
        if (!currentDeviceId) {
          currentDeviceId = generateDeviceId();
          await AsyncStorage.setItem('kcp_device_id', currentDeviceId).catch(() => { });
        }
        setDeviceId(currentDeviceId);

        const savedLaunchCount = await AsyncStorage.getItem('kcp_launch_count');
        const count = savedLaunchCount ? parseInt(savedLaunchCount, 10) + 1 : 1;
        setAppLaunchCount(count);
        await AsyncStorage.setItem('kcp_launch_count', count.toString());

        // NOTE: Complaints are loaded exclusively by the Firestore real-time listener

        if (!user) {
          // Unauthenticated or just logged out. Reset state to defaults.
          lastLoadedUserIdRef.current = null;
          setUserStats(INITIAL_USER_STATS);
          setVouchers([]);
          setLocalArea('Gulshan-e-Iqbal');
          setCommunityContributions({});
          setUnlockedBadges([]);
          setLocationHistory([]);
          setStreakDay(1);
          setLastClaimDate(null);
          setActiveDates([]);
          setHasClaimedWelcomeGift(false);
          welcomeGiftClaimedRef.current = false;
          savesToSkipRef.current = 2;
          setIsLoaded(true);
          return;
        }

        const uid = user.id;

        let dbData = null;
        dbLoadFailedRef.current = false;
        try {
          // Force fetch from server to ensure fresh credits and level
          const docSnap = await firestore().collection('user_data').doc(uid).get({ source: 'server' });
          if (docSnap.exists) {
            dbData = docSnap.data();
          }
        } catch (e) {
          console.warn("Firestore user_data server load error, falling back to cache:", e);
          try {
            const docSnap = await firestore().collection('user_data').doc(uid).get({ source: 'cache' });
            if (docSnap.exists) {
              dbData = docSnap.data();
            }
          } catch (e2) {
            console.warn("Firestore user_data cache load error:", e2);
            dbLoadFailedRef.current = true;
          }
        }


        const savedStats = dbData?.userStats ? JSON.stringify(dbData.userStats) : await AsyncStorage.getItem(`kcp_user_stats_${uid}`);
        const savedVouchers = dbData?.vouchers ? JSON.stringify(dbData.vouchers) : await AsyncStorage.getItem(`kcp_vouchers_${uid}`);
        const savedArea = dbData?.localArea || await AsyncStorage.getItem(`kcp_local_area_${uid}`);
        const savedContributions = dbData?.communityContributions ? JSON.stringify(dbData.communityContributions) : await AsyncStorage.getItem(`kcp_community_contributions_${uid}`);
        const savedUnlockedBadges = dbData?.unlockedBadges ? JSON.stringify(dbData.unlockedBadges) : await AsyncStorage.getItem(`kcp_unlocked_badges_${uid}`);
        const savedLocationHistory = dbData?.locationHistory ? JSON.stringify(dbData.locationHistory) : await AsyncStorage.getItem(`kcp_location_history_${uid}`);

        // Use safeParseJSON for all reads — corrupted AsyncStorage must not crash the app
        if (savedStats) setUserStats({ ...INITIAL_USER_STATS, ...safeParseJSON(savedStats, INITIAL_USER_STATS) });
        else setUserStats(INITIAL_USER_STATS);

        setVouchers(safeParseJSON(savedVouchers, []));

        if (savedArea) setLocalArea(savedArea);
        else setLocalArea('Gulshan-e-Iqbal');

        setCommunityContributions(safeParseJSON(savedContributions, {}));

        setUnlockedBadges(safeParseJSON(savedUnlockedBadges, []));

        // Cap location history to prevent unbounded array growth
        setLocationHistory((safeParseJSON(savedLocationHistory, [])).slice(-MAX_LOCATION_HISTORY));

        const savedMultiLang = dbData?.hasUsedMultipleLanguages !== undefined ? (dbData.hasUsedMultipleLanguages ? 'true' : 'false') : await AsyncStorage.getItem(`kcp_has_used_multi_lang_${uid}`);
        if (savedMultiLang === 'true') {
          setHasUsedMultipleLanguages(true);
        } else {
          setHasUsedMultipleLanguages(false);
        }

        const savedAnon = dbData?.isAnonymous !== undefined ? (dbData.isAnonymous ? 'true' : 'false') : await AsyncStorage.getItem(`kcp_anonymous_${uid}`);
        if (savedAnon === 'true') setIsAnonymousState(true);
        else setIsAnonymousState(false);

        const savedHaptics = dbData?.hapticsEnabled !== undefined ? (dbData.hapticsEnabled ? 'true' : 'false') : await AsyncStorage.getItem(`kcp_haptics_${uid}`);
        if (savedHaptics !== null) setHapticsEnabled(savedHaptics === 'true');
        else setHapticsEnabled(true);

        const savedWelcomeGift = dbData?.hasClaimedWelcomeGift !== undefined ? (dbData.hasClaimedWelcomeGift ? 'true' : 'false') : await AsyncStorage.getItem(`kcp_has_claimed_welcome_gift_${uid}`);
        if (savedWelcomeGift === 'true') setHasClaimedWelcomeGift(true);
        else setHasClaimedWelcomeGift(false);

        // Load streak data
        const savedStreak = dbData?.streak ? JSON.stringify(dbData.streak) : await AsyncStorage.getItem(`kcp_streak_${uid}`);
        if (savedStreak) {
          const parsed = safeParseJSON(savedStreak, {});
          const todayStr = new Date().toDateString();
          const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

          let loadedDay = parsed.day || 1;
          const loadedLastDate = parsed.lastDate || null;

          if (loadedLastDate && loadedLastDate !== todayStr && loadedLastDate !== yesterdayStr) {
            loadedDay = 1;
          }

          setStreakDay(loadedDay);
          setLastClaimDate(loadedLastDate);
          // Cap activeDates to prevent unbounded growth
          if (Array.isArray(parsed.activeDates)) {
            setActiveDates(parsed.activeDates.slice(-MAX_ACTIVE_DATES));
          }
        } else {
          setStreakDay(1);
          setLastClaimDate(null);
          setActiveDates([]);
        }

        // ── On every app open: cancel pending nudges, detect missed ones ───────
        // Pattern: cancel today's scheduled trigger (user is active → no nudge
        // needed), then reschedule for tomorrow. Additionally, detect whether a
        // previously scheduled notification silently expired while the phone was
        // offline (WiFi + data off → Android Doze suppressed the AlarmManager
        // alarm). If a trigger was missed, fire it immediately as a fallback so
        // the user never loses their daily/streak reminder.
        NotificationService.init().then(async () => {
          // 1. Check for missed notifications BEFORE cancelling them, so we
          //    can detect if the prior scheduled time has already passed.
          const resolvedDay = savedStreak ? (safeParseJSON(savedStreak, {}).day || 1) : 1;
          const missed = await NotificationService.checkMissedNotification();
          if (missed.missed) {
            // The scheduled fire time passed while the phone was offline — fire now.
            if (missed.type === 'daily') {
              await NotificationService.showMissedDailyReminder();
            } else if (missed.type === 'streak') {
              await NotificationService.showMissedStreakAlert(resolvedDay);
            }
          }
          // 2. Kill today's pending daily reminder + streak alert
          await NotificationService.cancelTodayNudges();
          // 3. Cancel inactivity reminders (user is active right now)
          await NotificationService.cancelInactivityReminders();
          // 4. Reschedule everything for tomorrow / 7-14 days from now
          await NotificationService.scheduleRecurringNudges(resolvedDay);
          await NotificationService.scheduleInactivityReminders();
        }).catch(() => { });

        // After a successful load, mark that several saves should be skipped.
        // React batches setState calls, so the save effect fires multiple times as
        // each piece of state settles. We skip enough fires to let everything propagate.
        lastLoadedUserIdRef.current = uid;
        savesToSkipRef.current = 2;

      } catch (e) {
        console.error('Failure loading AppContext data', e);
      } finally {
        // CRITICAL: only allow saves AFTER the full load is complete
        loadFinishedAtRef.current = Date.now();
        setIsLoaded(true);
      }
    };
    loadData();
  }, [isBooting, user]);

  // Reset tutorial tracking only when user is genuinely logged out (not just booting up)
  useEffect(() => {
    if (!isBooting && !isLoggedIn) {
      setHasCheckedTutorial(false);
      setShowAppTutorial(false);
      setShowFeedTutorial(false);
      // Removed clearing of AsyncStorage here so it persists per user account
    }
  }, [isLoggedIn, isBooting]);

  // ── Reconnect listener: fire missed notifications when coming back online ────
  // When the user had WiFi + data off overnight, Android Doze mode may have
  // suppressed our AlarmManager triggers. When connectivity is restored the
  // timestamps have already expired — the notification is simply lost.
  // This effect registers a listener that fires as soon as the phone goes from
  // offline → online (detected by NetworkContext) and immediately shows any
  // missed notification via displayNotification (which is Doze-immune).
  useEffect(() => {
    const unregister = registerReconnectListener(async () => {
      try {
        const missed = await NotificationService.checkMissedNotification();
        if (missed.missed) {
          if (missed.type === 'daily') {
            await NotificationService.showMissedDailyReminder();
          } else if (missed.type === 'streak') {
            await NotificationService.showMissedStreakAlert(streakDay || 1);
          }
        }
      } catch { }
    });
    return unregister;
  }, [streakDay]);

  // Show tutorial once per login session (after login, before user dismisses it)
  useEffect(() => {
    const checkTutorial = async () => {
      // Wait for boot to finish so we have correct isLoggedIn state
      if (isBooting) return;

      if (isLoggedIn && !hasCheckedTutorial && user) {
        try {
          const hasSeen = await AsyncStorage.getItem(`kcp_has_seen_tutorial_${user.id}`);
          if (hasSeen !== 'true') {
            setShowAppTutorial(true);
          }
          const hasSeenFeed = await AsyncStorage.getItem(`kcp_has_seen_feed_tutorial_${user.id}`);
          if (hasSeenFeed !== 'true') {
            setShowFeedTutorial(true);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setHasCheckedTutorial(true);
        }
      }
    };
    checkTutorial();
  }, [isLoggedIn, hasCheckedTutorial, isBooting, user]);

  const closeTutorial = async () => {
    setShowAppTutorial(false);
    try {
      if (user) {
        await AsyncStorage.setItem(`kcp_has_seen_tutorial_${user.id}`, 'true');
      }
    } catch (e) { }
  };

  const closeFeedTutorial = async () => {
    setShowFeedTutorial(false);
    try {
      if (user) {
        await AsyncStorage.setItem(`kcp_has_seen_feed_tutorial_${user.id}`, 'true');
      }
    } catch (e) { }
  };

  const triggerAppTutorial = () => {
    setShowAppTutorial(true);
  };

  // Robust sync: If user stats were lost (or 0) but they have reported issues in the database, restore basic stats.
  // Debounced to avoid running on every individual Firestore onSnapshot document arrival.
  const statsSyncTimerRef = useRef(null);
  useEffect(() => {
    if (!isLoaded || !user) return;

    // Suppress for 3 seconds after initial load — Firestore delivers complaints
    // one document at a time during initial onSnapshot, causing this to fire dozens
    // of times in the first few seconds. The 3-second window lets the burst settle.
    const msSinceLoad = Date.now() - loadFinishedAtRef.current;
    const suppressMs = Math.max(0, 3000 - msSinceLoad);

    if (statsSyncTimerRef.current) clearTimeout(statsSyncTimerRef.current);
    statsSyncTimerRef.current = setTimeout(() => {

      const ownComplaints = complaints.filter(c => c.userId === user.id);
      const ownComplaintsCount = ownComplaints.length;

      // Reconstruct missing activeDates from past complaints
      const missingDates = [];
      ownComplaints.forEach(c => {
        if (c.timestamp) {
          const d = new Date(c.timestamp);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (!activeDates.includes(dateStr) && !missingDates.includes(dateStr)) {
            missingDates.push(dateStr);
          }
        }
      });

      if (missingDates.length > 0) {
        setActiveDates(prev => [...new Set([...prev, ...missingDates])]);
      }

      let expectedVerifiedCredits = 0;
      ownComplaints.forEach(c => {
        const v = c.verifiedCount || 0;
        if (v >= 10) expectedVerifiedCredits += 150;
        if (v >= 20) expectedVerifiedCredits += 75;
        if (v >= 30) expectedVerifiedCredits += 25;
      });

      const earnedVerifiedCredits = userStats.verifiedCreditsEarned || 0;

      if (ownComplaintsCount > 0 && (userStats.totalComplaints < ownComplaintsCount || expectedVerifiedCredits > earnedVerifiedCredits)) {
        setUserStats(prev => {
          const prevEarnedVerified = prev.verifiedCreditsEarned || 0;
          let newCityCredits = prev.cityCredits || 0;
          let newVerifiedCreditsEarned = prevEarnedVerified;

          if (expectedVerifiedCredits > prevEarnedVerified) {
            newCityCredits += (expectedVerifiedCredits - prevEarnedVerified);
            newVerifiedCreditsEarned = expectedVerifiedCredits;
          }

          if (prev.totalComplaints >= ownComplaintsCount) {
            if (expectedVerifiedCredits <= prevEarnedVerified) return prev;
            return {
              ...prev,
              cityCredits: newCityCredits,
              verifiedCreditsEarned: newVerifiedCreditsEarned
            };
          }

          const missingComplaints = ownComplaintsCount - prev.totalComplaints;
          let newXp = (prev.xp || 0) + (missingComplaints * 250); // Increased XP to 250 per report
          newCityCredits += (missingComplaints * 50); // Added 50 City Credits per missing report
          let newLevel = prev.level || 1;
          let newNextLevelXp = prev.nextLevelXp || 500;

          while (newXp >= newNextLevelXp) {
            newXp -= newNextLevelXp;
            newLevel += 1;
            newNextLevelXp = Math.round(newNextLevelXp * 1.25);
          }

          const calculateRank = (lvl) => {
            if (lvl >= 50) return 'City Legend';
            if (lvl >= 35) return 'Elite Citizen';
            if (lvl >= 20) return 'Civic Leader';
            if (lvl >= 10) return 'Community Guardian';
            if (lvl >= 5) return 'Active Shehri';
            return 'New Citizen';
          };
          const newRank = calculateRank(newLevel);

          // Calculate pragmatic tiers for Impact Portfolio
          const trustScore = ownComplaintsCount === 0 ? 0 : Math.min(98, 70 + (newLevel * 2));
          let trustTier = 'Evaluating';
          if (ownComplaintsCount > 0) {
            if (trustScore >= 95) trustTier = 'Elite';
            else if (trustScore >= 85) trustTier = 'Trusted';
            else if (trustScore >= 75) trustTier = 'Good';
            else trustTier = 'Fair';
          }

          const impactScore = ownComplaintsCount === 0 ? 100 : Math.max(1, 50 - (newLevel * 2));
          let impactTier = 'Newcomer';
          if (ownComplaintsCount > 0) {
            if (impactScore <= 10) impactTier = 'Leader';
            else if (impactScore <= 30) impactTier = 'Influential';
            else impactTier = 'Active';
          }

          return {
            ...prev,
            totalComplaints: ownComplaintsCount,
            xp: newXp,
            level: newLevel,
            rank: newRank,
            nextLevelXp: newNextLevelXp,
            trustScore,
            trustTier,
            impactScore,
            impactTier,
            cityCredits: newCityCredits,
            verifiedCreditsEarned: newVerifiedCreditsEarned
          };
        });
      }

    }, suppressMs); // end debounced callback
    return () => { if (statsSyncTimerRef.current) clearTimeout(statsSyncTimerRef.current); };
  }, [isLoaded, user, complaints, userStats.totalComplaints, userStats.verifiedCreditsEarned, activeDates]);

  // Save to AsyncStorage + Firestore — but ONLY after the initial load has completed.
  // Uses a user-ID guard + debounce to prevent:
  // (a) stale default values overwriting Firestore during React state settling
  // (b) cross-user data contamination when switching accounts
  useEffect(() => {
    if (!isLoaded || !user) return;

    // Skip initial save bursts after loadData finishes — React batches setState
    // calls so the save effect fires multiple times before all loaded values
    // have propagated. Decrement the counter and bail until it reaches zero.
    if (savesToSkipRef.current > 0) {
      savesToSkipRef.current -= 1;
      return;
    }

    // Safety: never save data into a different user's storage than the one we loaded for
    const uid = user.id;
    if (lastLoadedUserIdRef.current && lastLoadedUserIdRef.current !== uid) {
      console.warn('[AppContext] Blocking save: loaded user', lastLoadedUserIdRef.current, '!= current user', uid);
      return;
    }

    // Debounce: wait 800ms for state to fully settle before persisting.
    // A longer window is intentional — on startup React fires this effect many times
    // as each piece of state (userStats, vouchers, streak, etc.) settles from the
    // loadData async function. 800ms collapses that burst into a single write.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // NOTE: complaints are NOT saved here — Firestore real-time listener is the
      // single source of truth for complaints. Saving them to AsyncStorage caused
      // stale cache overwrites on fresh installs.
      AsyncStorage.setItem(`kcp_user_stats_${uid}`, JSON.stringify(userStats));
      AsyncStorage.setItem(`kcp_vouchers_${uid}`, JSON.stringify(vouchers));
      AsyncStorage.setItem(`kcp_local_area_${uid}`, localArea);
      AsyncStorage.setItem(`kcp_anonymous_${uid}`, isAnonymous ? 'true' : 'false');
      AsyncStorage.setItem(`kcp_streak_${uid}`, JSON.stringify({ day: streakDay, lastDate: lastClaimDate, activeDates }));
      AsyncStorage.setItem(`kcp_community_contributions_${uid}`, JSON.stringify(communityContributions));
      AsyncStorage.setItem(`kcp_unlocked_badges_${uid}`, JSON.stringify(unlockedBadges));
      AsyncStorage.setItem(`kcp_has_used_multi_lang_${uid}`, hasUsedMultipleLanguages ? 'true' : 'false');
      AsyncStorage.setItem(`kcp_haptics_${uid}`, hapticsEnabled ? 'true' : 'false');
      AsyncStorage.setItem(`kcp_has_claimed_welcome_gift_${uid}`, hasClaimedWelcomeGift ? 'true' : 'false');
      AsyncStorage.setItem(`kcp_location_history_${uid}`, JSON.stringify(locationHistory));

      // Sync all user state to Firestore
      if (!dbLoadFailedRef.current) {
        firestore().collection('user_data').doc(uid).set({
          userStats,
          vouchers,
          localArea,
          isAnonymous,
          streak: { day: streakDay, lastDate: lastClaimDate, activeDates },
          communityContributions,
          unlockedBadges,
          hasUsedMultipleLanguages,
          hapticsEnabled,
          hasClaimedWelcomeGift,
          locationHistory,
          updatedAt: firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(e => console.warn('Firestore sync error:', e));
      }
    }, 300);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isLoaded, user, userStats, vouchers, localArea, isAnonymous, streakDay, lastClaimDate, activeDates, communityContributions, unlockedBadges, hasUsedMultipleLanguages, hapticsEnabled, hasClaimedWelcomeGift, locationHistory]);

  const setIsAnonymous = (value) => {
    setIsAnonymousState(value);
  };

  const recordLocation = useCallback((coords) => {
    setLocationHistory(prev => {
      const now = Date.now();
      // Keep only last 24 hours, then cap total entries
      const filtered = prev
        .filter(p => now - new Date(p.timestamp).getTime() < 86400000)
        .slice(-MAX_LOCATION_HISTORY);
      return [...filtered, { ...coords, timestamp: new Date().toISOString() }];
    });
  }, []);

  const addComplaint = async (newComplaint) => {
    // Guard: must be authenticated to submit a complaint
    if (!user?.id) {
      console.warn('addComplaint: rejected — user not authenticated');
      return;
    }

    const reporterName = newComplaint.reporterName || 'You (Anonymous)';

    // Sanitize user-supplied text fields before writing to Firestore
    const sanitizedDescription = sanitizeText(newComplaint.description, MAX_DESCRIPTION_LEN);
    const sanitizedLocation = sanitizeText(newComplaint.location, MAX_LOCATION_LEN);

    // Generate a proper Firestore auto-ID to avoid timestamp collisions
    const docRef = firestore().collection('complaints').doc();
    const optimisticId = docRef.id;

    // ── Upload image FIRST so the Firestore doc always contains the final URL ──
    // Previously the image was uploaded after the optimistic UI update, which meant
    // the onSnapshot listener would deliver the Firestore doc with image:null (upload
    // not yet done) and overwrite the optimistic complaint, losing the user's photo.
    let finalImage = null;
    if (newComplaint.image &&
      (newComplaint.image.startsWith('file://') || newComplaint.image.startsWith('content://'))) {
      try {
        const fileName = `complaints/${optimisticId}_${Date.now()}.jpg`;
        const reference = storage().ref(fileName);
        await reference.putFile(newComplaint.image);
        finalImage = await reference.getDownloadURL();
      } catch (imgErr) {
        console.warn('Complaint image upload failed, continuing without image:', imgErr);
        finalImage = null;
      }
    } else if (newComplaint.image && newComplaint.image.startsWith('http')) {
      finalImage = newComplaint.image;
    }

    const complaintWithMeta = {
      ...newComplaint,
      description: sanitizedDescription,
      location: sanitizedLocation,
      id: optimisticId,
      status: 'Pending',
      verifiedCount: 0,
      verifiedBy: [],
      timestamp: new Date().toISOString(),
      reporter: reporterName,
      deviceId: deviceId, // For anti-cheat checks
      userId: user.id, // Flag to identify user's own reports regardless of anonymous toggle
      // Store the already-resolved URL (or null) — never a local file:// URI
      image: finalImage,
    };
    // Remove the temporary fields from the stored complaint
    delete complaintWithMeta.reporterName;
    const currentTodayCount = complaintWithMeta.todayCount || 0;
    const currentTodayDate = complaintWithMeta.todayDate || new Date().toISOString().split('T')[0];
    delete complaintWithMeta.todayCount;
    delete complaintWithMeta.todayDate;

    // Optimistic UI update — image is already the final URL so onSnapshot won't overwrite it
    setComplaints(prev => {
      // Avoid duplicate from optimistic update and onSnapshot
      if (prev.find(c => c.id === optimisticId)) return prev;
      return [complaintWithMeta, ...prev];
    });
    setUserStats(prev => ({ ...prev, totalComplaints: prev.totalComplaints + 1 }));
    addXP(250);
    addCityCredits(50);
    recordActivity('addComplaint');

    try {
      const batch = firestore().batch();

      // 1. Write the complaint
      batch.set(docRef, complaintWithMeta);

      // 2. Update the rate limit document for backend rules
      const rateLimitRef = firestore().collection('rate_limits').doc(user.id);
      batch.set(rateLimitRef, {
        date: currentTodayDate,
        count: currentTodayCount + 1
      });

      await batch.commit();
    } catch (e) {
      console.error("Failed to write complaint to Firestore:", e);
      // Revert optimistic state so we don't show a false success
      setComplaints(prev => prev.filter(c => c.id !== optimisticId));
      setUserStats(prev => ({ ...prev, totalComplaints: Math.max(0, prev.totalComplaints - 1) }));
      throw e;
    }
  };

  const addCityCredits = (amount) => {
    setUserStats(prev => ({ ...prev, cityCredits: (prev.cityCredits || 0) + amount }));
  };

  // ─── Daily Streak Claim ───
  const hasClaimedToday = () => {
    return lastClaimDate === new Date().toDateString();
  };

  // Marks today as active in the heatmap. Does NOT advance streak or award points.
  const markDateActive = () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setActiveDates(prev => {
      if (!prev.includes(todayStr)) {
        // Cap array to prevent unbounded growth (keep most recent MAX_ACTIVE_DATES entries)
        const updated = [...prev, todayStr];
        return updated.length > MAX_ACTIVE_DATES ? updated.slice(-MAX_ACTIVE_DATES) : updated;
      }
      return prev;
    });
  };

  // Advances the streak counter and awards points.
  const advanceStreak = () => {
    const todayDateStr = new Date().toDateString();
    // Only advance once per day
    if (lastClaimDate === todayDateStr) return null;

    const yesterdayDateStr = new Date(Date.now() - 86400000).toDateString();
    let newDay;

    if (!lastClaimDate || lastClaimDate !== yesterdayDateStr) {
      // First claim ever OR streak broken → restart at day 1
      newDay = 1;
    } else {
      // Claimed yesterday → continue streak
      newDay = streakDay >= 7 ? 1 : streakDay + 1;
    }

    const points = STREAK_POINTS[newDay - 1] || 25;
    addCityCredits(points);
    setStreakDay(newDay);
    setLastClaimDate(todayDateStr);

    // Reschedule nudges with the updated streak day (cancel-on-open already
    // fired when the user opened the app, so these target TOMORROW)
    NotificationService.scheduleRecurringNudges(newDay).catch(() => { });

    return { points };
  };

  // Full activity recording: marks heatmap date
  // Called from addComplaint and verifyComplaint (actual civic actions).
  const recordActivity = (source) => {
    console.log(`[Ghost Streak Monitor] recordActivity triggered by: ${source}`);
    markDateActive();
  };

  // The "Claim Now" button
  const claimDailyStreak = () => {
    return advanceStreak();
  };

  const verifyComplaint = (id, weight = 1) => {
    // Guard: only authenticated users can verify
    if (!user?.id) return { success: false, reason: 'not_authenticated' };

    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return { success: false, reason: 'not_found' };
    if (complaint.userId === user.id) return { success: false, reason: 'own_report' };

    // Anti-cheat: Block verifying from the same physical device the report was created from
    if (complaint.deviceId && complaint.deviceId === deviceId) {
      return { success: false, reason: 'same_device' };
    }

    const verifiedBy = complaint.verifiedBy || [];

    // Anti-cheat: Block if this device or this user account has already verified
    if (verifiedBy.some(v => {
      if (typeof v === 'string') return v === 'me';
      if (v.userId === user.id) return true;
      if (deviceId && v.deviceId === deviceId) return true;
      return false;
    })) {
      return { success: false, reason: 'already_verified' };
    }

    const verifierEntry = { userId: user.id, deviceId: deviceId || null, timestamp: new Date().toISOString() };

    // Optimistic UI update
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          verifiedCount: c.verifiedCount + weight,
          verifiedBy: [...(c.verifiedBy || []), verifierEntry]
        };
      }
      return c;
    }));

    // Background Firestore update — fully error-handled
    firestore()
      .collection('complaints')
      .doc(id)
      .get()
      .then(docSnap => {
        if (!docSnap.exists) {
          // Document doesn't exist in Firestore (may be a seed/mock complaint) — skip
          return;
        }
        return docSnap.ref.update({
          verifiedCount: firestore.FieldValue.increment(weight),
          verifiedBy: firestore.FieldValue.arrayUnion(verifierEntry),
        });
      })
      .catch(e => console.warn('verifyComplaint Firestore update failed:', e));

    // Record the activity and grant rewards instantly
    recordActivity('verifyComplaint');
    addXP(25 * weight);
    addCityCredits(25 * weight);
    return { success: true };
  };

  const removeComplaint = async (id) => {
    // Guard: only the report owner may delete their own complaint
    if (!id) return;
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;
    if (complaint.userId && user?.id && complaint.userId !== user.id) {
      console.warn('removeComplaint: rejected — user does not own this complaint');
      return;
    }

    setComplaints(prev => prev.filter(c => c.id !== id));
    try {
      await firestore().collection('complaints').doc(id).delete();
    } catch (e) {
      console.error("Failed to remove complaint from Firebase:", e);
    }
  };

  const resolveComplaint = async (id) => {
    // Optimistic update
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'Resolved' } : c));
    try {
      await firestore().collection('complaints').doc(id).update({
        status: 'Resolved',
        resolvedAt: firestore.FieldValue.serverTimestamp()
      });
      // Update local stats for resolved
      setUserStats(prev => ({
        ...prev,
        resolvedComplaints: (prev.resolvedComplaints || 0) + 1
      }));
    } catch (e) {
      console.error("Failed to resolve complaint in Firebase:", e);
    }
  };

  const addXP = (amount) => {
    setUserStats(prev => {
      let xp = (prev.xp || 0) + amount;
      let level = prev.level || 1;
      let nextLevelXp = prev.nextLevelXp || 500;
      let cityCredits = prev.cityCredits || 0;
      let totalComplaints = prev.totalComplaints || 0;

      while (xp >= nextLevelXp) {
        xp -= nextLevelXp;
        level += 1;
        nextLevelXp = Math.round(nextLevelXp * 1.25); // each level needs 25% more XP
      }

      const calculateRank = (lvl) => {
        if (lvl >= 50) return 'City Legend';
        if (lvl >= 35) return 'Elite Citizen';
        if (lvl >= 20) return 'Civic Leader';
        if (lvl >= 10) return 'Community Guardian';
        if (lvl >= 5) return 'Active Shehri';
        return 'New Citizen';
      };
      const newRank = calculateRank(level);

      // Calculate pragmatic tiers
      const trustScore = totalComplaints === 0 ? 0 : Math.min(98, 70 + (level * 2));
      let trustTier = 'Evaluating';
      if (totalComplaints > 0) {
        if (trustScore >= 95) trustTier = 'Elite';
        else if (trustScore >= 85) trustTier = 'Trusted';
        else if (trustScore >= 75) trustTier = 'Good';
        else trustTier = 'Fair';
      }

      const impactScore = totalComplaints === 0 ? 100 : Math.max(1, 50 - (level * 2));
      let impactTier = 'Newcomer';
      if (totalComplaints > 0) {
        if (impactScore <= 10) impactTier = 'Leader';
        else if (impactScore <= 30) impactTier = 'Influential';
        else impactTier = 'Active';
      }

      return { ...prev, xp, level, rank: newRank, nextLevelXp, cityCredits, totalComplaints, trustScore, trustTier, impactScore, impactTier };
    });
  };

  const redeemReward = (rewardId) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward || userStats.cityCredits < reward.cost) return false;

    // Use collision-resistant IDs: timestamp base-36 + two random segments
    const tsB36 = Date.now().toString(36).toUpperCase();
    const r1 = Math.random().toString(36).substring(2, 8).toUpperCase();
    const r2 = Math.random().toString(36).substring(2, 6).toUpperCase();

    const newVoucher = {
      id: `${tsB36}${r1}`,
      partner: reward.partner,
      discount: reward.discount,
      expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      code: `KCP-${tsB36}-${r2}`,
      redeemedAt: new Date().toISOString(),
    };

    setVouchers(prev => [newVoucher, ...prev]);
    setUserStats(prev => ({ ...prev, cityCredits: prev.cityCredits - reward.cost }));
    return true;
  };

  const contributeToCommunityGoal = async (rewardId, amount) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward || userStats.cityCredits < amount) return false;

    let isCompletedNow = false;
    if (reward.contributed + amount >= reward.goal && reward.contributed < reward.goal) {
      isCompletedNow = true;
    }

    // Deduct credits optimistically so the UI is instant
    setUserStats(prev => ({ ...prev, cityCredits: prev.cityCredits - amount }));
    setCommunityContributions(prev => ({
      ...prev,
      [rewardId]: (prev[rewardId] || 0) + amount,
    }));

    try {
      await firestore().collection('global_data').doc('community_goals').set({
        [rewardId]: firestore.FieldValue.increment(amount)
      }, { merge: true });
    } catch (e) {
      // Firestore write failed — roll back the optimistic credit deduction
      console.warn('contributeToCommunityGoal Firestore write failed, rolling back credits:', e);
      setUserStats(prev => ({ ...prev, cityCredits: (prev.cityCredits || 0) + amount }));
      setCommunityContributions(prev => ({
        ...prev,
        [rewardId]: Math.max(0, (prev[rewardId] || 0) - amount),
      }));
      return false;
    }

    return isCompletedNow;
  };

  const triggerHaptic = () => {
    if (hapticsEnabled) {
      Vibration.vibrate(15); // Very light haptic feedback
    }
  };

  const welcomeGiftClaimedRef = useRef(false);

  const claimWelcomeGift = () => {
    if (!hasClaimedWelcomeGift && !welcomeGiftClaimedRef.current) {
      welcomeGiftClaimedRef.current = true;
      addCityCredits(1250);
      setHasClaimedWelcomeGift(true);
    }
  };

  const computedComplaints = useMemo(() => {
    return complaints.map(c => ({
      ...c,
      isOwnReport: Boolean(user?.id && c.userId === user.id)
    }));
  }, [complaints, user]);

  const isComplaintVerifiedByMe = useCallback((complaint) => {
    if (!complaint) return false;
    const verifiedBy = complaint.verifiedBy || [];
    return verifiedBy.some(v => {
      if (typeof v === 'string') return v === 'me';
      if (user?.id && v.userId === user.id) return true;
      if (deviceId && v.deviceId === deviceId) return true;
      return false;
    });
  }, [user, deviceId]);

  return (
    <AppContext.Provider value={{
      complaints: computedComplaints,
      isComplaintVerifiedByMe,
      addComplaint,
      verifyComplaint,
      removeComplaint,
      resolveComplaint,
      userStats,
      addXP,
      addCityCredits,
      rewards,
      vouchers,
      redeemReward,
      contributeToCommunityGoal,
      localArea,
      setLocalArea,
      isAnonymous,
      setIsAnonymous,
      showAppTutorial,
      closeTutorial,
      triggerAppTutorial,
      streakDay,
      lastClaimDate,
      hasClaimedToday,
      claimDailyStreak,
      appLaunchCount,
      hapticsEnabled,
      setHapticsEnabled,
      triggerHaptic,
      activeDates,
      hasClaimedWelcomeGift,
      claimWelcomeGift,
      isLoaded,
      unlockedBadges,
      setUnlockedBadges,
      hasUsedMultipleLanguages,
      setHasUsedMultipleLanguages,
      locationHistory,
      recordLocation,
      showFeedTutorial,
      closeFeedTutorial,
      complaintsLoaded,
      fetchMoreComplaints,
      isFetchingMore,
      hasMoreComplaints,
      mapComplaints,
      feedError,
      retryFeedLoad,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
