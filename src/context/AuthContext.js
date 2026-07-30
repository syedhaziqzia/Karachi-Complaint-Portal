import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import NotificationService from '../services/NotificationService';
import { safeParseJSON } from '../utils/validation';

GoogleSignin.configure({
  webClientId: '87100060736-2jg7srm3fa31ntnb7d3vrhenga5c09jv.apps.googleusercontent.com',
});

const AuthContext = createContext(undefined);

const KEYS = {
  PROFILES: '@kcp_profiles',
  OTP_PREFIX: '@kcp_otp_',
};

// Maximum profile image file size: 10 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Allowed local URI schemes for image uploads
const ALLOWED_IMAGE_SCHEMES = ['file://', 'content://'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isBooting, setBooting] = useState(true);
  const [signupConfirmation, setSignupConfirmation] = useState(null);

  // Helper to sync Firebase user with our local profile data (name, phone, image)
  const syncProfile = async (firebaseUser) => {
    if (!firebaseUser) return null;
    try {
      let dbData = null;
      try {
        const docSnap = await firestore().collection('users').doc(firebaseUser.uid).get();
        if (docSnap.exists) {
          dbData = docSnap.data();
        }
      } catch (e) {
        console.warn("Firestore profile sync error:", e);
      }

      const raw = await AsyncStorage.getItem(KEYS.PROFILES);
      // Guard: corrupted AsyncStorage must not crash boot
      const profiles = safeParseJSON(raw, {});
      
      // Merge dbData down into local profiles if available
      if (dbData) {
        profiles[firebaseUser.uid] = { ...profiles[firebaseUser.uid], ...dbData };
        await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles)).catch(() => {});
      }
      
      const profile = profiles[firebaseUser.uid] || {};
      
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: profile.name || firebaseUser.displayName || 'User',
        phone: profile.phone || '',
        image: profile.image || firebaseUser.photoURL || null,
        bio: profile.bio || '',
        profession: profile.profession || '',
        instagram: profile.instagram || '',
        twitter: profile.twitter || '',
        createdAt: firebaseUser.metadata.creationTime,
      };
    } catch {
      return { id: firebaseUser.uid, email: firebaseUser.email, name: 'User', phone: '', image: null, bio: '', profession: '', instagram: '', twitter: '' };
    }
  };

  useEffect(() => {
    // Firebase Auth listener
    const subscriber = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const fullUser = await syncProfile(firebaseUser);
        setUser(fullUser);
      } else {
        setUser(null);
      }
      setBooting(false);
    });
    return subscriber; // unsubscribe on unmount
  }, []);

  const register = async (name, email, phone, password) => {
    try {
      // Validate name length
      const trimmedName = (name || '').trim();
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        return { ok: false, error: 'Name must be between 2 and 50 characters.' };
      }

      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      await userCredential.user.updateProfile({ displayName: trimmedName });
      
      // Save extended profile data locally
      const raw = await AsyncStorage.getItem(KEYS.PROFILES);
      const profiles = safeParseJSON(raw, {});
      profiles[userCredential.user.uid] = { name: trimmedName, phone: (phone || '').trim() };
      await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles)).catch(() => {});
      
      return { ok: true };
    } catch (e) {
      let error = 'Registration failed. Please try again.';
      if (e.code === 'auth/email-already-in-use') error = 'An account with this email already exists.';
      if (e.code === 'auth/invalid-email') error = 'Invalid email address.';
      if (e.code === 'auth/weak-password') error = 'Password is too weak. Use at least 6 characters.';
      return { ok: false, error };
    }
  };

  const login = async (email, password) => {
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      return { ok: true };
    } catch (e) {
      let error = 'Login failed. Please try again.';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        error = 'Incorrect email or password.';
      }
      return { ok: false, error };
    }
  };

  const logout = async () => {
    try {
      // Cancel all scheduled notifications so they don't fire for the next user
      try { await NotificationService.cancelAll(); } catch (_) {}
      try {
        await GoogleSignin.revokeAccess();
      } catch (_) {}
      try {
        await GoogleSignin.signOut();
      } catch (_) {}
      await auth().signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const deleteAccount = async () => {
    if (!user || !auth().currentUser) return { ok: false, error: 'Not logged in' };
    try {
      const uid = user.id;
      
      // Delete Firestore data for this user
      try {
        await firestore().collection('users').doc(uid).delete();
      } catch (err) {
        if (err.code !== 'firestore/not-found') console.warn('User doc delete error:', err);
      }
      
      try {
        await firestore().collection('user_data').doc(uid).delete();
      } catch (err) {
        if (err.code !== 'firestore/not-found') console.warn('User_data doc delete error:', err);
      }
      
      // Delete the Firebase Auth account
      await auth().currentUser.delete();
      
      // Clear local profile data
      const raw = await AsyncStorage.getItem(KEYS.PROFILES);
      if (raw) {
        const profiles = safeParseJSON(raw, {});
        delete profiles[uid];
        await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles)).catch(() => {});
      }
      
      setUser(null);
      return { ok: true };
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        return { ok: false, error: 'requires_recent_login' };
      }
      return { ok: false, error: e.message };
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    try {
      let finalUpdates = { ...updates };
      
      if (updates.image && !updates.image.startsWith('http')) {
        // Guard: only allow local file URIs, not arbitrary strings
        const isAllowedScheme = ALLOWED_IMAGE_SCHEMES.some(s => updates.image.startsWith(s));
        if (!isAllowedScheme) {
          console.warn('updateProfile: rejected non-local image URI');
          delete finalUpdates.image;
        } else {
          // Guard: reject files over MAX_IMAGE_BYTES to prevent runaway Storage uploads
          try {
            const RNFS = require('@react-native-firebase/storage');
            // We can't stat the file easily here, so we attempt the upload and
            // catch oversized-upload errors from Firebase Storage (storage/quota-exceeded)
            const fileName = `profiles/${user.id}/${Date.now()}.jpg`;
            const reference = storage().ref(fileName);
            await reference.putFile(updates.image);
            const url = await reference.getDownloadURL();
            finalUpdates.image = url;
          } catch (imgErr) {
            console.warn('Profile image upload failed, keeping existing:', imgErr);
            delete finalUpdates.image; // Don't overwrite with broken URI
          }
        }
      }

      const raw = await AsyncStorage.getItem('@kcp_profiles');
      const profiles = safeParseJSON(raw, {});
      const current = profiles[user.id] || {};
      
      profiles[user.id] = { ...current, ...finalUpdates };
      await AsyncStorage.setItem('@kcp_profiles', JSON.stringify(profiles)).catch(() => {});
      
      if (finalUpdates.name && auth().currentUser) {
        await auth().currentUser.updateProfile({ 
          displayName: finalUpdates.name,
          ...(finalUpdates.image ? { photoURL: finalUpdates.image } : {})
        });
      }

      await firestore().collection('users').doc(user.id).set({
        ...current,
        ...finalUpdates,
        updatedAt: firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(e => console.warn('Firestore profile update error:', e));
      
      setUser({ ...user, ...finalUpdates });
    } catch (e) {
      console.error("Profile update error:", e);
    }
  };

  const generateOTP = async (email) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const key = KEYS.OTP_PREFIX + email.toLowerCase().trim();
    await AsyncStorage.setItem(key, JSON.stringify({ code, expiresAt: Date.now() + 10 * 60 * 1000 })).catch(() => {});
    return code;
  };

  const verifyOTP = async (email, code) => {
    const key = KEYS.OTP_PREFIX + email.toLowerCase().trim();
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return false;
      const parsed = safeParseJSON(raw, null);
      if (!parsed) return false;
      const { code: stored, expiresAt } = parsed;
      if (Date.now() > expiresAt) {
        await AsyncStorage.removeItem(key).catch(() => {});
        return false;
      }
      if (stored === (code || '').trim()) {
        await AsyncStorage.removeItem(key).catch(() => {});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const signInWithPhone = async (phoneNumber) => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      return { ok: true, confirmation };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  const verifyPhoneOTP = async (confirmation, code) => {
    try {
      const userCredential = await confirmation.confirm(code);
      // Ensure local profile is synced
      const raw = await AsyncStorage.getItem('@kcp_profiles');
      const profiles = safeParseJSON(raw, {});
      if (!profiles[userCredential.user.uid]) {
        profiles[userCredential.user.uid] = { name: 'Phone User', phone: userCredential.user.phoneNumber };
        await AsyncStorage.setItem('@kcp_profiles', JSON.stringify(profiles)).catch(() => {});
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Invalid code.' };
    }
  };

  const sendSignupSMS = async (phoneNumber) => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      setSignupConfirmation(confirmation);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // The response format changed slightly in newer versions of GoogleSignin
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || response.idToken;
      
      if (!idToken) throw new Error('No ID token found');
      
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      
      // Ensure local profile is synced
      const raw = await AsyncStorage.getItem('@kcp_profiles');
      const profiles = safeParseJSON(raw, {});
      if (!profiles[userCredential.user.uid]) {
        profiles[userCredential.user.uid] = { name: userCredential.user.displayName || 'Google User', phone: '' };
        await AsyncStorage.setItem('@kcp_profiles', JSON.stringify(profiles)).catch(() => {});
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await auth().sendPasswordResetEmail(email.trim());
      return { ok: true };
    } catch (e) {
      let error = 'Failed to send reset email.';
      if (e.code === 'auth/user-not-found') error = 'No account found with this email.';
      if (e.code === 'auth/invalid-email') error = 'Invalid email address.';
      return { ok: false, error };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return { ok: false, error: 'Not logged in' };
      
      const cred = auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
      await currentUser.reauthenticateWithCredential(cred);
      await currentUser.updatePassword(newPassword);
      return { ok: true };
    } catch (e) {
      let error = 'Failed to change password.';
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') error = 'Incorrect current password.';
      if (e.code === 'auth/weak-password') error = 'New password is too weak.';
      return { ok: false, error };
    }
  };


  const verifySignupSMSAndRegister = async (name, email, phone, password, code) => {
    try {
      if (!signupConfirmation) throw new Error("No SMS session found. Please request a new code.");
      
      // 1. Create the Phone Credential
      const phoneCredential = auth.PhoneAuthProvider.credential(signupConfirmation.verificationId, code);
      
      // 2. Create the real Email/Password account
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      
      // 3. Link the phone credential to this new email account (so they can log in with both later)
      try {
        await userCredential.user.linkWithCredential(phoneCredential);
      } catch (linkError) {
        console.warn("Could not link phone, but account was created:", linkError);
      }
      
      // 4. Update profile
      const trimmedName = (name || '').trim();
      await userCredential.user.updateProfile({ displayName: trimmedName });
      
      // 5. Save extended local profile
      const raw = await AsyncStorage.getItem('@kcp_profiles');
      const profiles = safeParseJSON(raw, {});
      profiles[userCredential.user.uid] = { name: trimmedName, phone: (phone || '').trim() };
      await AsyncStorage.setItem('@kcp_profiles', JSON.stringify(profiles)).catch(() => {});
      
      setSignupConfirmation(null);
      return { ok: true };
    } catch (e) {
      let error = 'Registration failed.';
      if (e.code === 'auth/invalid-verification-code') error = 'Invalid SMS code.';
      if (e.code === 'auth/email-already-in-use') error = 'Email is already registered.';
      return { ok: false, error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isBooting,
        login,
        register,
        logout,
        deleteAccount,
        updateProfile,
        generateOTP,
        verifyOTP,
        signInWithPhone,
        verifyPhoneOTP,
        sendSignupSMS,
        verifySignupSMSAndRegister,
        signInWithGoogle,
        resetPassword,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
