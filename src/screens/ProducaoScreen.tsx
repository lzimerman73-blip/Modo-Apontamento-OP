import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Keyboard,
  TouchableOpacity,
  Dimensions,
  Image,
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
  ActivityIndicator,
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
  produtoMP?: string;
  descricaoMP?: string;
}

// NOVA INTERFACE: Produto (Matéria-Prima)
interface ProdutoMP {
  codpro: string;
  desc: string;
}

export default function ProducaoScreen({ onLogout }: any) {
  const [op, setOp] = useState("");
  const [dadosOP, setDadosOP] = useState<DadosOP | null>(null);
  const [loading, setLoading] = useState(false);
  const [tiposMov, setTiposMov] = useState<TipoMovimento[]>([]);
  const [movSelecionado, setMovSelecionado] = useState<TipoMovimento | null>(null);

  // Estados dos Modais
  const [modalVisible, setModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Estados da Imagem
  const [modalImagemVisible, setModalImagemVisible] = useState(false);
  const [imagemBase64, setImagemBase64] = useState("");
  const [loadingImg, setLoadingImg] = useState(false);

  // NOVOS ESTADOS: Matéria Prima
  const [listaMP, setListaMP] = useState<ProdutoMP[]>([]);
  const [mpSelecionada, setMpSelecionada] = useState<ProdutoMP | null>(null);
  const [modalMPVisible, setModalMPVisible] = useState(false);
  const [loadingMP, setLoadingMP] = useState(false);
  const [buscaMP, setBuscaMP] = useState("");

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
      setMpSelecionada(null); // Reseta a MP ao buscar nova OP
      try {
        const resp = await api.get(`/api/getordemproducao?op=${valorBusca.trim()}`);
        if (resp.data?.dadosOP?.length > 0) {
          const operacao = resp.data.dadosOP[0];
          setOp(operacao.numero + operacao.item + operacao.sequencia);
          setDadosOP(operacao);

          // Preenche a MP inicial retornada pela OP (se existir)
          if (operacao.produtoMP) {
            setMpSelecionada({
              codpro: operacao.produtoMP,
              desc: operacao.descricaoMP || "Descrição indisponível",
            });
          }
        } else {
          Alert.alert("Aviso", "OP não encontrada.");
        }
      } catch (e) {
        Alert.alert("Erro", "Falha ao buscar OP.");
      } finally {
        setLoading(false);
      }
    },
    [op]
  );

  const buscarImagem = async () => {
    if (!dadosOP?.produto) return;
    setLoadingImg(true);
    setImagemBase64("");

    try {
      const resp = await api.get(`/api/getimagemproduto?produto=${dadosOP.produto.trim()}`);

      if (resp.data?.imagemBase64) {
        setImagemBase64(resp.data.imagemBase64);
        setModalImagemVisible(true);
      } else {
        Alert.alert("Aviso", "Desenho não encontrado para este produto.");
      }
    } catch (e) {
      Alert.alert("Erro", "Falha ao buscar a imagem no servidor.");
    } finally {
      setLoadingImg(false);
    }
  };

  const carregarProdutosMP = async () => {
    Keyboard.dismiss();
    setBuscaMP("");
    if (listaMP.length > 0) {
      setModalMPVisible(true);
      return;
    }

    setLoadingMP(true);
    try {
      const resp = await api.get("/api/getprodutos");

      // ✨ ADICIONE ESTA VALIDAÇÃO AQUI ✨
      let dados = resp.data;
      if (typeof dados === "string") {
        dados = JSON.parse(dados); // Converte o texto gigante em objeto
      }

      if (dados?.produtos) {
        setListaMP(dados.produtos);
        setModalMPVisible(true);
      } else {
        Alert.alert("Aviso", "Produtos não encontrados no JSON.");
      }
    } catch (e: any) {
      console.error("Erro real na conversão/busca:", e);
      Alert.alert("Erro", "Detalhe: " + (e.message || "Erro desconhecido"));
    } finally {
      setLoadingMP(false);
    }
  };

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
    if (!dadosOP) return Alert.alert("Erro", "Busque uma OP antes de prosseguir.");

    if (status === "APONTAMENTO") {
      if (!movSelecionado || !qtdApontar) {
        return Alert.alert("Erro", "Para apontar, preencha o Tipo de Movimento e a Quantidade.");
      }
    }

    setLoading(true);
    try {
      const nQtdApontar = qtdApontar ? parseFloat(qtdApontar.replace(",", ".")) : 0;
      const nQtdPerda = qtdPerda ? parseFloat(qtdPerda.replace(",", ".")) : 0;

      const response = await api.post("/api/apontaop", {
        codTM: movSelecionado?.codigotm || "",
        numeroOP: op.trim(),
        codProduto: dadosOP.produto,
        quantidade: nQtdApontar,
        qtdPerda: nQtdPerda,
        OpStatus: status,
        produtoMP: mpSelecionada?.codpro || "",
        produtoMPAntigo: dadosOP?.produtoMP || "",
      });

      if (response.data && response.data.code && response.data.code !== 200) {
        throw { response: { data: response.data } };
      }

      Alert.alert(
        "Sucesso",
        status === "ENCERRAMENTO" ? "OP Encerrada com Sucesso!" : "Apontamento Realizado!"
      );

      setOp("");
      setDadosOP(null);
      setMpSelecionada(null);
      setQtdApontar("");
      setQtdPerda("");
      setMovSelecionado(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Falha na operação.";
      Alert.alert("Erro Protheus", msg);
    } finally {
      setLoading(false);
    }
  };

  // Filtro local da lista de MP
  const listaFiltradaMP = listaMP.filter((p) =>
    p.desc.toLowerCase().includes(buscaMP.toLowerCase()) ||
    p.codpro.includes(buscaMP)
  );

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.Content title="Produção Protheus" titleStyle={styles.appTitle} />
          <Appbar.Action
            icon={({ size }) => <MaterialCommunityIcons name="logout" size={size} color="white" />}
            onPress={onLogout}
          />
        </Appbar.Header>

        <Portal>
          {/* Modal Visualizar Imagem */}
          <Modal
            visible={modalImagemVisible}
            onDismiss={() => setModalImagemVisible(false)}
            contentContainerStyle={styles.modalImagemContent}
          >
            <Text style={styles.modalTitle}>Desenho da Forma</Text>
            <Divider style={styles.divider} />

            <View style={styles.imagemWrapper}>
              {imagemBase64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${imagemBase64}` }}
                  style={styles.imagemProduto}
                  resizeMode="contain"
                />
              ) : (
                <Text>Imagem indisponível.</Text>
              )}
            </View>

            <Button
              mode="contained"
              onPress={() => setModalImagemVisible(false)}
              style={styles.btnVoltar}
              buttonColor="#255E72"
            >
              VOLTAR
            </Button>
          </Modal>

          {/* NOVO MODAL: Selecionar Matéria Prima */}
          <Modal
            visible={modalMPVisible}
            onDismiss={() => setModalMPVisible(false)}
            contentContainerStyle={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.8 }]}
          >
            <Text style={styles.modalTitle}>Trocar Matéria-Prima</Text>

            <TextInput
              label="Buscar por Código ou Descrição"
              value={buscaMP}
              onChangeText={setBuscaMP}
              mode="outlined"
              style={{ backgroundColor: "white", marginBottom: 10, height: 45 }}
              left={<TextInput.Icon icon="magnify" />}
            />

            {loadingMP ? (
              <ActivityIndicator size="large" color="#255E72" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                {listaFiltradaMP.map((p, index) => (
                  <List.Item
                    key={index}
                    title={`${p.codpro} - ${p.desc}`}
                    titleStyle={{ fontSize: 13, color: "#333" }}
                    onPress={() => {
                      setMpSelecionada(p);
                      setModalMPVisible(false);
                    }}
                    style={{ borderBottomWidth: 1, borderBottomColor: "#eee" }}
                    left={props => <List.Icon {...props} icon="cube-outline" />}
                  />
                ))}
                {listaFiltradaMP.length === 0 && (
                  <Text style={{ textAlign: "center", marginTop: 20, color: "#888" }}>
                    Nenhum produto encontrado.
                  </Text>
                )}
              </ScrollView>
            )}

            <Button
              mode="contained"
              onPress={() => setModalMPVisible(false)}
              style={styles.btnVoltar}
              buttonColor="#255E72"
            >
              CANCELAR
            </Button>
          </Modal>

          {/* MODAL: Selecionar Tipo de Movimento */}
          <Modal
            visible={modalVisible}
            onDismiss={hideModal}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Tipo de Movimento</Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              {tiposMov.map((tm, index) => (
                <List.Item
                  key={index}
                  title={`${tm.codigotm} - ${tm.textotm}`}
                  titleStyle={{ fontSize: 14, color: "#333", fontWeight: "bold" }}
                  onPress={() => {
                    setMovSelecionado(tm);
                    hideModal();
                  }}
                  style={{ borderBottomWidth: 1, borderBottomColor: "#eee" }}
                  left={props => <List.Icon {...props} icon="swap-horizontal" color="#255E72" />}
                />
              ))}
              {tiposMov.length === 0 && (
                <Text style={{ textAlign: "center", marginTop: 20, color: "#888" }}>
                  Nenhum movimento carregado.
                </Text>
              )}
            </ScrollView>

            <Button
              mode="contained"
              onPress={hideModal}
              style={styles.btnVoltar}
              buttonColor="#255E72"
            >
              CANCELAR
            </Button>
          </Modal>

        </Portal>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.cardBusca}>
            <Card.Content>
              <TextInput
                label="Número da OP"
                value={op}
                onChangeText={setOp}
                mode="outlined"
                right={<TextInput.Icon icon="barcode-scan" onPress={abrirScanner} color="#255E72" />}
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
                <View style={styles.headerProduto}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.produtoTexto}>
                      OP: {dadosOP.numero} / Item: {dadosOP.item} / Seq: {dadosOP.sequencia}
                    </Text>
                    <Text style={styles.produtoDesc}>
                      {dadosOP.produto} - {dadosOP.descricao}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.btnIconeImagem}
                    onPress={buscarImagem}
                    disabled={loadingImg}
                  >
                    {loadingImg ? (
                      <ActivityIndicator size="small" color="#255E72" />
                    ) : (
                      <MaterialCommunityIcons name="image-search" size={28} color="#255E72" />
                    )}
                    <Text style={styles.textBtnImagem}>Desenho</Text>
                  </TouchableOpacity>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.rowInfo}>
                  <Text style={styles.labelInfo}>
                    Já Prod: <Text style={styles.valorInfo}>{dadosOP.qtdjaprod}</Text>
                  </Text>
                  <Text style={styles.labelInfo}>
                    Saldo: <Text style={[styles.valorInfo, { color: "red" }]}>{dadosOP.saldo}</Text>
                  </Text>
                </View>

                <Divider style={styles.divider} />

                {/* NOVO CAMPO: Matéria-Prima Empenhada */}
                <Text style={styles.labelCampo}>Matéria-Prima Empenhada:</Text>
                <TouchableOpacity onPress={carregarProdutosMP} style={styles.selectorOpener}>
                  <Text style={styles.selectorText}>
                    {mpSelecionada
                      ? `${mpSelecionada.codpro} - ${mpSelecionada.desc}`
                      : "Carregando / Nenhuma MP vinculada"}
                  </Text>
                  <MaterialCommunityIcons name="swap-horizontal" size={24} color="#666" />
                </TouchableOpacity>

                <Text style={styles.labelCampo}>Tipo de Movimento:</Text>
                <TouchableOpacity onPress={showModal} style={styles.selectorOpener}>
                  <Text style={styles.selectorText}>
                    {movSelecionado ? `${movSelecionado.codigotm} - ${movSelecionado.textotm}` : "Toque para selecionar..."}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={24} color="#666" />
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
                  ENCERRAR OP PROD. PARCIAL
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
  headerProduto: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnIconeImagem: {
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
    marginLeft: 10,
    backgroundColor: "#eef2f5",
    borderRadius: 8,
    minWidth: 60,
  },
  textBtnImagem: {
    fontSize: 10,
    color: "#255E72",
    fontWeight: "bold",
    marginTop: 2,
  },
  modalImagemContent: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  imagemWrapper: {
    width: "100%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  imagemProduto: {
    width: "100%",
    height: "100%",
  },
  btnVoltar: {
    marginTop: 10,
    width: "100%",
    borderRadius: 8,
  },
});