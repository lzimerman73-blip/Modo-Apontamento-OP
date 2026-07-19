import React, { useState } from "react";
import {
    View,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
} from "react-native";
import { TextInput, Button, Title, Avatar } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buscarConfiguracaoCliente } from "../services/api";

interface SetupScreenProps {
    // Função chamada com sucesso para o App.tsx trocar para a tela de Login
    onSetupComplete: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
    const [codigoEmpresa, setCodigoEmpresa] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSetup = async () => {
        if (!codigoEmpresa.trim()) {
            Alert.alert("Atenção", "Por favor, informe o código do ambiente/empresa.");
            return;
        }

        setLoading(true);
        console.log(`--- Iniciando Setup para a empresa: ${codigoEmpresa} ---`);

        try {
            // Chama a função da API (Render/Supabase) para buscar a URL do Protheus
            const dadosConfig = await buscarConfiguracaoCliente(codigoEmpresa);

            await AsyncStorage.clear(); // Limpa dados anteriores (evita sujeira de log antigo)

            console.log("✅ Configuração localizada com sucesso:", dadosConfig.nome);

            // Salva as configurações vitais de conexão
            await AsyncStorage.setItem("protheus_url", dadosConfig.url);
            await AsyncStorage.setItem("empresa_nome", dadosConfig.nome);
            await AsyncStorage.setItem("empresa_codigo", codigoEmpresa.toUpperCase());

            // Mantém a lógica de filiais por paridade com o SFA, 
            // mesmo que o app de OP foque apenas na filial atual
            if (dadosConfig.empresas_protheus) {
                await AsyncStorage.setItem("@empresas_cliente", String(dadosConfig.empresas_protheus));
            } else {
                await AsyncStorage.setItem("@empresas_cliente", "01");
            }

            Alert.alert(
                "Conexão Estabelecida",
                `Fábrica configurada para:\n${dadosConfig.nome}`,
                [
                    {
                        text: "AVANÇAR PARA LOGIN",
                        onPress: () => onSetupComplete(),
                    },
                ]
            );
        } catch (e: any) {
            console.error("🚨 Erro no Setup:", e.message);
            Alert.alert(
                "Falha na Conexão",
                e.message || "Não foi possível localizar este código. Verifique se o aparelho possui internet."
            );
        } finally {
            setLoading(false);
            console.log("--- Fim do processo de Setup ---");
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.appContainer}>
                    {/* Ícone atualizado para remeter à fábrica/produção (MaterialCommunityIcons) */}
                    <Avatar.Icon
                        size={100}
                        icon="factory" // Alterado de server-network para factory (opcional)
                        style={styles.iconHeader}
                        color="white"
                    />

                    <View style={styles.setupBox}>
                        <Title style={styles.title}>Configuração de Ambiente</Title>

                        <Text style={styles.subtitle}>
                            Para iniciar o apontamento, informe o código da sua unidade fabril.
                        </Text>

                        <TextInput
                            label="Código da Empresa/Fábrica"
                            value={codigoEmpresa}
                            onChangeText={setCodigoEmpresa}
                            disabled={loading}
                            mode="outlined"
                            autoCapitalize="characters"
                            style={styles.input}
                            activeOutlineColor="#255E72" // Cor padrão Totvs/Corporativa
                            placeholder="Ex: INDUST"
                        />

                        <Button
                            mode="contained"
                            onPress={handleSetup}
                            loading={loading}
                            disabled={loading}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                        >
                            SINCRONIZAR SERVIDOR
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        backgroundColor: "#f0f2f5", // Cor de fundo suave (padrão)
    },
    appContainer: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 20,
        justifyContent: "center",
    },
    iconHeader: {
        backgroundColor: "#255E72", // Tom de azul corporativo
        marginBottom: 20,
        elevation: 4
    },
    setupBox: {
        width: "100%",
        maxWidth: 400,
        padding: 25,
        borderRadius: 12,
        backgroundColor: "white",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 10,
        textAlign: "center",
        color: "#333",
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 20,
    },
    input: {
        marginBottom: 15,
        backgroundColor: "white"
    },
    button: {
        marginTop: 10,
        borderRadius: 6,
        backgroundColor: "#255E72"
    },
    buttonContent: {
        height: 50
    },
});

export default SetupScreen;