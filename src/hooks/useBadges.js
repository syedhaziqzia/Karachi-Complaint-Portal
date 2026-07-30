import { useMemo } from 'react';
import { 
  Shield, CheckCircle2, Crown, Star, MapPin, Flame, Activity, TreeDeciduous, 
  Camera, Zap, CalendarDays, Droplet, Car, Trash2, ShieldCheck, ThumbsUp, Medal, 
  Trophy, Heart, Sun, Target, Wifi, HardHat, Siren, Sprout, Megaphone, Flag, 
  Wrench, Bus, Ticket, Map, Moon, Coffee, Eye, HeartPulse, CloudRain, Footprints, 
  Landmark, MessageSquare, Share2, Rocket, History, Calendar 
} from 'lucide-react-native';
import { useAppContext } from '../context/AppContext';

export const useBadges = () => {
  const { userStats, complaints, streakDay, hasUsedMultipleLanguages, unlockedBadges = [], activeDates = [] } = useAppContext();

  // Stable set so badge memo doesn't re-run unless unlockedBadges array changes
  const unlockedSet = useMemo(() => new Set(unlockedBadges), [unlockedBadges]);

  // Filter once to own complaints — memo only busts when full complaints array changes
  const userComplaints = useMemo(() => complaints.filter(c => c.isOwnReport), [complaints]);

  // Pre-derive all category counts as a stable object so the badge memo below
  // receives stable primitive values rather than recomputing inline on every render.
  const myComplaints = userComplaints.length;
  
  // Calculate true consecutive streak dynamically from activeDates instead of the 7-day reward loop
  const trueStreak = useMemo(() => {
    if (!activeDates || activeDates.length === 0) return streakDay || 0;
    
    // Sort dates descending
    const sortedDates = [...new Set(activeDates)].sort((a, b) => new Date(b) - new Date(a));
    
    let currentStreak = 1;
    let expectedDate = new Date(sortedDates[0]);
    expectedDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sortedDates.length; i++) {
      const d = new Date(sortedDates[i]);
      d.setHours(0, 0, 0, 0);
      
      const diffTime = expectedDate - d;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        expectedDate = d;
      } else {
        break;
      }
    }
    
    // Ensure it doesn't drop below the weekly reward loop value
    return Math.max(currentStreak, streakDay || 0);
  }, [activeDates, streakDay]);

  const hasWait30Days = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return userComplaints.some(c => {
      // Safely parse timestamp — Firestore Timestamp objects expose .toDate(), strings use new Date()
      const ts = c.timestamp && typeof c.timestamp.toDate === 'function'
        ? c.timestamp.toDate()
        : new Date(c.timestamp);
      // Must be a valid date, actually older than 30 days, AND still unresolved/pending
      return !isNaN(ts.getTime()) && ts < thirtyDaysAgo && c.status === 'Pending';
    });
  }, [userComplaints]);

  const catCounts = useMemo(() => ({
    brokenRoads: userComplaints.filter(c => c.category === 'Broken Roads').length,
    park: userComplaints.filter(c => c.category === 'Park' || c.category === 'Parks').length,
    kunda: userComplaints.filter(c => c.category === 'Kunda').length,
    sewerage: userComplaints.filter(c => c.category === 'Water' || c.category === 'Sewerage').length,
    traffic: userComplaints.filter(c => c.category === 'Traffic').length,
    waste: userComplaints.filter(c => c.category === 'Waste').length,
    encroachment: userComplaints.filter(c => c.category === 'Encroachment').length,
    verifiedTotal: userComplaints.reduce((sum, c) => sum + (c.verifiedCount || 0), 0),
  }), [userComplaints]);

  const badges = useMemo(() => {
    const xp = userStats?.xp || 0;
    const level = userStats?.level || 1;

    return [
      { id: 1,  name: 'First Report',        icon: Shield,        earned: unlockedSet.has(1)  || myComplaints >= 1,                        desc: 'Reported your first issue.' },
      { id: 2,  name: 'Verified 10',          icon: CheckCircle2,  earned: unlockedSet.has(2)  || catCounts.verifiedTotal >= 10,             desc: 'Received 10 verifications on your reports.' },
      { id: 3,  name: 'Local Hero',           icon: Crown,         earned: unlockedSet.has(3)  || level >= 5,                               desc: 'Reached Level 5.' },
      { id: 4,  name: 'Early Adopter',        icon: Star,          earned: true,                                                             desc: 'Joined during KCP launch.' },
      { id: 5,  name: 'Pothole Patrol',       icon: MapPin,        earned: catCounts.brokenRoads >= 5,                                       desc: 'Reported 5 road issues.' },
      { id: 6,  name: 'Streak Master',        icon: Flame,         earned: trueStreak >= 7,                                                  desc: 'Maintained a 7-day streak.' },
      { id: 7,  name: 'Active Citizen',       icon: Activity,      earned: xp >= 10000,                                                      desc: 'Earned 10,000 XP total.' },
      { id: 8,  name: 'Green Thumb',          icon: TreeDeciduous, earned: catCounts.park >= 3,                                              desc: 'Reported 3 park issues.' },
      { id: 9,  name: 'Sharp Eye',            icon: Camera,        earned: myComplaints >= 10,                                               desc: 'Reported 10 issues with photos.' },
      { id: 10, name: 'K-Electric Nemesis',   icon: Zap,           earned: catCounts.kunda >= 15,                                            desc: 'Reported 15 power/kunda issues.' },
      { id: 11, name: 'Daily Grinder',        icon: CalendarDays,  earned: trueStreak >= 30,                                                 desc: 'Logged in for 30 consecutive days.' },
      { id: 12, name: 'Water Saver',          icon: Droplet,       earned: catCounts.sewerage >= 5,                                          desc: 'Reported 5 water/sewerage issues.' },
      { id: 13, name: 'Traffic Warden',       icon: Car,           earned: catCounts.traffic >= 10,                                          desc: 'Reported 10 traffic signal issues.' },
      { id: 14, name: 'Clean City',           icon: Trash2,        earned: catCounts.waste >= 20,                                            desc: 'Reported 20 waste management issues.' },
      { id: 15, name: 'Trusted Voice',        icon: ShieldCheck,   earned: catCounts.verifiedTotal >= 50,                                    desc: 'Received 50 verifications on your reports.' },
      { id: 16, name: 'Helpful Hand',         icon: ThumbsUp,      earned: unlockedSet.has(16),                                              desc: 'Verified 100 community reports.' },
      { id: 17, name: 'Bronze Contributor',   icon: Medal,         earned: xp >= 1000,                                                       desc: 'Earned 1,000 XP.' },
      { id: 18, name: 'Silver Contributor',   icon: Medal,         earned: xp >= 5000,                                                       desc: 'Earned 5,000 XP.' },
      { id: 19, name: 'Gold Contributor',     icon: Medal,         earned: xp >= 20000,                                                      desc: 'Earned 20,000 XP.' },
      { id: 20, name: 'Global Champion',      icon: Trophy,        earned: level >= 10,                                                      desc: 'Reached Level 10.' },
      { id: 21, name: 'Civic Heart',          icon: Heart,         earned: unlockedSet.has(21),                                              desc: 'Used the app for 6 months.' },
      { id: 22, name: 'Road Master',          icon: MapPin,        earned: catCounts.brokenRoads >= 15,                                      desc: 'Reported 15 road issues.' },
      { id: 23, name: 'Precision',            icon: Target,        earned: myComplaints >= 50,                                               desc: 'Reported 50 pinned issues.' },
      { id: 24, name: 'Park Ranger',          icon: TreeDeciduous, earned: catCounts.park >= 10,                                             desc: 'Reported 10 park issues.' },
      { id: 25, name: 'Kunda Buster',         icon: Zap,           earned: catCounts.kunda >= 30,                                            desc: 'Reported 30 power/kunda issues.' },
      { id: 26, name: 'Leak Detective',       icon: Droplet,       earned: catCounts.sewerage >= 15,                                         desc: 'Reported 15 water/sewerage issues.' },
      { id: 27, name: 'Traffic Controller',   icon: Car,           earned: catCounts.traffic >= 25,                                          desc: 'Reported 25 traffic signal issues.' },
      { id: 28, name: 'Waste Warrior',        icon: Trash2,        earned: catCounts.waste >= 50,                                            desc: 'Reported 50 waste management issues.' },
      { id: 29, name: 'Clear Path',           icon: Footprints,    earned: catCounts.encroachment >= 15,                                     desc: 'Reported 15 blocked footpaths.' },
      { id: 30, name: 'Consistent Reporter',  icon: Activity,      earned: myComplaints >= 25,                                               desc: 'Reported 25 total issues.' },
      { id: 31, name: 'Avid Reporter',        icon: Activity,      earned: myComplaints >= 75,                                               desc: 'Reported 75 total issues.' },
      { id: 32, name: 'Civic Legend',         icon: Activity,      earned: myComplaints >= 150,                                              desc: 'Reported 150 total issues.' },
      { id: 33, name: 'Respected Citizen',    icon: ShieldCheck,   earned: catCounts.verifiedTotal >= 100,                                   desc: 'Received 100 verifications on your reports.' },
      { id: 34, name: 'Community Leader',     icon: ShieldCheck,   earned: catCounts.verifiedTotal >= 250,                                   desc: 'Received 250 verifications on your reports.' },
      { id: 35, name: 'Local Authority',      icon: ShieldCheck,   earned: catCounts.verifiedTotal >= 500,                                   desc: 'Received 500 verifications on your reports.' },
      { id: 36, name: 'Neighborhood Watch',   icon: Eye,           earned: unlockedSet.has(36),                                              desc: 'Verified 50 issues in your area.' },
      { id: 37, name: 'Two-Week Streak',      icon: Flame,         earned: trueStreak >= 14,                                                 desc: 'Maintained a 14-day streak.' },
      { id: 38, name: 'Fifty-Day Streak',     icon: Flame,         earned: trueStreak >= 50,                                                 desc: 'Maintained a 50-day streak.' },
      { id: 39, name: 'Pedestrian First',     icon: Footprints,    earned: catCounts.encroachment >= 5,                                      desc: 'Reported 5 blocked footpaths.' },
      { id: 40, name: 'Level 15 Reached',     icon: Crown,         earned: level >= 15,                                                      desc: 'Reached Level 15.' },
      { id: 41, name: 'Feedback Pro',         icon: MessageSquare, earned: xp >= 3000,                                                       desc: 'Earned 3,000 XP.' },
      { id: 42, name: 'Level 20 Reached',     icon: Crown,         earned: level >= 20,                                                      desc: 'Reached Level 20.' },
      { id: 43, name: 'Unstoppable',          icon: Rocket,        earned: trueStreak >= 30,                                                 desc: 'Reached a 30-day reporting streak.' },
      { id: 44, name: 'Level 30 Reached',     icon: Crown,         earned: level >= 30,                                                      desc: 'Reached Level 30.' },
      { id: 45, name: 'Patience',             icon: History,       earned: hasWait30Days,                                                    desc: 'Had a pending report for 30 days.' },
      { id: 46, name: 'Multi-Lingual',        icon: MessageSquare, earned: hasUsedMultipleLanguages,                                         desc: 'Used app in English and Urdu.' },
      { id: 47, name: 'Platinum Contributor', icon: Medal,         earned: xp >= 35000,                                                      desc: 'Earned 35,000 XP.' },
      { id: 48, name: 'Diamond Contributor',  icon: Medal,         earned: xp >= 75000,                                                      desc: 'Earned 75,000 XP.' },
      { id: 49, name: 'Photographer',         icon: Camera,        earned: myComplaints >= 50,                                               desc: 'Reported 50 issues with photos.' },
      { id: 50, name: 'Guardian',             icon: ShieldCheck,   earned: level >= 8,                                                       desc: 'Reached Level 8.' },
      { id: 51, name: 'Master Contributor',   icon: Medal,         earned: xp >= 50000,                                                      desc: 'Earned 50,000 XP.' },
      { id: 52, name: 'Century Club',         icon: CheckCircle2,  earned: myComplaints >= 100,                                              desc: 'Reported 100 issues.' },
      { id: 53, name: 'Legendary Streak',     icon: Flame,         earned: trueStreak >= 100,                                                desc: 'Maintained a 100-day streak.' },
      { id: 54, name: 'Community Pillar',     icon: ShieldCheck,   earned: unlockedSet.has(54),                                              desc: 'Verified 500 community reports.' },
      { id: 55, name: 'Elite Verifier',       icon: Shield,        earned: unlockedSet.has(55),                                              desc: 'Verified 200 local issues.' },
      { id: 56, name: 'Grandmaster',          icon: Trophy,        earned: xp >= 100000,                                                     desc: 'Earned 100,000 XP.' },
      { id: 57, name: 'Super Photographer',   icon: Camera,        earned: myComplaints >= 150,                                              desc: 'Reported 150 issues with photos.' },
      { id: 58, name: 'City Savior',          icon: Crown,         earned: level >= 25,                                                      desc: 'Reached Level 25.' },
      { id: 59, name: 'Flawless Precision',   icon: Target,        earned: myComplaints >= 200,                                              desc: 'Reported 200 pinned issues.' },
      { id: 60, name: 'Year of Service',      icon: CalendarDays,  earned: unlockedSet.has(60),                                              desc: 'Used the app for 1 year.' },
    ].map(b => ({ ...b, earned: b.earned || unlockedSet.has(b.id) }));
  // Only re-run when meaningful values change, not on every Firestore document arrival
  }, [userStats?.xp, userStats?.level, myComplaints, catCounts, trueStreak, hasWait30Days, hasUsedMultipleLanguages, unlockedSet]);

  return badges;
};
