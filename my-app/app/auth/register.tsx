import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useSignUp, useUser } from '@clerk/clerk-expo';
import { useRouter, Link } from 'expo-router';
import { API_URL } from '@/lib/apiConfig';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { user } = useUser();
  const router = useRouter();

  const [username, setUsername] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');

  // 🔁 Đồng bộ user với Strapi
  const syncWithStrapi = async (
    email: string,
    clerkUserID: string,
    username: string,
    provider = 'clerk'
  ) => {
    try {
      const res = await fetch(`${API_URL}/api/sync-clerk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, clerkUserID, username, provider }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('❌ Strapi sync failed:', text);
        Alert.alert('Sync Error', text);
      } else {
        console.log('✅ User synced successfully to Strapi');
      }
    } catch (error) {
      console.error('❌ Error syncing with Strapi:', error);
    }
  };

  // 🧾 Đăng ký tài khoản
  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (!username.trim() || !emailAddress.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill all fields.');
      return;
    }

    try {
      await signUp.create({
        username, // 👈 thêm username vào đây
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      console.error('❌ Sign Up Error:', err);
      Alert.alert('Error', err.errors?.[0]?.message || 'Unable to sign up.');
    }
  };

  // 🔐 Xác minh email
  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        console.log('✅ Verification complete!');

        // ⏳ Đợi Clerk cập nhật user sau khi setActive()
        setTimeout(async () => {
          if (user) {
            const email = user.emailAddresses[0]?.emailAddress || emailAddress;
            const finalUsername =
              String(user.username || username || email.split('@')[0]);

            await syncWithStrapi(email, user.id, finalUsername, 'clerk');
          } else {
            console.warn('⚠️ Clerk user not ready yet');
          }
          router.replace('./(tabs)');
        }, 1000);
      } else {
        console.error('⚠️ Verification incomplete:', signUpAttempt);
        Alert.alert('Verification failed', 'Please check the code.');
      }
    } catch (err: any) {
      console.error('❌ Verify Error:', err);
      Alert.alert('Error', err.errors?.[0]?.message || 'Verification failed.');
    }
  };

  // --- UI hiển thị ---
  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify your email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter verification code"
          placeholderTextColor="#888"
          onChangeText={setCode}
          value={code}
        />
        <TouchableOpacity style={styles.button} onPress={onVerifyPress}>
          <Text style={styles.buttonText}>VERIFY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#888"
        autoCapitalize="none"
        onChangeText={setUsername}
        value={username}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmailAddress}
        value={emailAddress}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />

      <TouchableOpacity style={styles.button} onPress={onSignUpPress}>
        <Text style={styles.buttonText}>SIGN UP</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Already have an account?
        <Link href="./login" style={styles.link}> Sign in</Link>
      </Text>
    </View>
  );
}

// 🎨 Styles
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
