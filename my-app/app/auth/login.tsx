import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useSignIn, useUser } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import type { UserResource } from '@clerk/types'
import { StyleSheet } from 'react-native';
import { API_URL } from '@/lib/apiConfig';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { user } = useUser();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');

  // Hàm sync Clerk user sang Strapi
  const syncWithStrapi = async (clerkUser: UserResource) => {
    try {
      await fetch(`${API_URL}/api/sync-clerk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0].emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        }),
      });
    } catch (error) {
      console.error('Failed to sync Clerk user to Strapi:', error);
    }
  };

  // Xử lý đăng nhập
  const onSignInPress = async () => {
    if (!isLoaded) return;
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });

        // ⚡ user chưa có ngay lập tức -> đợi hook useUser load
        setTimeout(async () => {
          if (user) await syncWithStrapi(user);
          router.replace('/(tabs)');
        }, 1000);
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        value={emailAddress}
        onChangeText={setEmailAddress}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={onSignInPress}>
        <Text style={styles.buttonText}>LOG IN</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Don't have an account?
        <Link href="./register" style={styles.link}> Sign up</Link>
      </Text>

      <Text style={[styles.footerText, { marginTop: 8 }]}>
        Forgot your password?
        <Link href="./forgot" style={styles.link}> Reset</Link>
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
 container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FF6B00',
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
  },
  link: {
    color: '#FF6B00',
    marginLeft: 4,
  },
});