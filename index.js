// CONFIGURAÇÃO DO SUBSTACK
const SUBSTACK_URL = 'https://apesardvoce.substack.com'; 
const SUBSTACK_RSS_FEED = `${SUBSTACK_URL}/feed`;
const RSS_API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(SUBSTACK_RSS_FEED)}`;

// BASE DE DADOS DINÂMICA
let noticiasDB = [];
let visibleNewsCount = 3;

/* ==========================================================================
   1. PAINEL DE DADOS E ESTATÍSTICAS (INTERATIVIDADE DOS CARDS)
   ========================================================================== */
function initStatsPanel() {
    const statCards = document.querySelectorAll('.stat-card[data-stat-id]');
    const detailTitle = document.getElementById('detailTitle');
    const detailDesc = document.getElementById('detailDesc');

    if (!statCards.length || !detailTitle || !detailDesc) return;

    const statsData = {
        feminicidios: {
            title: "Análise: Feminicídios no Brasil",
            desc: "Em média, 4 mulheres foram vítimas de feminicídio por dia no Brasil. Cerca de 63.6% das vítimas eram mulheres negras e a grande maioria dos crimes foi cometida por parceiros ou ex-parceiros íntimos dentro da própria residência."
        },
        agressoes: {
            title: "Análise: Violência Física e Agressões",
            desc: "Mais de 28,9 milhões de mulheres sofreram algum tipo de violência ou agressão física/psicológica nos últimos 12 meses. O pico de incidência ocorre entre mulheres de 16 a 29 anos."
        },
        frequencia: {
            title: "Análise: Prevalência Global e Nacional",
            desc: "1 em cada 3 mulheres no Brasil e no mundo já sofreu violência física ou sexual ao longo da vida. A subnotificação ainda é alta devido ao medo de retaliação e falta de apoio."
        },
        conhecidos: {
            title: "Análise: Vínculo com o Agressor",
            desc: "80% das agressões e episódios de violência doméstica são cometidos por parceiros, ex-parceiros ou pessoas conhecidas do convívio familiar, evidenciando o perigo dentro de casa."
        },
        trans_travestis: {
            title: "Análise: Vulnerabilidade Trans e Travestis",
            desc: "O Brasil lidera o ranking de assassinatos de pessoas trans no mundo. 97% das vítimas trans no país são mulheres trans e travestis, expostas à extrema vulnerabilidade social e violência de gênero."
        }
    };

    statCards.forEach((card) => {
        card.addEventListener('click', () => {
            statCards.forEach((c) => c.classList.remove('active'));
            card.classList.add('active');

            const statId = card.getAttribute('data-stat-id');
            if (statsData[statId]) {
                detailTitle.textContent = statsData[statId].title;
                detailDesc.textContent = statsData[statId].desc;
            }
        });
    });
}

/* ==========================================================================
   2. GERENCIAMENTO DE FAVORITOS & COMENTÁRIOS (localStorage)
   ========================================================================== */
function getFavoritos() {
    return JSON.parse(localStorage.getItem('news_favoritos') || '[]');
}

function toggleFavorito(id, event) {
    if (event) event.stopPropagation();
    let favoritos = getFavoritos();
    const index = favoritos.indexOf(id);
    
    if (index > -1) {
        favoritos.splice(index, 1);
    } else {
        favoritos.push(id);
    }
    
    localStorage.setItem('news_favoritos', JSON.stringify(favoritos));
    renderNoticias();
    
    const modalBtnFav = document.getElementById('modalFavBtn');
    if (modalBtnFav) {
        const isFav = favoritos.includes(id);
        modalBtnFav.innerHTML = isFav ? '❤️ Favoritado' : '🤍 Favoritar';
        modalBtnFav.classList.toggle('active', isFav);
    }
}

function getComentarios(id) {
    const comments = JSON.parse(localStorage.getItem('news_comentarios') || '{}');
    return comments[id] || [];
}

function adicionarComentario(id) {
    const inputAutor = document.getElementById('commentAuthor');
    const inputTexto = document.getElementById('commentText');
    
    const autor = inputAutor.value.trim() || 'Anônimo';
    const texto = inputTexto.value.trim();

    if (!texto) return;

    const comments = JSON.parse(localStorage.getItem('news_comentarios') || '{}');
    if (!comments[id]) comments[id] = [];

    const novoComentario = {
        autor,
        texto,
        data: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    };

    comments[id].push(novoComentario);
    localStorage.setItem('news_comentarios', JSON.stringify(comments));

    inputTexto.value = '';
    renderListaComentarios(id);
}

function renderListaComentarios(id) {
    const lista = document.getElementById('commentsList');
    if (!lista) return;

    const comentarios = getComentarios(id);

    if (comentarios.length === 0) {
        lista.innerHTML = '<p class="no-comments">Seja a primeira pessoa a comentar!</p>';
        return;
    }

    lista.innerHTML = comentarios.map(c => `
        <div class="comment-item">
            <div class="comment-header">
                <strong>${c.autor}</strong>
                <span>${c.data}</span>
            </div>
            <p>${c.texto}</p>
        </div>
    `).join('');
}

/* ==========================================================================
   3. BUSCA E RENDERIZAÇÃO DE NOTÍCIAS (SUBSTACK)
   ========================================================================== */
async function carregarNoticiasSubstack() {
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = '<p class="loading-text" style="grid-column: 1/-1; text-align: center; color: #666;">A carregar notícias do Substack...</p>';

    try {
        const response = await fetch(RSS_API_URL);
        const data = await response.json();

        if (data.status === 'ok' && data.items && data.items.length > 0) {
            noticiasDB = data.items.map((item, index) => {
                let imagemCapa = item.thumbnail || item.enclosure?.link;
                
                if (!imagemCapa) {
                    const imgMatch = item.content ? item.content.match(/<img[^>]+src="([^">]+)"/) : null;
                    imagemCapa = imgMatch ? imgMatch[1] : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600';
                }

                const dataPublicacao = new Date(item.pubDate).toLocaleDateString('pt-PT', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = item.description || item.content;
                const textoPuro = tempDiv.textContent || tempDiv.innerText || '';
                const resumoLimpo = textoPuro.substring(0, 140).trim() + '...';

                return {
                    id: index + 1,
                    categoria: item.categories && item.categories.length > 0 ? item.categories[0] : 'Notícia',
                    data: dataPublicacao,
                    titulo: item.title,
                    resumo: resumoLimpo,
                    conteudo: item.content,
                    imagem: imagemCapa,
                    linkOriginal: item.link
                };
            });

            renderNoticias();
        } else {
            throw new Error('Não foi possível obter artigos.');
        }
    } catch (error) {
        console.error('Erro no Substack:', error);
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #c2003b;">Não foi possível carregar as notícias mais recentes.</p>';
    }
}

function renderNoticias() {
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = '';

    if (noticiasDB.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhuma notícia encontrada.</p>';
        return;
    }

    const favoritos = getFavoritos();
    const noticiasParaExibir = noticiasDB.slice(0, visibleNewsCount);

    noticiasParaExibir.forEach(noticia => {
        const isFav = favoritos.includes(noticia.id);
        const comentarios = getComentarios(noticia.id);

        const card = document.createElement('article');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="news-img-wrapper">
                <img src="${noticia.imagem}" alt="${noticia.titulo}" class="news-card-img" loading="lazy">
                <button class="btn-fav-card ${isFav ? 'active' : ''}" onclick="toggleFavorito(${noticia.id}, event)" title="Favoritar">
                    ${isFav ? '❤️' : '🤍'}
                </button>
            </div>
            <div class="news-card-body">
                <span class="news-tag">${noticia.categoria}</span>
                <h3>${noticia.titulo}</h3>
                <p>${noticia.resumo}</p>
                <div class="news-card-footer">
                    <span class="news-date">${noticia.data} • 💬 ${comentarios.length}</span>
                    <button onclick="abrirNoticia(${noticia.id})" class="btn-read-more">Ler notícia completa →</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    const btnLoadMore = document.getElementById('loadMoreNews');
    if (btnLoadMore) {
        btnLoadMore.style.display = visibleNewsCount >= noticiasDB.length ? 'none' : 'inline-block';
    }
}

/* ==========================================================================
   4. MODAL DE LEITURA
   ========================================================================== */
function abrirNoticia(id) {
    const noticia = noticiasDB.find(n => n.id === id);
    if (!noticia) return;

    const favoritos = getFavoritos();
    const isFav = favoritos.includes(noticia.id);
    const modal = document.getElementById('newsModal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal-fixed" id="closeNewsModal" onclick="fecharModal()">&times;</button>
            
            <div class="modal-header-actions">
                <span class="modal-tag">${noticia.categoria}</span>
                <button id="modalFavBtn" class="btn-fav-modal ${isFav ? 'active' : ''}" onclick="toggleFavorito(${noticia.id})">
                    ${isFav ? '❤️ Favoritado' : '🤍 Favoritar'}
                </button>
            </div>

            <h2>${noticia.titulo}</h2>
            <span class="modal-date">${noticia.data}</span>
            <hr>

            <div class="modal-body">${noticia.conteudo}</div>

            <p class="original-link">
                <a href="${noticia.linkOriginal}" target="_blank" rel="noopener noreferrer">
                    Ver publicação original diretamente no Substack ↗
                </a>
            </p>

            <div class="comments-section">
                <h3>Comentários</h3>
                <div class="comment-form">
                    <input type="text" id="commentAuthor" placeholder="Seu nome (opcional)">
                    <textarea id="commentText" placeholder="Escreva o seu comentário..." rows="3"></textarea>
                    <button onclick="adicionarComentario(${noticia.id})" class="btn-submit-comment">Publicar Comentário</button>
                </div>
                <div id="commentsList" class="comments-list"></div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    renderListaComentarios(noticia.id);
}

function fecharModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

window.addEventListener('click', (e) => {
    const modal = document.getElementById('newsModal');
    if (e.target === modal) fecharModal();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
});

/* ==========================================================================
   5. CARROSSEL HERO
   ========================================================================== */
let currentHeroSlide = 0;
let heroSlides = [];
let dotsContainer = null;

function initHeroCarousel() {
    heroSlides = document.querySelectorAll('.hero-slide');
    dotsContainer = document.getElementById('heroDots');

    if (!dotsContainer || heroSlides.length === 0) return;
    
    dotsContainer.innerHTML = '';
    heroSlides.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.className = `dot ${idx === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => setHeroSlide(idx));
        dotsContainer.appendChild(dot);
    });

    const btnHeroNext = document.getElementById('heroNext');
    if (btnHeroNext) {
        btnHeroNext.onclick = () => {
            let next = (currentHeroSlide + 1) % heroSlides.length;
            setHeroSlide(next);
        };
    }

    const btnHeroPrev = document.getElementById('heroPrev');
    if (btnHeroPrev) {
        btnHeroPrev.onclick = () => {
            let prev = (currentHeroSlide - 1 + heroSlides.length) % heroSlides.length;
            setHeroSlide(prev);
        };
    }
}

function setHeroSlide(index) {
    if (heroSlides.length === 0) return;
    heroSlides[currentHeroSlide].classList.remove('active');
    if (dotsContainer && dotsContainer.children[currentHeroSlide]) {
        dotsContainer.children[currentHeroSlide].classList.remove('active');
    }
    
    currentHeroSlide = index;
    heroSlides[currentHeroSlide].classList.add('active');
    if (dotsContainer && dotsContainer.children[currentHeroSlide]) {
        dotsContainer.children[currentHeroSlide].classList.add('active');
    }
}

/* ==========================================================================
   6. MENU HAMBURGER MOBILE
   ========================================================================== */
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

/* ==========================================================================
   7. INICIALIZAÇÃO ÚNICA DA PÁGINA
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initStatsPanel();
    initHeroCarousel();
    initMobileMenu();
    carregarNoticiasSubstack();
});