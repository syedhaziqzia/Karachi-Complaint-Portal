// Shared design tokens for all auth screens (always light mode)
import { StyleSheet, Platform } from 'react-native';
import { Colors } from '../../theme/colors';

export const c = Colors.light;
export const AUTH_BG = require('../../assets/images/auth_bg_2.jpg');

export const authStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0ede6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Full-screen image background
  bg: {
    flex: 1,
  },

  // Full-screen frosted layout (used to be sheet)
  sheet: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  // Header (back button row)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 99,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 0,
  },

  // Form area
  formArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '600',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginBottom: 28,
  },

  // Input
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: 0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 16,
    gap: 10,
  },
  inputWrapperFocused: {
    borderWidth: 1.5,
    borderColor: '#1e4620',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 0,
    fontWeight: '600',
  },

  // Buttons
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e4620',
    shadowColor: '#1e4620',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  ghostBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e4620',
    marginTop: 10,
  },
  ghostBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e4620',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: 0.2,
  },

  // Footer link
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '700',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '800',
    color: c.primary,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: c.border,
  },
  dividerText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '700',
  },

  // Error
  errorText: {
    fontSize: 12,
    color: '#CF222E',
    marginTop: 5,
    marginLeft: 2,
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
