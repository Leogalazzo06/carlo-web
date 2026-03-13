import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Carlo Xavi
const firebaseConfig = {
    apiKey: "AIzaSyCZSkqpGlv-gzeBH10VfJ1cpEavjUV0MAM",
    authDomain: "carlo-xavi.firebaseapp.com",
    projectId: "carlo-xavi",
    storageBucket: "carlo-xavi.firebasestorage.app",
    messagingSenderId: "1092306113916",
    appId: "1:1092306113916:web:f66b8e9e72548c723300f9"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

let productos = [];
let productosFiltrados = [];
let carrito = JSON.parse(localStorage.getItem("carlo-web")) || [];
let categoriaActual = "Todos";
let lightboxImagenes = [];
let lightboxIndex    = 0;
let varianteSeleccionada = null;

// --- NOTIFICACIONES LUXURY ---
function showToast(msj) {
    const t = document.getElementById("toast");
    t.innerHTML = `<i class="fa-solid fa-crown text-[#d4af37] mr-2"></i> ${msj}`;
    t.classList.remove("translate-y-32");
    setTimeout(() => t.classList.add("translate-y-32"), 3000);
}

// --- CARGA CON SKELETONS DARK ---
function renderSkeletons() {
    const contenedor = document.getElementById("productos-grid");
    const skeletonHTML = `
        <div class="bg-[#121212] rounded-3xl overflow-hidden border border-white/5">
            <div class="skeleton aspect-[4/5] w-full"></div>
            <div class="p-6 space-y-4">
                <div class="skeleton h-3 w-1/3 rounded"></div>
                <div class="skeleton h-6 w-3/4 rounded"></div>
                <div class="skeleton h-12 w-full rounded-full"></div>
            </div>
        </div>
    `;
    contenedor.innerHTML = skeletonHTML.repeat(4);
}

async function cargarProductos() {
    renderSkeletons();
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        productos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        productosFiltrados = [...productos];

        // Sincronizar carrito contra stock real de Firebase
        let huboSinStockNuevo = false;
        carrito = carrito.map(item => {
            const fresh = productos.find(p => p.id === item.id);
            if (!fresh) return item;
            const eraDisponible   = item.disponible !== false;
            const ahoraDisponible = fresh.disponible !== false;
            if (eraDisponible && !ahoraDisponible) huboSinStockNuevo = true;
            return { ...item, disponible: fresh.disponible };
        });
        guardarCarrito();

        if (huboSinStockNuevo) {
            showToast("Hay productos en tu carrito que ya no tienen stock");
        }

        renderProductos();
        actualizarContador();
    } catch (e) {
        console.error("Error Carlo Xavi DB:", e);
        showToast("Error al conectar con la colección");
    }
}

// --- RENDERIZADO DE PIEZAS ---
function renderProductos() {
    const contenedor = document.getElementById("productos-grid");

    if (productosFiltrados.length === 0) {
        contenedor.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <p class="text-gray-500 font-luxury font-semibold tracking-wide text-xl">No se han encontrado piezas en esta colección.</p>
            </div>`;
        return;
    }

    contenedor.innerHTML = productosFiltrados.map(p => {
        const disponible = p.disponible !== false;
        const enOferta   = p.enOferta === true;

        return `
            <div class="product-card group relative rounded-3xl overflow-hidden" onclick="verDetalles('${p.id}')">
                <div class="aspect-[4/5] overflow-hidden relative">
                    <img src="${p.imagenes[0]}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!disponible ? 'grayscale opacity-40' : ''}" loading="lazy">
                    
                    <div class="absolute top-4 left-4 flex flex-col gap-2">
                        ${enOferta ? '<span class="bg-[#d4af37] text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-xl">Limited Edition</span>' : ''}
                        ${!disponible ? '<span class="bg-white/10 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Sold Out</span>' : ''}
                    </div>
                </div>

                <div class="p-4 text-center">
                    <p class="text-[9px] text-[#d4af37] font-bold uppercase tracking-[0.3em] mb-1">${p.categoria || 'Colección'}</p>
                    <h3 class="font-luxury font-semibold text-base text-white mb-2 group-hover:text-[#d4af37] transition-colors leading-tight">${p.nombre}</h3>
                    ${disponible ? `<p class="text-white/80 font-light tracking-widest text-sm">$ ${Number(p.precio).toLocaleString('es-AR')}</p>` : `<p class="text-gray-600 font-light tracking-widest text-xs uppercase">Sin disponibilidad</p>`}
                    
                    <button class="mt-4 w-full py-2.5 rounded-full border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] group-hover:bg-[#d4af37] group-hover:text-black group-hover:border-[#d4af37] transition-all duration-500">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// --- LÓGICA DE FILTROS ---
window.filtrarCategoria = function(cat) {
    categoriaActual = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active', 'border-[#d4af37]', 'text-[#d4af37]');
        if (btn.innerText.trim() === cat) btn.classList.add('active', 'border-[#d4af37]', 'text-[#d4af37]');
    });
    aplicarFiltros();
};

function aplicarFiltros() {
    const texto = document.getElementById('buscador-principal').value.toLowerCase().trim();
    productosFiltrados = productos.filter(p => {
        const matchText = p.nombre.toLowerCase().includes(texto) || (p.categoria && p.categoria.toLowerCase().includes(texto));
        const matchCat  = (categoriaActual === "Todos") || (p.categoria === categoriaActual);
        return matchText && matchCat;
    });
    renderProductos();
}

document.getElementById('buscador-principal').addEventListener('input', aplicarFiltros);

// --- HELPER: precio + variantes + botón carrito ---
function renderPrecioVariantes(p, modo) {
    const isMobile = modo === 'mobile';
    const textoPrecioBase = isMobile ? 'text-2xl' : 'text-3xl';
    const btnPy           = isMobile ? 'py-3.5 text-xs' : 'py-5 text-sm';

    // Sin stock
    if (p.disponible === false) {
        return `
            <p class="text-gray-500 font-light tracking-widest text-xs uppercase ${isMobile ? 'mt-1' : 'mb-10'}">Producto sin stock</p>
            <button onclick="pedirSinStock('${p.id}')" class="w-full bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] ${btnPy} rounded-full font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-black transition-all shadow-xl flex items-center justify-center gap-2">
                <i class="fa-brands fa-whatsapp ${isMobile ? 'text-sm' : ''}"></i> Consultar disponibilidad
            </button>`;
    }

    // Con variantes
    if (p.variantes && p.variantes.length > 0) {
        const primeraVariante = p.variantes[0];
        const opcionesHTML = p.variantes.map((v, i) => `
            <button type="button"
                onclick="seleccionarVariante('${p.id}', '${v.nombre}', ${v.precio}, this)"
                class="variante-btn flex-1 px-3 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all
                    ${i === 0 ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]' : 'border-white/10 text-gray-400 hover:border-white/30'}"
                data-nombre="${v.nombre}" data-precio="${v.precio}">
                ${v.nombre}<br>
                <span class="font-light normal-case tracking-normal text-[10px]">$ ${Number(v.precio).toLocaleString('es-AR')}</span>
            </button>`).join('');

        return `
            <div class="${isMobile ? '' : 'mb-4'}">
                <p id="precio-display-${p.id}" class="text-white/80 font-light tracking-widest ${textoPrecioBase} ${isMobile ? '' : 'mb-2'}">
                    $ ${Number(primeraVariante.precio).toLocaleString('es-AR')}
                </p>
            </div>
            <div class="flex flex-wrap gap-2 ${isMobile ? 'mb-0' : 'mb-6'}">
                ${opcionesHTML}
            </div>
            <input type="hidden" id="variante-sel-nombre-${p.id}" value="${primeraVariante.nombre}">
            <input type="hidden" id="variante-sel-precio-${p.id}" value="${primeraVariante.precio}">
            <button id="btn-add-${p.id}" onclick="agregarCarritoConVariante('${p.id}')"
                class="w-full bg-[#d4af37] text-black ${btnPy} rounded-full font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl ${isMobile ? '' : 'mt-2'}">
                Añadir al Carrito
            </button>`;
    }

    // Sin variantes (precio simple)
    return `
        <div class="${isMobile ? '' : 'mb-10'}">
            <p class="text-white/80 font-light tracking-widest ${textoPrecioBase}">$ ${Number(p.precio).toLocaleString('es-AR')}</p>
        </div>
        <button onclick="agregarCarrito('${p.id}')"
            class="w-full bg-[#d4af37] text-black ${btnPy} rounded-full font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl">
            Añadir al Carrito
        </button>`;
}

window.seleccionarVariante = function(prodId, nombre, precio, btnEl) {
    // Actualizar display de precio
    const display = document.getElementById(`precio-display-${prodId}`);
    if (display) display.textContent = `$ ${Number(precio).toLocaleString('es-AR')}`;
    // Guardar selección
    document.getElementById(`variante-sel-nombre-${prodId}`).value = nombre;
    document.getElementById(`variante-sel-precio-${prodId}`).value = precio;
    // Resaltar botón activo
    btnEl.closest('.flex').querySelectorAll('.variante-btn').forEach(b => {
        b.classList.remove('border-[#d4af37]', 'bg-[#d4af37]/10', 'text-[#d4af37]');
        b.classList.add('border-white/10', 'text-gray-400');
    });
    btnEl.classList.add('border-[#d4af37]', 'bg-[#d4af37]/10', 'text-[#d4af37]');
    btnEl.classList.remove('border-white/10', 'text-gray-400');
};

window.agregarCarritoConVariante = function(prodId) {
    const nombre = document.getElementById(`variante-sel-nombre-${prodId}`)?.value;
    const precio = document.getElementById(`variante-sel-precio-${prodId}`)?.value;
    agregarCarrito(prodId, nombre, precio ? Number(precio) : null);
};

// --- MODAL DE DETALLES ---
window.verDetalles = function(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;

    lightboxImagenes = p.imagenes;
    lightboxIndex    = 0;

    const isMobile = window.innerWidth < 768;
    const thumbnails = p.imagenes.length > 1 ? `
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            ${p.imagenes.map(img => `
                <button onclick="cambiarImagenDetalle('${img}')" class="w-9 h-9 md:w-12 md:h-12 rounded-full border-2 border-white/10 overflow-hidden transition-all hover:border-[#d4af37]">
                    <img src="${img}" class="w-full h-full object-cover">
                </button>
            `).join('')}
        </div>` : '';

    const badges = `
        <div class="absolute top-4 left-4 flex flex-col gap-2">
            ${p.enOferta ? '<span class="bg-[#d4af37] text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-xl">Limited Edition</span>' : ''}
            ${p.disponible === false ? '<span class="bg-white/10 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Sold Out</span>' : ''}
        </div>`;

    if (isMobile) {
        // ── MÓVIL: bottom sheet ──
        document.getElementById("detalle-contenido").innerHTML = `
            <div class="relative w-full bg-[#050505] flex-shrink-0">
                <img id="main-img" src="${p.imagenes[0]}" class="w-full object-cover cursor-zoom-in" style="height: 42vh; max-height: 320px;" onclick="abrirLightbox(0)">
                ${badges}
                ${thumbnails}
                <!-- Botón ampliar -->
                <button onclick="abrirLightbox(0)" class="absolute bottom-4 right-4 w-8 h-8 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full border border-white/20 text-white/70 hover:text-white hover:bg-black/70 transition-all z-10">
                    <i class="fa-solid fa-expand text-xs"></i>
                </button>
            </div>
            <div class="flex flex-col bg-[#0a0a0a] overflow-y-auto flex-1">
                <div class="sticky top-0 z-10 bg-[#0a0a0a] flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
                    <span class="text-[#d4af37] text-[9px] font-black uppercase tracking-[0.4em]">${p.categoria}</span>
                    <button onclick="cerrarModal('modal-detalles')" class="w-8 h-8 flex items-center justify-center border border-white/15 rounded-full text-white/60 hover:text-white transition-all">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>
                <div class="px-5 py-5 flex flex-col gap-4">
                    <h2 class="font-luxury font-semibold text-white text-2xl leading-tight">${p.nombre}</h2>
                    <p class="text-white/55 font-light leading-relaxed text-sm">${p.descripcion || 'Pieza de alta calidad.'}</p>
                    ${renderPrecioVariantes(p, 'mobile')}
                    ${p.caracteristicas ? `
                    <div class="pt-4 border-t border-white/5">
                        <h4 class="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Especificaciones</h4>
                        <pre class="text-xs text-gray-500 font-sans whitespace-pre-line leading-loose">${p.caracteristicas}</pre>
                    </div>` : ''}
                </div>
            </div>
        `;
    } else {
        // ── DESKTOP: lado a lado clásico ──
        document.getElementById("detalle-contenido").innerHTML = `
            <div class="w-1/2 bg-[#050505] relative" style="min-height: 480px;">
                <img id="main-img" src="${p.imagenes[0]}" class="w-full h-full object-cover absolute inset-0 cursor-zoom-in" onclick="abrirLightbox(0)">
                ${badges}
                ${thumbnails}
                <button onclick="cerrarModal('modal-detalles')"
                        class="absolute top-5 right-5 z-50 w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full text-white/60 hover:text-white hover:bg-black/70 transition-all">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <!-- Botón ampliar -->
                <button onclick="abrirLightbox(0)" class="absolute bottom-5 right-5 z-50 w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full border border-white/20 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                    <i class="fa-solid fa-expand text-xs"></i>
                </button>
            </div>
            <div class="w-1/2 p-16 flex flex-col justify-center bg-[#0a0a0a] overflow-y-auto" style="max-height: 90vh;">
                <span class="text-[#d4af37] text-xs font-bold uppercase tracking-[0.4em] mb-4">${p.categoria}</span>
                <h2 class="text-5xl font-luxury font-semibold text-white mb-6 leading-tight">${p.nombre}</h2>
                <p class="text-white/60 font-light leading-relaxed mb-8 text-base">${p.descripcion || 'Pieza de alta calidad.'}</p>
                ${renderPrecioVariantes(p, 'desktop')}
                ${p.caracteristicas ? `
                <div class="mt-8 pt-8 border-t border-white/5">
                    <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Especificaciones</h4>
                    <pre class="text-xs text-gray-500 font-sans whitespace-pre-line leading-loose">${p.caracteristicas}</pre>
                </div>` : ''}
            </div>
        `;
    }

    document.getElementById("modal-detalles").classList.remove("hidden");
    document.body.classList.add("modal-active");
};

window.cambiarImagenDetalle = (src) => {
    const idx = lightboxImagenes.indexOf(src);
    if (idx >= 0) lightboxIndex = idx;
    const main = document.getElementById('main-img');
    main.style.opacity = 0;
    setTimeout(() => { main.src = src; main.style.opacity = 1; }, 200);
};

// --- CARRITO (CARLO-WEB) ---
// varianteNombre y variantePrecio son opcionales (solo para productos con variantes)
window.agregarCarrito = function(id, varianteNombre, variantePrecio) {
    const prod = productos.find(p => p.id === id);
    if (!prod || prod.disponible === false) return showToast("Pieza no disponible");

    // Precio efectivo: si hay variante seleccionada usa ese precio, si no usa el precio base
    const precioFinal  = variantePrecio  ? Number(variantePrecio)  : prod.precio;
    const nombreFinal  = varianteNombre  ? `${prod.nombre} — ${varianteNombre}` : prod.nombre;
    // Clave única en el carrito: id + variante (para poder tener el mismo producto en varias variantes)
    const carritoKey   = varianteNombre  ? `${id}__${varianteNombre}` : id;

    const existe = carrito.find(p => p._key === carritoKey);
    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ ...prod, nombre: nombreFinal, precio: precioFinal, _key: carritoKey, cantidad: 1 });
    }

    guardarCarrito();
    actualizarContador();
    showToast(`${nombreFinal} agregado al carrito`);
};

function guardarCarrito() {
    localStorage.setItem("carlo-web", JSON.stringify(carrito));
}

window.abrirCarrito = function() {
    const lista = document.getElementById("carrito-lista");
    let total = 0;

    document.getElementById("modal-carrito").classList.remove("hidden");
    document.body.classList.add("modal-active");

    if (!carrito.length) {
        lista.innerHTML = `
            <div class="py-20 text-center flex flex-col items-center gap-4">
                <i class="fa-solid fa-bag-shopping text-4xl text-white/10"></i>
                <p class="text-white/50 font-luxury font-semibold tracking-wide text-xl">El carrito está vacío</p>
                <p class="text-gray-600 text-xs uppercase tracking-widest">Agrega productos para comenzar</p>
            </div>`;
    } else {
        // Cruzar siempre contra la fuente de verdad: productos cargados de Firebase
        // (ya sincronizados al cargar la página en cargarProductos)
        const sinStock = carrito.filter(p => p.disponible === false);
        const hayBloqueantes = sinStock.length > 0;

        let avisoSinStock = '';
        if (hayBloqueantes) {
            const nombres = sinStock.map(p => `<strong>${p.nombre}</strong>`).join(', ');
            avisoSinStock = `
                <div class="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-2">
                    <i class="fa-solid fa-circle-exclamation text-red-400 mt-0.5 flex-shrink-0 text-base"></i>
                    <div>
                        <p class="text-red-400 text-xs font-black uppercase tracking-widest mb-1">No podés enviar el pedido</p>
                        <p class="text-red-200/60 text-xs leading-relaxed">${nombres} ${sinStock.length > 1 ? 'ya no tienen' : 'ya no tiene'} stock. Eliminá ${sinStock.length > 1 ? 'esos productos' : 'ese producto'} del carrito para continuar.</p>
                    </div>
                </div>`;
        }

        lista.innerHTML = avisoSinStock + carrito.map(p => {
            const esSinStock = p.disponible === false;
            if (!esSinStock) total += p.precio * p.cantidad;
            return `
                <div class="flex gap-3 items-center bg-white/5 p-3 rounded-2xl border ${esSinStock ? 'border-red-500/25' : 'border-white/5'}">
                    <div class="relative flex-shrink-0">
                        <img src="${p.imagenes[0]}" class="w-16 h-16 object-cover rounded-xl ${esSinStock ? 'grayscale opacity-40' : ''}">
                        ${esSinStock ? '<div class="absolute inset-0 flex items-center justify-center"><i class="fa-solid fa-ban text-red-400/80 text-xl"></i></div>' : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-luxury font-semibold text-white text-base truncate ${esSinStock ? 'line-through opacity-50' : ''}">${p.nombre}</h4>
                        ${esSinStock
                            ? `<p class="text-red-400 text-[9px] uppercase tracking-widest font-black">Sin stock — eliminá este producto</p>`
                            : `<p class="text-[#d4af37] font-bold text-sm">$ ${(p.precio * p.cantidad).toLocaleString('es-AR')}</p>`
                        }
                        <div class="flex items-center gap-3 mt-1.5">
                            <button onclick="cambiarCantidad('${p._key || p.id}', -1)" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white border border-white/10 rounded-full transition-colors ${esSinStock ? 'opacity-30 pointer-events-none' : ''}"><i class="fa-solid fa-minus text-[9px]"></i></button>
                            <span class="text-white text-sm font-bold w-4 text-center">${p.cantidad}</span>
                            <button onclick="cambiarCantidad('${p._key || p.id}', 1)" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white border border-white/10 rounded-full transition-colors ${esSinStock ? 'opacity-30 pointer-events-none' : ''}"><i class="fa-solid fa-plus text-[9px]"></i></button>
                        </div>
                    </div>
                    <button onclick="eliminarDelCarrito('${p._key || p.id}')" class="flex-shrink-0 w-7 h-7 flex items-center justify-center ${esSinStock ? 'text-red-500 bg-red-500/15 hover:bg-red-500 hover:text-white' : 'text-gray-600 hover:text-red-400 hover:bg-red-400/10'} rounded-full transition-all">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            `;
        }).join("");
    }

    // Total solo con productos disponibles
    document.getElementById("total-carrito").innerText = `$ ${total.toLocaleString('es-AR')}`;

    // Bloquear/desbloquear botón de enviar
    const btnEnviar = document.getElementById("btn-enviar-pedido");
    const hayBloqueantes2 = carrito.some(p => p.disponible === false);
    if (btnEnviar) {
        if (hayBloqueantes2) {
            btnEnviar.disabled = true;
            btnEnviar.classList.add("opacity-40", "cursor-not-allowed");
            btnEnviar.classList.remove("hover:bg-white");
            btnEnviar.title = "Eliminá los productos sin stock para poder enviar";
        } else {
            btnEnviar.disabled = false;
            btnEnviar.classList.remove("opacity-40", "cursor-not-allowed");
            btnEnviar.classList.add("hover:bg-white");
            btnEnviar.title = "";
        }
    }

    document.getElementById("modal-carrito").classList.remove("hidden");
};
// --- PEDIR SIN STOCK POR WHATSAPP ---
window.pedirSinStock = function(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    const msj = `Hola! Me interesa el siguiente producto que aparece sin stock:%0A%0A*${p.nombre}*%0A%0A¿Tienen disponibilidad o fecha estimada de reposición?`;
    window.open(`https://wa.me/5493624895445?text=${msj}`);
};

// --- LIGHTBOX DE IMÁGENES ---
window.abrirLightbox = function(index) {
    lightboxIndex = index;
    const lb = document.getElementById('lightbox');
    lb.classList.remove('hidden');
    document.body.classList.add('modal-active');
    renderLightbox();
};

window.cerrarLightbox = function() {
    document.getElementById('lightbox').classList.add('hidden');
    document.body.classList.remove('modal-active');
};

window.lightboxNav = function(dir) {
    lightboxIndex = (lightboxIndex + dir + lightboxImagenes.length) % lightboxImagenes.length;
    renderLightbox();
};

function renderLightbox() {
    document.getElementById('lb-img').src = lightboxImagenes[lightboxIndex];
    document.getElementById('lb-counter').textContent = `${lightboxIndex + 1} / ${lightboxImagenes.length}`;

    // Renderizar miniaturas
    const thumbsEl = document.getElementById('lb-thumbs');
    if (lightboxImagenes.length > 1) {
        thumbsEl.innerHTML = lightboxImagenes.map((img, i) => `
            <button onclick="abrirLightbox(${i})" class="lb-thumb w-10 h-10 rounded-lg border-2 overflow-hidden transition-all ${i === lightboxIndex ? 'border-[#d4af37]' : 'border-white/10'} hover:border-[#d4af37]">
                <img src="${img}" class="w-full h-full object-cover">
            </button>
        `).join('');
    } else {
        thumbsEl.innerHTML = '';
    }

    // Ocultar flechas si solo hay una imagen
    document.getElementById('lb-prev').classList.toggle('hidden', lightboxImagenes.length <= 1);
    document.getElementById('lb-next').classList.toggle('hidden', lightboxImagenes.length <= 1);
}

window.cambiarCantidad = (key, delta) => {
    const item = carrito.find(p => (p._key || p.id) === key);
    if (!item) return;

    if (delta === -1 && item.cantidad === 1) {
        eliminarDelCarrito(key);
        return;
    }

    item.cantidad += delta;
    if (item.cantidad <= 0) carrito = carrito.filter(p => (p._key || p.id) !== key);
    guardarCarrito(); actualizarContador(); abrirCarrito();
};

window.eliminarDelCarrito = (key) => {
    const prod = carrito.find(p => (p._key || p.id) === key);
    if (!prod) return;

    document.getElementById("confirm-nombre").textContent = prod.nombre;
    document.getElementById("confirm-img").src = prod.imagenes[0];
    document.getElementById("modal-confirmar").classList.remove("hidden");

    window._pendingDeleteId = key;
};

function actualizarContador() {
    const count = carrito.reduce((acc, p) => acc + p.cantidad, 0);
    document.getElementById("cart-count").innerText = count;
}

window.cerrarModal = (id) => {
    document.getElementById(id).classList.add("hidden");
    document.body.classList.remove("modal-active");
};

window.confirmarEliminar = () => {
    const key = window._pendingDeleteId;
    if (!key) return;
    carrito = carrito.filter(p => (p._key || p.id) !== key);
    window._pendingDeleteId = null;
    document.getElementById("modal-confirmar").classList.add("hidden");
    guardarCarrito(); actualizarContador(); abrirCarrito();
    showToast("Producto eliminado del carrito");
};

window.cancelarEliminar = () => {
    window._pendingDeleteId = null;
    document.getElementById("modal-confirmar").classList.add("hidden");
};

window.enviarWhatsApp = function() {
    if (!carrito.length) return;
    // Bloqueo de seguridad: no enviar si hay productos sin stock
    if (carrito.some(p => p.disponible === false)) {
        showToast("Eliminá los productos sin stock para continuar");
        return;
    }
    let msj = "Hola! Deseo adquirir las siguientes piezas:%0A%0A";
    let total = 0;
    carrito.forEach(p => {
        msj += `*• ${p.nombre}* (x${p.cantidad}) - $${(p.precio * p.cantidad).toLocaleString('es-AR')}%0A`;
        total += p.precio * p.cantidad;
    });
    // Nota: p.nombre ya incluye la variante en formato "Producto — Variante"
    msj += `%0A*TOTAL: $${total.toLocaleString('es-AR')}*%0A%0AAtentamente.`;
    window.open(`https://wa.me/5493624895445?text=${msj}`);
    
    // Limpieza post-venta
    carrito = [];
    guardarCarrito();
    actualizarContador();
    cerrarModal("modal-carrito");
    showToast("Pedido enviado con éxito");
};

// --- INICIO ---
cargarProductos();

// Teclado: ESC cierra modales, flechas navegan lightbox
document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightbox');
    if (!lb.classList.contains('hidden')) {
        if (e.key === 'Escape') cerrarLightbox();
        if (e.key === 'ArrowRight') lightboxNav(1);
        if (e.key === 'ArrowLeft')  lightboxNav(-1);
    }
});
