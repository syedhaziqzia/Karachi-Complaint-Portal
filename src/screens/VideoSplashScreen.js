import React, { useState, useRef } from 'react';
import { StyleSheet, View, StatusBar, Platform, Animated } from 'react-native';
import Video from 'react-native-video';

/**
 * VideoSplashScreen - Plays the KCP animated intro video.
 * Once the video finishes (onEnd), it calls onVideoEnd to reveal the app.
 */
const VideoSplashScreen = ({ onVideoEnd }) => {
  const opacity = useRef(new Animated.Value(1)).current; // Main container opacity for fade out
  const videoOpacity = useRef(new Animated.Value(0)).current; // Video opacity for fade in

  const handleReady = () => {
    Animated.timing(videoOpacity, {
      toValue: 1,
      duration: 300, // 300ms quick fade-in avoids missing the start of the 7s video
      useNativeDriver: true,
    }).start();
  };

  const handleEnd = () => {
    // Fade out the entire splash screen before calling onVideoEnd
    Animated.timing(opacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      onVideoEnd();
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <StatusBar hidden />
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}>
        <Video
          source={require('../assets/videos/video_project_26.mp4')}
          style={styles.video}
          resizeMode="cover"
          muted={true} // Muting often helps video play more smoothly initially on some platforms
          volume={1.0}
          rate={1.0}
          hideShutterView={true}
          onEnd={handleEnd}
          onReadyForDisplay={handleReady}
          onError={(e) => {
            console.log("Video Load Error:", e);
            onVideoEnd();
          }}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Match native splash screen color to prevent black flash
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    transform: [
      { translateY: 0 },
      { translateX: 0 }  // Change this to nudge LEFT (negative number) or RIGHT (positive number)
    ],
  },
});


export default VideoSplashScreen;
