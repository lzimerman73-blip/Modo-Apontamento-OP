import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Keyboard,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  TextInput,
  Button,
  Card,
  Text,
  Appbar,
  Divider,
  Portal,
  Modal,
  Provider as PaperProvider,
  List,
} from "react-native-paper";
import { CameraView, useCameraPermissions } from "expo-camera";
import api from "../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// --- Interfaces de Tipagem ---
interface TipoMovimento {
  codigotm: string;
  textotm: string;
}

interface DadosOP {
  numero: string;
  item: string;
  sequencia: string;
  produto: string;
  descricao: string;
  qtdjaprod: string | number;
  saldo: string | number;
}

export default function ProducaoScreen({ onLogout }: any) {
  const [op, setOp] = useState("");
  const [dadosOP, setDadosOP] = useState<DadosOP | null>(null);
  const [loading, setLoading] = useState(false);
  const [tiposMov, setTiposMov] = useState<TipoMovimento[]>([]);
  const [movSelecionado, setMovSelecionado] = useState<TipoMovimento | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [qtdApontar, setQtdApontar] = useState("");
  const [qtdPerda, setQtdPerda] = useState("");

  const showModal = () => {
    Keyboard.dismiss();
    setModalVisible(true);
  };
  const hideModal = () => setModalVisible(false);

  useEffect(() => {
    const carregarTipos = async () => {
      try {
        const resp = await api.get("/api/gettipomovimento");
        if (resp.data?.dadosTM) setTiposMov(resp.data.dadosTM);
      } catch (e) {
        console.error("Erro ao carregar tipos", e);
      }
    };
    carregarTipos();
  }, []);

  const buscarOP = useCallback(
    async (opParaBuscar?: string) => {
      const valorBusca = opParaBuscar || op;
      if (!valorBusca) return Alert.alert("Atenção", "Digite ou escaneie a OP");

      setLoading(true);
      setDadosOP(null);
      try {
        const resp = await api.get(
          `/api/getordemproducao?op=${valorBusca.trim()}`,
        );
        if (resp.data?.dadosOP?.length > 0) {
          const operacao = resp.data.dadosOP[0];
          setOp(operacao.numero + operacao.item + operacao.sequencia);
          setDadosOP(operacao);
        } else {
          Alert.alert("Aviso", "OP não encontrada.");
        }
      } catch (e) {
        Alert.alert("Erro", "Falha ao buscar OP.");
      } finally {
        setLoading(false);
      }
    },
    [op],
  );

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScannerVisible(false);
    setOp(data);
    buscarOP(data);
  };

  const abrirScanner = async () => {
    Keyboard.dismiss();
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return Alert.alert("Erro", "Sem permissão de câmera");
    }
    setScannerVisible(true);
  };

  const executarOperacao = async (status: string = "APONTAMENTO") => {
    // 1. Validação comum para ambos os botões: Precisa ter uma OP carregada
    if (!dadosOP) {
      return Alert.alert("Erro", "Busque uma OP antes de prosseguir.");
    }

    // 2. Validação específica apenas para o APONTAMENTO PADRÃO
    if (status === "APONTAMENTO") {
      if (!movSelecionado || !qtdApontar) {
        return Alert.alert(
          "Erro",
          "Para apontar, preencha o Tipo de Movimento e a Quantidade.",
        );
      }
    }

    // 3. Se chegou aqui, prossegue com a chamada da API
    setLoading(true);
    try {
      // Tratamento de valores numéricos (envia 0 se estiver vazio no encerramento)
      const nQtdApontar = qtdApontar
        ? parseFloat(qtdApontar.replace(",", "."))
        : 0;
      const nQtdPerda = qtdPerda ? parseFloat(qtdPerda.replace(",", ".")) : 0;

      const response = await api.post("/api/apontaop", {
        codTM: movSelecionado?.codigotm || "",
        numeroOP: op.trim(),
        codProduto: dadosOP.produto,
        quantidade: nQtdApontar,
        qtdPerda: nQtdPerda,
        OpStatus: status,
      });

      if (response.data && response.data.code && response.data.code !== 200) {
        // Lança erro manualmente para cair no catch abaixo
        throw { response: { data: response.data } };
      }

      Alert.alert(
        "Sucesso",
        status === "ENCERRAMENTO"
          ? "OP Encerrada com Sucesso!"
          : "Apontamento Realizado!",
      );

      // Limpa os campos após o sucesso
      setOp("");
      setDadosOP(null);
      setQtdApontar("");
      setQtdPerda("");
      setMovSelecionado(null);
    } catch (err: any) {
      // O catch agora pega tanto erros de rede/HTTP quanto o erro lógico lançado acima
      const msg = err.response?.data?.message || "Falha na operação.";
      Alert.alert("Erro Protheus", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.Content
            title="Produção Protheus"
            titleStyle={styles.appTitle}
          />
          <Appbar.Action
            icon={({ size }) => (
              <MaterialCommunityIcons name="logout" size={size} color="white" />
            )}
            onPress={onLogout}
          />
        </Appbar.Header>

        {/* Modal do Scanner */}
        <Portal>
          <Modal
            visible={scannerVisible}
            onDismiss={() => setScannerVisible(false)}
            contentContainerStyle={styles.scannerModal}
          >
            <Text style={styles.scannerTitle}>
              Posicione o Código de Barras
            </Text>
            <View style={styles.cameraWrapper}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["code128", "ean13", "qr"],
                }}
              />
            </View>
            <Button
              mode="contained"
              onPress={() => setScannerVisible(false)}
              style={{ marginTop: 15 }}
            >
              CANCELAR
            </Button>
          </Modal>
        </Portal>

        {/* Modal de Tipos de Movimento */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={hideModal}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Selecione o Tipo de Movimento</Text>
            <Divider />
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}>
              {tiposMov.map((item) => (
                <View key={item.codigotm}>
                  <List.Item
                    title={`${item.codigotm} - ${item.textotm}`}
                    onPress={() => {
                      setMovSelecionado(item);
                      hideModal();
                    }}
                  />
                  <Divider />
                </View>
              ))}
            </ScrollView>
            <Button
              onPress={hideModal}
              mode="contained"
              buttonColor="#666"
              style={{ marginTop: 15 }}
            >
              FECHAR
            </Button>
          </Modal>
        </Portal>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.cardBusca}>
            <Card.Content>
              <TextInput
                label="Número da OP"
                value={op}
                onChangeText={setOp}
                mode="outlined"
                right={
                  <TextInput.Icon
                    icon="barcode-scan"
                    onPress={abrirScanner}
                    color="#255E72"
                  />
                }
              />
              <Button
                mode="contained"
                onPress={() => buscarOP()}
                loading={loading}
                buttonColor="#255E72"
                style={styles.btnBuscar}
              >
                BUSCAR OP
              </Button>
            </Card.Content>
          </Card>

          {dadosOP && (
            <Card style={styles.cardDados}>
              <Card.Content>
                <Text style={styles.produtoTexto}>
                  OP: {dadosOP.numero} / Item: {dadosOP.item} / Seq:{" "}
                  {dadosOP.sequencia}
                </Text>
                <Text style={styles.produtoDesc}>
                  {dadosOP.produto} - {dadosOP.descricao}
                </Text>

                <Divider style={styles.divider} />

                {/* --- CAMPOS RESTAURADOS: JÁ PROD E SALDO --- */}
                <View style={styles.rowInfo}>
                  <Text style={styles.labelInfo}>
                    Já Prod:{" "}
                    <Text style={styles.valorInfo}>{dadosOP.qtdjaprod}</Text>
                  </Text>
                  <Text style={styles.labelInfo}>
                    Saldo:{" "}
                    <Text style={[styles.valorInfo, { color: "red" }]}>
                      {dadosOP.saldo}
                    </Text>
                  </Text>
                </View>
                {/* ------------------------------------------ */}

                <Divider style={styles.divider} />

                <Text style={styles.labelCampo}>Tipo de Movimento:</Text>
                <TouchableOpacity
                  onPress={showModal}
                  style={styles.selectorOpener}
                >
                  <Text style={styles.selectorText}>
                    {movSelecionado
                      ? `${movSelecionado.codigotm} - ${movSelecionado.textotm}`
                      : "Toque para selecionar..."}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>

                <View style={styles.rowInputs}>
                  <TextInput
                    label="Quantidade"
                    value={qtdApontar}
                    onChangeText={setQtdApontar}
                    keyboardType="numeric"
                    mode="outlined"
                    style={[styles.inputForm, { flex: 1, marginRight: 8 }]}
                  />
                  <TextInput
                    label="Perda"
                    value={qtdPerda}
                    onChangeText={setQtdPerda}
                    keyboardType="numeric"
                    mode="outlined"
                    style={[styles.inputForm, { flex: 1 }]}
                    textColor="red"
                  />
                </View>

                <Button
                  mode="contained"
                  onPress={() => executarOperacao("APONTAMENTO")}
                  loading={loading}
                  buttonColor="#2E7D32"
                  style={styles.btnConfirmar}
                  labelStyle={styles.btnLabel}
                >
                  CONFIRMAR APONTAMENTO
                </Button>

                <Button
                  mode="contained"
                  onPress={() => executarOperacao("ENCERRAMENTO")}
                  loading={loading}
                  buttonColor="#E53935"
                  style={[styles.btnConfirmar, { marginTop: 12 }]}
                  labelStyle={styles.btnLabel}
                >
                  ENCERRAR OP
                </Button>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  appbar: { backgroundColor: "#255E72" },
  appTitle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
  },
  content: { padding: 10 },
  cardBusca: { marginBottom: 10 },
  btnBuscar: { marginTop: 10, borderRadius: 8 },
  cardDados: { backgroundColor: "white", borderRadius: 8 },
  produtoTexto: { fontSize: 14, fontWeight: "bold", color: "#444" },
  produtoDesc: { fontSize: 14, color: "#666", marginTop: 2 },
  divider: { marginVertical: 10 },
  rowInfo: { flexDirection: "row", justifyContent: "space-between" },
  labelInfo: { fontSize: 15, color: "#666" },
  valorInfo: { fontWeight: "bold", color: "#333" },
  labelCampo: { fontSize: 14, color: "#888", marginBottom: 5 },
  selectorOpener: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 4,
    marginBottom: 15,
  },
  selectorText: { flex: 1, color: "#333" },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#255E72",
  },
  rowInputs: { flexDirection: "row", marginBottom: 10 },
  inputForm: { backgroundColor: "white", height: 50 },
  btnConfirmar: { marginTop: 5, borderRadius: 8 },
  btnLabel: { fontWeight: "bold" },
  scannerModal: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  scannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#255E72",
  },
  cameraWrapper: {
    width: 280,
    height: 280,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#000",
  },
});
