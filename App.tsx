import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Provider as PaperProvider,
  ActivityIndicator,
} from "react-native-paper";
import { ModoTheme } from "./src/theme";
import { StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";
import ProducaoScreen from "./src/screens/ProducaoScreen";
import SetupScreen from "./src/screens/SetupScreen";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Stack = createStackNavigator();

export default function App() {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    const checkInitialState = async () => {
      try {
        // ✨ CÓDIGO TEMPORÁRIO PARA FORÇAR A HOMOLOGAÇÃO ✨
        await AsyncStorage.setItem("protheus_url", "http://192.168.88.140:6026/rest");
        console.log("Forçando URL para: http://192.168.88.140:6026/rest");
        // ✨ FIM DO CÓDIGO TEMPORÁRIO ✨

        // 1. Verifica se o App já foi configurado (tem a URL do Protheus)
        const protheusUrl = await AsyncStorage.getItem("protheus_url");

        if (protheusUrl) {
          setIsSetupComplete(true);

          // 2. ✨ AJUSTE AQUI: Como o token do Protheus expira, nós apagamos 
          // qualquer token antigo e garantimos que o usuário não seja logado automaticamente.
          await AsyncStorage.removeItem("protheus_access_token");
          setIsLoggedIn(false);
          setUserToken(null);

        } else {
          setIsSetupComplete(false); // Força a ir para a tela de Setup
        }
      } catch (e) {
        console.error("Erro ao checar o estado inicial:", e);
      } finally {
        setTimeout(() => setIsLoading(false), 500);
      }
    };

    checkInitialState();
  }, []);

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  const handleLoginSuccess = async (token: string) => {
    await AsyncStorage.setItem("protheus_access_token", token);
    setUserToken(token);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("protheus_access_token");
    setUserToken(null);
    setIsLoggedIn(false);
  };

  const handleResetSetup = async () => {
    await AsyncStorage.removeItem("protheus_url");
    await AsyncStorage.removeItem("empresa_codigo");
    await AsyncStorage.removeItem("empresa_nome");
    await AsyncStorage.removeItem("@empresas_cliente");
    await handleLogout();
    setIsSetupComplete(false);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating={true} color="#00D1A3" size="large" />
      </View>
    );
  }

  return (
    <PaperProvider theme={ModoTheme}>
      <StatusBar style="light" backgroundColor="#00D1A3" translucent={true} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>

            {/* Fluxo Condicional: Setup -> Login -> Produção */}

            {!isSetupComplete ? (
              // 1º Passo: Se não tem Setup, mostra a tela de Configuração
              <Stack.Screen name="Setup">
                {(props) => (
                  <SetupScreen {...props} onSetupComplete={handleSetupComplete} />
                )}
              </Stack.Screen>
            ) : isLoggedIn ? (
              // 3º Passo: Se tem Setup e está Logado, mostra a Produção
              <Stack.Screen name="Producao">
                {(props) => (
                  <ProducaoScreen
                    {...props}
                    onLogout={handleLogout}
                    token={userToken}
                  />
                )}
              </Stack.Screen>
            ) : (
              // 2º Passo: Se tem Setup mas não está logado, mostra o Login
              <Stack.Screen name="Login">
                {(props) => (
                  <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
                )}
              </Stack.Screen>
            )}

          </Stack.Navigator>
        </NavigationContainer>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});