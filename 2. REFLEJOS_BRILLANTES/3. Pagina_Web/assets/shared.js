/* ============================================
   Reflejos Brillantes - JS compartido
   ============================================ */

// ---------- Navbar toggle ----------
function setupNavbar() {
  const toggle = document.querySelector('.navbar-toggle');
  const links = document.querySelector('.navbar-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });
  // Cerrar al hacer click en un link (mobile)
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

// ---------- Chatbot "Brillante" ----------
const CHATBOT_RESPONSES = [
  {
    keys: ['hola', 'hello', 'buenas', 'buenos dias', 'buenas tardes', 'saludos', 'hey'],
    reply: '¡Hola! Soy Brillante, tu asistente virtual. ¿En qué puedo ayudarte?',
  },
  {
    keys: ['producto', 'productos', 'limpiador', 'detergente', 'desinfectante', 'jabon', 'jabón'],
    reply: 'Tenemos 6 productos ecológicos: limpiador, detergente, desinfectante, limpiavidrios, pasta limpiadora y jabón de manos. Puedes verlos todos en la sección Productos.',
  },
  {
    keys: ['contacto', 'contact', 'email', 'correo', 'telefono', 'teléfono', 'llamar', 'whatsapp'],
    reply: 'Puedes escribirnos a contacto@reflejosbrillantes.com o llamarnos de L-V 8am-5pm. Visita la sección Contacto para el formulario.',
  },
  {
    keys: ['entregable', 'entregables', 'documento', 'documentos', 'gantt', 'protocolo', 'cartilla', 'portafolio', 'tarjeta'],
    reply: 'Nuestros entregables están organizados en 3 trimestres. Visita la sección Entregables para verlos. El Trimestre 1 ya está completo con 4 ventanas.',
  },
  {
    keys: ['nosotros', 'quienes', 'quiénes', 'empresa', 'mision', 'visión', 'vision', 'valores', 'fundadora', 'sara', 'laura'],
    reply: 'Somos Reflejos Brillantes S.A.S., fundada por Sara Mejía y Laura Puerta. Conoce nuestra misión, visión y valores en la sección Nosotros.',
  },
  {
    keys: ['kit', 'comprar', 'precio', 'precios', 'compra'],
    reply: 'Puedes armar tu kit ecológico en la sección Productos. ¡Elige los productos que necesites y calcula tu total!',
  },
  {
    keys: ['gracias', 'thanks', 'thank you'],
    reply: '¡De nada! Estoy aquí para ayudarte. Que tengas un día brillante.',
  },
  {
    keys: ['ubicacion', 'ubicación', 'direccion', 'dirección', 'donde', 'dónde'],
    reply: 'Estamos ubicados en Medellín, Colombia. Escríbenos para concertar una visita.',
  },
];

const DEFAULT_RESPONSE =
  'Gracias por tu mensaje. Te recomiendo revisar las secciones de la página o contactarnos directamente.';

function getBotResponse(text) {
  const t = text.toLowerCase().trim();
  for (const item of CHATBOT_RESPONSES) {
    if (item.keys.some((k) => t.includes(k))) {
      return item.reply;
    }
  }
  return DEFAULT_RESPONSE;
}

function appendMessage(container, text, who) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg chat-msg--' + who;
  msg.textContent = text;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function setupChatbot() {
  const bubble = document.getElementById('chatbotToggle');
  const win = document.getElementById('chatbotWindow');
  if (!bubble || !win) return;

  const closeBtn = win.querySelector('.chatbot-close');
  const messages = win.querySelector('.chatbot-messages');
  const input = win.querySelector('.chatbot-input input');
  const sendBtn = win.querySelector('.chatbot-input button');
  const quickBtns = win.querySelectorAll('.chatbot-quick button');

  function toggleOpen(force) {
    const willOpen = typeof force === 'boolean' ? force : !win.classList.contains('open');
    if (willOpen) {
      win.classList.add('open');
      // Mensaje inicial si está vacío
      if (messages.children.length === 0) {
        appendMessage(messages, '¡Hola! Soy Brillante, tu asistente virtual de Reflejos Brillantes. ¿En qué puedo ayudarte? 🌿', 'bot');
      }
      setTimeout(() => input && input.focus(), 100);
    } else {
      win.classList.remove('open');
    }
  }

  bubble.addEventListener('click', () => toggleOpen());
  if (closeBtn) closeBtn.addEventListener('click', () => toggleOpen(false));

  function sendUserMessage() {
    const text = (input.value || '').trim();
    if (!text) return;
    appendMessage(messages, text, 'user');
    input.value = '';
    // Respuesta con pequeño delay para simular "escribiendo..."
    setTimeout(() => {
      appendMessage(messages, getBotResponse(text), 'bot');
    }, 550);
  }

  if (sendBtn) sendBtn.addEventListener('click', sendUserMessage);
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendUserMessage();
    });
  }
  quickBtns.forEach((b) => {
    b.addEventListener('click', () => {
      const text = b.textContent;
      appendMessage(messages, text, 'user');
      setTimeout(() => {
        appendMessage(messages, getBotResponse(text), 'bot');
      }, 400);
    });
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!win.classList.contains('open')) return;
    if (win.contains(e.target) || bubble.contains(e.target)) return;
    toggleOpen(false);
  });
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  setupChatbot();
});
