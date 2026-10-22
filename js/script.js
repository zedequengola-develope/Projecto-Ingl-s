/* Languague Hours — interações do site */
(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ano automático no rodapé
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Cabeçalho: sombra ao fazer scroll e botão de voltar ao topo
  const header = $('.header');
  const backToTop = $('#backToTop');
  const updateScrollUI = () => {
    const scrolled = window.scrollY > 24;
    if (header) header.classList.toggle('scrolled', scrolled);
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 550);
  };
  updateScrollUI();
  window.addEventListener('scroll', updateScrollUI, { passive: true });
  if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
  }

  // Menu móvel, com fecho por link, Escape e clique fora
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');

  const setMenu = (open) => {
    if (!menuToggle || !navLinks) return;
    navLinks.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menuToggle.innerHTML = open
      ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    document.body.classList.toggle('menu-open', open && window.matchMedia('(max-width: 780px)').matches);
  };

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
    $$('a', navLinks).forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', event => {
      if (navLinks.classList.contains('open') &&
          !navLinks.contains(event.target) &&
          !menuToggle.contains(event.target)) setMenu(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 780) setMenu(false);
    });
  }

  // Slider do banner: fade, botões anterior/próximo, pontos e pausa inteligente
  const slides = $$('.hero-slide');
  const dots = $$('.slider-dot');
  const sliderStatus = $('#sliderStatus');
  const hero = $('.hero');
  const prevSlide = $('#prevSlide');
  const nextSlide = $('#nextSlide');
  let activeSlide = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let sliderTimer = null;
  const slideDelay = 5000;
  let sliderPaused = false;

  const showSlide = index => {
    if (!slides.length) return;
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === activeSlide));
    dots.forEach((dot, i) => {
      dot.setAttribute('aria-current', i === activeSlide ? 'true' : 'false');
    });
    if (sliderStatus) sliderStatus.textContent = `Imagem ${activeSlide + 1} de ${slides.length}`;
  };
  const stopSlider = () => {
    if (sliderTimer) window.clearInterval(sliderTimer);
    sliderTimer = null;
  };
  const startSlider = () => {
    stopSlider();
    if (!reducedMotion && !sliderPaused && slides.length > 1 && !document.hidden) {
      sliderTimer = window.setInterval(() => showSlide(activeSlide + 1), slideDelay);
    }
  };
  const moveSlide = direction => {
    showSlide(activeSlide + direction);
    startSlider();
  };

  dots.forEach(dot => dot.addEventListener('click', () => {
    const requested = Number(dot.dataset.slide);
    if (Number.isFinite(requested)) showSlide(requested);
    startSlider();
  }));
  if (prevSlide) prevSlide.addEventListener('click', () => moveSlide(-1));
  if (nextSlide) nextSlide.addEventListener('click', () => moveSlide(1));
  if (hero) {
    hero.addEventListener('mouseenter', () => { sliderPaused = true; stopSlider(); });
    hero.addEventListener('mouseleave', () => { sliderPaused = false; startSlider(); });
    hero.addEventListener('focusin', () => { sliderPaused = true; stopSlider(); });
    hero.addEventListener('focusout', event => {
      if (!hero.contains(event.relatedTarget)) { sliderPaused = false; startSlider(); }
    });
    // Em ecrãs táteis, não se depende de hover.
    hero.addEventListener('touchstart', () => { sliderPaused = true; stopSlider(); }, { passive: true });
    hero.addEventListener('touchend', () => {
      window.setTimeout(() => { sliderPaused = false; startSlider(); }, 3500);
    }, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopSlider();
    else startSlider();
  });
  showSlide(activeSlide);
  startSlider();

  // Animações de entrada, com fallback para navegadores antigos
  const revealElements = $$('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealElements.forEach((el, index) => {
      if (index % 3 === 1) el.classList.add('reveal-delay-1');
      if (index % 3 === 2) el.classList.add('reveal-delay-2');
      revealObserver.observe(el);
    });
  }

  // Filtros e pesquisa de cursos
  const courseCards = $$('.course-card');
  const filterButtons = $$('.filter-btn');
  const courseSearch = $('#courseSearch');
  const emptyCourses = $('#emptyCourses');
  let activeFilter = 'todos';

  const filterCourses = () => {
    const term = courseSearch ? courseSearch.value.trim().toLocaleLowerCase('pt') : '';
    let visibleCount = 0;
    courseCards.forEach(card => {
      const categoryMatch = activeFilter === 'todos' || card.dataset.category === activeFilter;
      const searchText = `${card.dataset.search || ''} ${card.textContent}`.toLocaleLowerCase('pt');
      const searchMatch = !term || searchText.includes(term);
      const visible = categoryMatch && searchMatch;
      card.hidden = !visible;
      if (visible) visibleCount++;
    });
    if (emptyCourses) emptyCourses.hidden = visibleCount > 0;
  };

  filterButtons.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'todos';
    filterButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    filterCourses();
  }));
  if (courseSearch) courseSearch.addEventListener('input', filterCourses);

  // Ao clicar em "Saber mais", pré-seleciona o curso no formulário
  const studentCourse = $('#studentCourse');
  $$('[data-course]').forEach(link => link.addEventListener('click', () => {
    if (studentCourse) {
      const requestedCourse = link.dataset.course;
      const option = Array.from(studentCourse.options).find(item => item.text.trim() === requestedCourse);
      if (option) studentCourse.value = option.value || option.text;
    }
  }));

  // FAQ em acordeão: mantém uma pergunta aberta de cada vez
  const faqItems = $$('.faq-item');
  faqItems.forEach(item => item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
  }));

  // Formulário: prepara o pedido e permite enviá-lo por e-mail ou WhatsApp.
  // IMPORTANTE: substitui os valores de configuração pelos contactos reais.
  const CONTACT_EMAIL = ''; // Ex.: contacto@teudominio.com
  const WHATSAPP_NUMBER = ''; // Apenas dígitos, incluindo indicativo do país. Ex.: 2449XXXXXXXX
  const enrollmentForm = $('#enrollmentForm');
  const formFeedback = $('#formFeedback');
  const sendEmail = $('#sendEmail');
  const sendWhatsApp = $('#sendWhatsApp');
  const toast = $('#toast');
  let preparedMessage = '';

  const showToast = message => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3600);
  };

  const setFeedback = (message, type = '') => {
    if (!formFeedback) return;
    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`.trim();
  };

  const getFormMessage = () => {
    const data = new FormData(enrollmentForm);
    const lines = [
      'Pedido de informação — Languague Hours',
      '',
      `Nome: ${data.get('studentName') || ''}`,
      `Telefone: ${data.get('studentPhone') || ''}`,
      `E-mail: ${data.get('studentEmail') || 'Não indicado'}`,
      `Curso pretendido: ${data.get('studentCourse') || ''}`,
      `Nível atual: ${data.get('studentLevel') || ''}`,
      `Objetivo: ${data.get('studentGoal') || 'Não indicado'}`
    ];
    return lines.join('\n');
  };

  if (enrollmentForm) {
    enrollmentForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!enrollmentForm.reportValidity()) return;
      preparedMessage = getFormMessage();
      if (sendEmail) sendEmail.disabled = false;
      if (sendWhatsApp) sendWhatsApp.disabled = false;
      setFeedback('Pedido preparado. Escolhe E-mail ou WhatsApp para enviar os dados.', 'success');
      showToast('O teu pedido está preparado para envio.');
    });
  }

  if (sendEmail) {
    sendEmail.addEventListener('click', () => {
      if (!preparedMessage) return;
      if (!CONTACT_EMAIL) {
        setFeedback('Para ativar o envio por e-mail, abre js/script.js e preenche CONTACT_EMAIL com o teu endereço real.', 'error');
        return;
      }
      const subject = encodeURIComponent('Pedido de informação — Languague Hours');
      const body = encodeURIComponent(preparedMessage);
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    });
  }

  if (sendWhatsApp) {
    sendWhatsApp.addEventListener('click', () => {
      if (!preparedMessage) return;
      const digits = WHATSAPP_NUMBER.replace(/\D/g, '');
      if (!digits) {
        setFeedback('Para ativar o WhatsApp, abre js/script.js e preenche WHATSAPP_NUMBER com o número da escola, incluindo o indicativo do país.', 'error');
        return;
      }
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(preparedMessage)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  // Links sociais ainda não configurados não levam o visitante para o topo.
  $$('[data-placeholder-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    showToast('Adiciona o endereço oficial desta rede social no ficheiro index.html.');
  }));

  // Evita erros se as imagens do slider estiverem indisponíveis; a imagem seguinte continua.
  slides.forEach(slide => slide.addEventListener('error', () => {
    slide.classList.add('image-missing');
  }));
})();
