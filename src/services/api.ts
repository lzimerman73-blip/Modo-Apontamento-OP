// @ts-ignore
import axios from "axios/dist/axios.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// -------------------------------------------------------------------
// 1. INTEGRAÇÃO COM A API CENTRAL (RENDER / SUPABASE)
// -------------------------------------------------------------------
const RENDER_API_URL = "https://backend-app-vendas.onrender.com"; // Confirme se o backend é o mesmo ou se há um específico para o OP

/**
 * Função responsável por buscar a URL do Protheus baseada no código do cliente.
 * Essa função será chamada na sua primeira tela (Setup/Primeiro Acesso).
 */
export const buscarConfiguracaoCliente = async (codigoEmpresa: string) => {
  try {
    const response = await fetch(`${RENDER_API_URL}/setup/${codigoEmpresa.toUpperCase()}`);
    const dados = await response.json();

    if (dados.sucesso) {
      return dados; // Retorna { sucesso, url, nome }
    } else {
      throw new Error(dados.mensagem || "Empresa não encontrada no sistema em nuvem.");
    }
  } catch (erro) {
    console.error("Erro ao buscar configuração na nuvem:", erro);
    throw erro;
  }
};

// -------------------------------------------------------------------
// 2. CONFIGURAÇÃO DO AXIOS (PROTHEUS)
// -------------------------------------------------------------------
const api = axios.create({
  // A baseURL fixa foi REMOVIDA. O interceptor vai injetar ela dinamicamente.
  timeout: 20000, // Mantive os 20s que você já usava por segurança em redes móveis
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

/**
 * INTERCEPTOR DE REQUISIÇÃO
 * Injeta dinamicamente a URL do Protheus e o Token
 */
api.interceptors.request.use(async (config: any) => {
  try {
    // 1. Busca a URL do Protheus que o usuário salvou no 1º acesso
    const baseURLProtheus = await AsyncStorage.getItem("protheus_url");
    if (baseURLProtheus) {
      config.baseURL = baseURLProtheus;
    }

    // 2. Busca o Token de acesso
    const token = await AsyncStorage.getItem("protheus_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3. INJEÇÃO DO TENANTID
    if (!config.headers["TenantId"]) {
      // Exemplo: Fixando a filial da fábrica. 
      // Verifique com o cliente qual é o Grupo de Empresa e Filial corretos (ex: "01,01", "10,01")
      config.headers["TenantId"] = "01,01";
    }

    console.log(
      `🚀 [REQ] URL: ${config.baseURL}${config.url} | TenantId: ${config.headers["TenantId"]}`
    );

    return config;
  } catch (error) {
    return config;
  }
});

// -------------------------------------------------------------------
// 3. INTERCEPTOR DE RESPOSTA (Tratamento e Log de Erros)
// -------------------------------------------------------------------
api.interceptors.response.use(
  (response: any) => {
    // ✨ Log para investigar o que chega com sucesso
    console.log(`\n✅ [RES SUCESSO] Rota: ${response.config.url}`);

    if (response.data) {
      console.log(`📦 Chaves do JSON recebido:`, Object.keys(response.data));
      const amostra = JSON.stringify(response.data).substring(0, 300);
      console.log(`📄 Amostra dos dados: ${amostra}...\n`);
    }

    return response;
  },
  (error: any) => {
    if (error.response) {
      console.log(`🛑 [RES ERROR] Rota: ${error.response.config?.url} | Status: ${error.response.status}`);
      console.log("📄 Detalhe do Erro do Protheus:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("🛑 [RES ERROR] Erro de rede, timeout ou servidor fora do ar:", error.message);
    }

    return Promise.reject(error);
  }
);

// -------------------------------------------------------------------
// 4. SCRIPT DE DIAGNÓSTICO (Adaptado para usar a URL dinâmica)
// -------------------------------------------------------------------
export const checkConnection = async () => {
  try {
    console.log("Iniciando Diagnóstico...");

    // Verifica se a URL já foi configurada
    const baseURLProtheus = await AsyncStorage.getItem("protheus_url");
    if (!baseURLProtheus) {
      return {
        status: "FALTA_CONFIGURACAO",
        detail: "A URL do servidor não foi configurada. Realize o setup da empresa primeiro."
      };
    }

    // Tenta apenas um GET simples na raiz do REST ou em uma rota leve
    // OBS: Substitua "/api/getpedidosdetalhes..." pela rota equivalente e leve do seu App de OP
    const response = await api.get("/api/teste_de_conexao", {
      timeout: 10000,
    });
    return { status: "OK", data: response.status };
  } catch (error: any) {
    if (error.response) {
      return {
        status: "ERRO_SERVIDOR",
        detail: `O servidor respondeu, mas com erro: ${error.response.status}`,
      };
    } else if (error.request) {
      return {
        status: "ERRO_REDE",
        detail: "O celular não alcançou o servidor. Verifique se o Firewall da Cloud Totvs libera o IP ou use VPN.",
      };
    } else {
      return { status: "ERRO_DESCONHECIDO", detail: error.message };
    }
  }
};

export default api;