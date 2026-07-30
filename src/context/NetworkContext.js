import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal, Linking, Platform } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';

const NetworkContext = createContext(undefined);

// ── Reconnect callback registry ───────────────────────────────────────────────
// Allows other modules (e.g. AppContext) to register a callback that fires
// whenever connectivity is restored after a genuine offline period. This lets
// us show missed push notifications when the user turns WiFi/data back on.
const _reconnectListeners = new Set();
export const registerReconnectListener = (fn) => {
  _reconnectListeners.add(fn);
  return () => _reconnectListeners.delete(fn);
};
const _fireReconnectListeners = () => {
  _reconnectListeners.forEach(fn => { try { fn(); } catch {} });
};

export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // State for the beautiful feature-lock modal
  const [showActionLock, setShowActionLock] = useState(false);
  // Connection type: 'wifi' | 'cellular' | 'none' | 'unknown'
  const [connectionType, setConnectionType] = useState('none');
  const connectionTypeRef = useRef('none');

  // Refs to avoid closure traps
  const isConnectedRef = useRef(true);
  const wasDisconnectedRef = useRef(false);
  // Tracks whether the disconnect-grace-period timer has FIRED and the banner is actually visible.
  // This is distinct from wasDisconnectedRef which is set by the timer callback.
  const bannerIsVisibleRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const reconnectTimer = useRef(null);
  const disconnectTimer = useRef(null);
  const bootTimer = useRef(null);
  const [canShowBanner, setCanShowBanner] = useState(false);
  const canShowBannerRef = useRef(false);
  
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useLanguage();

  // Force-hide the banner immediately (no animation delay), used for clean reconnects
  const hideBannerImmediately = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: -120,
      useNativeDriver: true,
      tension: 100,
      friction: 14,
    }).start(() => {
      bannerIsVisibleRef.current = false;
    });
  }, [slideAnim]);

  const showBanner = useCallback((show) => {
    if (show && !canShowBannerRef.current) return; // Suppress during 8.5s boot sequence
    if (show) bannerIsVisibleRef.current = true;
    Animated.spring(slideAnim, {
      toValue: show ? 0 : -120,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start(() => {
      if (!show) bannerIsVisibleRef.current = false;
    });
  }, [slideAnim]);

  useEffect(() => {
    const handleNetworkChange = (state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      // Track connection type for richer error messages
      const type = state.type ?? 'unknown';
      connectionTypeRef.current = connected ? type : 'none';
      setConnectionType(connected ? type : 'none');
      
      if (!connected && isConnectedRef.current) {
        // Just went offline — start grace-period timer before showing any UI
        isConnectedRef.current = false;
        setIsConnected(false);
        
        if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
        disconnectTimer.current = setTimeout(() => {
          // Grace period elapsed: genuinely offline (not just switching networks)
          wasDisconnectedRef.current = true;
          setWasDisconnected(true);
          setShowReconnected(false);
          showBanner(true);
          if (canShowBannerRef.current) {
            setShowActionLock(true);
          }
        }, 3000); // 3-second grace period covers WiFi↔Mobile Data handoffs
      } else if (connected && !isConnectedRef.current) {
        // Came back online
        // Cancel any pending disconnect grace-period timer immediately
        if (disconnectTimer.current) {
          clearTimeout(disconnectTimer.current);
          disconnectTimer.current = null;
        }
        
        isConnectedRef.current = true;
        setIsConnected(true);
        setShowActionLock(false);

        if (wasDisconnectedRef.current) {
          // The banner was actually shown (grace period had elapsed) — show "Back online!" briefly
          setShowReconnected(true);
          // Fire all registered reconnect listeners so other modules can act
          // on the connectivity restoration (e.g. show missed notifications).
          _fireReconnectListeners();
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(() => {
            showBanner(false);
            setTimeout(() => {
              wasDisconnectedRef.current = false;
              setWasDisconnected(false);
              setShowReconnected(false);
            }, 500); // let the hide animation finish first
          }, 3000);
        } else {
          // Grace period hadn't elapsed — this was a network switch (WiFi↔data).
          // Silently reset everything: force banner off in case it partially appeared.
          if (bannerIsVisibleRef.current) {
            hideBannerImmediately();
          }
          wasDisconnectedRef.current = false;
          setWasDisconnected(false);
          setShowReconnected(false);
        }
      } else {
        // Initial load or redundant update (both were already online/offline)
        isConnectedRef.current = connected;
        setIsConnected(connected);
        if (!connected) {
          setShowReconnected(false);
          showBanner(true);
          if (canShowBannerRef.current) {
            setShowActionLock(true);
          }
        } else {
          setShowActionLock(false);
        }
      }
    };

    NetInfo.fetch().then(handleNetworkChange);
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Suppress network banners during the 8s splash screen video
    bootTimer.current = setTimeout(() => {
      canShowBannerRef.current = true;
      setCanShowBanner(true);
      // If we boot completely offline, show it now
      if (!isConnectedRef.current) {
        showBanner(true);
        setShowActionLock(true);
      }
    }, 8500);

    return () => {
      unsubscribe();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
      if (bootTimer.current) clearTimeout(bootTimer.current);
    };
  }, [slideAnim, showBanner, hideBannerImmediately]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const state = await NetInfo.fetch();
      const connected = state.isConnected && state.isInternetReachable !== false;
      if (connected) {
        if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
        // The event listener will catch this and show "Back online!", 
        // but we can proactively update ref
        isConnectedRef.current = true;
        setIsConnected(true);
        setShowReconnected(true);
        setShowActionLock(false);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          showBanner(false);
          setTimeout(() => {
            wasDisconnectedRef.current = false;
            setWasDisconnected(false);
            setShowReconnected(false);
          }, 500);
        }, 3000);
      }
    } catch (_) {}
    setIsRetrying(false);
  };

  const requireInternet = useCallback((action) => {
    if (!isConnectedRef.current) {
      setShowActionLock(true);
    } else {
      action();
    }
  }, []);

  const bannerBg = showReconnected
    ? (isDark ? 'rgba(6, 95, 70, 0.95)' : 'rgba(16, 185, 129, 0.95)') // Green
    : (isDark ? 'rgba(153, 27, 27, 0.95)' : 'rgba(239, 68, 68, 0.95)'); // Red

  const statusText = showReconnected
    ? t('backOnline', { defaultValue: 'Back online!' })
    : t('noInternet', { defaultValue: 'You are offline' });

  return (
    <NetworkContext.Provider value={{ isConnected, requireInternet, connectionType, registerReconnectListener }}>
      {children}
      
      {/* Slide Down Floating Pill Banner */}
      <Animated.View
        style={[
          styles.banner,
          {
            transform: [{ translateY: slideAnim }],
            top: (insets.top || 20) + 10,
            backgroundColor: bannerBg,
          },
        ]}
        pointerEvents={isConnected && !wasDisconnected ? 'none' : 'auto'}
      >
        <View style={styles.bannerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <WifiOff size={16} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.bannerText}>{statusText}</Text>
          </View>

          {!isConnected && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleRetry}
              disabled={isRetrying}
              activeOpacity={0.7}
            >
              <RefreshCw
                size={14}
                color="#fff"
                style={isRetrying ? { opacity: 0.5 } : {}}
              />
              <Text style={styles.retryText}>
                {isRetrying
                  ? t('retrying', { defaultValue: 'Retrying...' })
                  : t('retry', { defaultValue: 'Retry' })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Feature Lock Modal */}
      <Modal visible={showActionLock} transparent animationType="fade" onRequestClose={() => setShowActionLock(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: '100%', backgroundColor: isDark ? '#1F2937' : '#fff', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <WifiOff size={32} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: isDark ? '#fff' : '#111827', marginBottom: 12, textAlign: 'center' }}>
              {t('noInternet', { defaultValue: 'No Internet Connection' })}
            </Text>
            <Text style={{ fontSize: 15, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center', marginBottom: 8, lineHeight: 22 }}>
              {t('internetRequired', { defaultValue: 'Please connect to Wi-Fi or Mobile Data to continue using Karachi Complaint Portal.' })}
            </Text>
            {/* Connection type hint */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
              <WifiOff size={13} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '600', flex: 1, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
                {t('checkWifiOrData', { defaultValue: 'Check your Wi-Fi or mobile data settings' })}
              </Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#10B981', width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={() => {
                setShowActionLock(false);
                handleRetry();
              }}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('retry', { defaultValue: 'Try Again' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', width: '100%', paddingVertical: 12, borderRadius: 14, alignItems: 'center', marginBottom: 8 }}
              onPress={() => {
                setShowActionLock(false);
                if (Platform.OS === 'android') {
                  Linking.sendIntent('android.settings.panel.action.INTERNET_CONNECTIVITY').catch(() => {
                    Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(() => {
                      Linking.sendIntent('android.settings.SETTINGS').catch(() => {
                        Linking.openSettings().catch(() => {});
                      });
                    });
                  });
                } else {
                  Linking.openSettings().catch(() => {});
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 14, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>{t('openNetworkSettings', { defaultValue: 'Open Network Settings' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: '100%', paddingVertical: 10, alignItems: 'center' }}
              onPress={() => setShowActionLock(false)}
            >
              <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 15, fontWeight: '700' }}>{t('gotIt', { defaultValue: 'Got it' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    width: '92%',
    borderRadius: 20,
    paddingVertical: 14,
    zIndex: 9999,
    elevation: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bannerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
