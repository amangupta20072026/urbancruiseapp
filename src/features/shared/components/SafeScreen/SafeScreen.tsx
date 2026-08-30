import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@theme';

type Props = {
  children: React.ReactNode;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  statusBarStyle?: 'light-content' | 'dark-content';
  statusBarBackground?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  keyboardAvoiding?: boolean;
};

export const SafeScreen: React.FC<Props> = ({
  children,
  edges = ['top', 'bottom'],
  statusBarStyle = 'dark-content',
  statusBarBackground = Colors.background,
  backgroundColor = Colors.background,
  style,
  keyboardAvoiding = false,
}) => {
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const content = (
    <View style={[styles.root, { backgroundColor }, padding, style]}>
      {children}
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBackground}
        translucent={false}
      />
      {keyboardAvoiding && Platform.OS === 'ios' ? (
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
});
