// Configurações e estado da aplicação
const state = {
    githubConfig: {
        usuario: 'LucasLeitePereira',
        repositorio: 'ChatBotAtendente',
        branch: 'main',
        arquivo: 'README.md'
    },
    storeData: '',
    conversationHistory: [],
    isDataLoaded: false
};

// Carrega dados iniciais
async function loadStoreData() {
    try {
        const { usuario, repositorio, branch, arquivo } = state.githubConfig;
        const url = `https://raw.githubusercontent.com/${usuario}/${repositorio}/${branch}/${arquivo}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao carregar dados');
        
        const markdown = await response.text();
        state.storeData = marked.parse(markdown);
        
        // Inicializa histórico de conversa
        state.conversationHistory.push({
            role: "system",
            content: `Você é um atendente virtual de uma loja. 
            Use estas informações do repositório para responder às perguntas: ${state.storeData}
            Seja prestativo, educado e mantenha as respostas claras e concisas.`
        });
        
        // Habilita interface
        document.getElementById('userInput').disabled = false;
        document.getElementById('sendButton').disabled = false;
        document.getElementById('loading').style.display = 'none';
        state.isDataLoaded = true;
        
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('loading').innerHTML = 
            '⚠️ Erro ao carregar dados. Tente recarregar a página.';
    }
}

// Função principal de envio
async function sendMessage() {
    if (!state.isDataLoaded) return;

    const userInput = document.getElementById('userInput');
    const userMessage = userInput.value.trim();
    const chatHistory = document.getElementById('chatHistory');
    
    if (!userMessage) return;

    // Limpa input imediatamente
    userInput.value = '';
    
    // Adiciona mensagem do usuário
    addMessageToHistory(userMessage, 'user');
    state.conversationHistory.push({ role: 'user', content: userMessage });

    // Mostra estado de carregamento
    toggleLoading(true);

    try {
        // Envia toda a conversa para a IA
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer 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',
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'Atendente Virtual'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick:free',
                messages: state.conversationHistory
            })
        });

        const data = await response.json();
        const botResponse = data.choices[0].message.content;

        // Adiciona resposta ao histórico
        addMessageToHistory(botResponse, 'bot');
        state.conversationHistory.push({ role: 'assistant', content: botResponse });

    } catch (error) {
        console.error('Erro:', error);
        addMessageToHistory('❌ Erro ao processar sua mensagem. Tente novamente.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Funções auxiliares
function addMessageToHistory(content, type) {
    const chatHistory = document.getElementById('chatHistory');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${type}-message`;
    messageDiv.innerHTML = marked.parse(content);
    
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function toggleLoading(show) {
    const button = document.getElementById('sendButton');
    const spinner = document.getElementById('spinner');
    const loading = document.getElementById('loading');
    
    if (show) {
        button.disabled = true;
        spinner.classList.remove('d-none');
        loading.style.display = 'block';
    } else {
        button.disabled = false;
        spinner.classList.add('d-none');
        loading.style.display = 'none';
    }
}

// Event listeners
window.onload = loadStoreData;
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});