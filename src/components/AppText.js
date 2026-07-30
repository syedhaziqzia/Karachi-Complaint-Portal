import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export const AppText = ({ style, children, ...props }) => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  return (
    <Text 
      {...props} 
      style={[
        styles.defaultText,
        style,
        isUrdu && styles.urduText
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    // Applies system sans-serif by default
  },
  urduText: {
    fontFamily: 'NotoNastaliqUrdu', // Or 'JameelNooriNastaleeq' if you add it to assets
    lineHeight: 34, // Nastaliq fonts require extra vertical space
  }
});
