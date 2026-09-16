// ---------------------------------------------------------
// community.js — fala com a camada de backend (api/*.php):
// chat de mensagens, cadastro de inscritos e status da live.
// Não sabe nada sobre notícias — isso é papel do app.js.
// ---------------------------------------------------------

const API_BASE = './api';
const INTERVALO_CHAT = 4000;   // verifica mensagens novas a cada 4s
const INTERVALO_LIVE = 30000;  // verifica status da live a cada 30s

// ---------- CHAT ----------

async function carregarChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  try {
    const resposta = await fetch(`${API_BASE}/chat.php`);
    if (!resposta.ok) throw new Error('Falha ao buscar mensagens');
    const mensagens = await resposta.json();

    if (mensagens.length === 0) {
      container.innerHTML = '<p class="chat-empty">Seja o primeiro a mandar uma mensagem!</p>';
      return;
    }

    const estavaNoFinal = container.scrollTop + container.clientHeight >= container.scrollHeight - 20;

    container.innerHTML = mensagens.map(m => `
      <div class="chat-msg">
        <span class="apelido">${escaparHtml(m.apelido)}:</span>
        <span>${escaparHtml(m.mensagem)}</span>
        <span class="hora">${formatarHora(m.criado_em)}</span>
      </div>
    `).join('');

    if (estavaNoFinal) container.scrollTop = container.scrollHeight;
  } catch (erro) {
    console.error('Erro ao carregar chat:', erro);
    container.innerHTML = '<p class="chat-empty">Não foi possível carregar o chat agora.</p>';
  }
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function formatarHora(dataMysql) {
  const d = new Date(dataMysql.replace(' ', 'T'));
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function iniciarFormularioChat() {
  const form = document.getElementById('chat-form');
  if (!form) return;

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const apelido = document.getElementById('chat-apelido').value.trim();
    const mensagem = document.getElementById('chat-mensagem').value.trim();
    if (!apelido || !mensagem) return;

    try {
      await fetch(`${API_BASE}/chat.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apelido, mensagem }),
      });
      document.getElementById('chat-mensagem').value = '';
      carregarChat();
    } catch (erro) {
      console.error('Erro ao enviar mensagem:', erro);
    }
  });
}

// ---------- CADASTRO DE INSCRITOS ----------

function iniciarFormularioCadastro() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  const feedback = document.getElementById('signup-feedback');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const apelido = document.getElementById('signup-apelido').value.trim();
    const tiktok = document.getElementById('signup-tiktok').value.trim();
    const aniversario = document.getElementById('signup-aniversario').value;

    feedback.textContent = 'Enviando...';
    feedback.className = 'signup-feedback';

    try {
      const resposta = await fetch(`${API_BASE}/subscribe.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apelido, tiktok, aniversario }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) throw new Error(dados.erro || 'Erro ao cadastrar');

      feedback.textContent = 'Inscrição confirmada! 🎮';
      feedback.className = 'signup-feedback sucesso';
      form.reset();
    } catch (erro) {
      feedback.textContent = erro.message;
      feedback.className = 'signup-feedback erro';
    }
  });
}

// ---------- STATUS DA LIVE ----------

async function verificarLive() {
  const dot = document.getElementById('live-dot');
  const texto = document.getElementById('live-status-texto');
  if (!dot || !texto) return;

  try {
    const resposta = await fetch(`${API_BASE}/live-status.php`);
    const dados = await resposta.json();

    if (dados.ao_vivo) {
      dot.classList.add('on-air');
      texto.textContent = 'AO VIVO AGORA';
    } else {
      dot.classList.remove('on-air');
      texto.textContent = 'offline no momento';
    }
  } catch (erro) {
    texto.textContent = 'status indisponível';
  }
}

// ---------- INICIALIZAÇÃO ----------

document.addEventListener('DOMContentLoaded', () => {
  iniciarFormularioChat();
  iniciarFormularioCadastro();

  carregarChat();
  verificarLive();

  setInterval(carregarChat, INTERVALO_CHAT);
  setInterval(verificarLive, INTERVALO_LIVE);
});
