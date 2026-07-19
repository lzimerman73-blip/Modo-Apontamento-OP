import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { TextInput, Button, Title } from "react-native-paper";
import api from "../services/api";
import logo from "../assets/logo_modo.png";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface LoginScreenProps {
  onLoginSuccess: (token: string, refreshToken: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const testToken = async (user: string, pass: string) => {
    // Endpoint Protheus OAuth2
    const response = await api.post("/api/oauth2/v1/token", null, {
      params: {
        grant_type: "password",
        username: user,
        password: pass,
      },
    });
    return response.data;
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Atenção", "Preencha o usuário e a senha.");
      return;
    }

    setLoading(true);

    try {
      const data = await testToken(username, password);

      if (data.access_token) {
        onLoginSuccess(data.access_token, data.refresh_token || "");
      } else {
        throw new Error("Resposta de token inválida.");
      }
    } catch (e: any) {
      console.error("Erro de Login Detalhado:", e.response?.data || e.message);

      let msgErro = "Usuário ou senha inválidos. Verifique as credenciais.";

      if (e.message.includes("Network Error")) {
        msgErro =
          "Não foi possível conectar ao servidor Protheus. Verifique o IP/Porta.";
      }

      Alert.alert("Erro de Login", msgErro);
    } finally {
      setLoading(false);
    }
  };

  const limparEForcarSetup = async () => {
    await AsyncStorage.clear();
    alert("Dados limpos! Reinicie o aplicativo.");
  };

  return (
    <KeyboardAvoidingView
      style={styles.appContainer}
      // 'padding' é ideal para iOS, enquanto 'height' resolve o problema no Android
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />

          <View style={styles.loginBox}>
            <Title style={styles.title}>Acesso ao Sistema</Title>

            <TextInput
              label="Usuário"
              value={username}
              onChangeText={setUsername}
              disabled={loading}
              mode="outlined"
              autoCapitalize="none"
              style={styles.input}
              outlineColor="#ccc"
              activeOutlineColor="#255E72"
            />

            <TextInput
              label="Senha"
              value={password}
              onChangeText={setPassword}
              disabled={loading}
              secureTextEntry={true}
              mode="outlined"
              style={styles.input}
              outlineColor="#ccc"
              activeOutlineColor="#255E72"
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {loading ? "Autenticando..." : "Entrar"}
            </Button>

            <Button mode="text" onPress={limparEForcarSetup} textColor="red">
              Zerar Configurações (Apenas Dev)
            </Button>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  innerContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 30,
  },
  loginBox: {
    width: "100%",
    maxWidth: 400,
    padding: 30,
    borderRadius: 16,
    backgroundColor: "white",
    // Sombras para Android
    elevation: 8,
    // Sombras para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#555",
  },
  input: {
    marginBottom: 20,
    backgroundColor: "white",
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#255E72",
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default LoginScreen;
