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
                    <p class="text-white/80 font-light tracking-widest text-sm">$ ${Number(p.precio).toLocaleString('es-AR')}</p>
                    
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
                <img id="main-img" src="${p.imagenes[0]}" class="w-full object-cover" style="height: 42vh; max-height: 320px;">
                ${badges}
                ${thumbnails}
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
                    <p class="text-white/55 font-light leading-relaxed text-sm">"${p.descripcion || 'Pieza de alta calidad.'}"</p>
                    <div>
                        <p class="text-white/80 font-light tracking-widest text-2xl">$ ${Number(p.precio).toLocaleString('es-AR')}</p>
                        <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-1"></p>
                    </div>
                    <button onclick="agregarCarrito('${p.id}')" class="w-full bg-[#d4af37] text-black py-3.5 rounded-full font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl text-xs">
                        Añadir al Carrito
                    </button>
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
                <img id="main-img" src="${p.imagenes[0]}" class="w-full h-full object-cover absolute inset-0">
                ${badges}
                ${thumbnails}
                <button onclick="cerrarModal('modal-detalles')"
                        class="absolute top-5 right-5 z-50 w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full text-white/60 hover:text-white hover:bg-black/70 transition-all">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="w-1/2 p-16 flex flex-col justify-center bg-[#0a0a0a] overflow-y-auto" style="max-height: 90vh;">
                <span class="text-[#d4af37] text-xs font-bold uppercase tracking-[0.4em] mb-4">${p.categoria}</span>
                <h2 class="text-5xl font-luxury font-semibold text-white mb-6 leading-tight">${p.nombre}</h2>
                <p class="text-white/60 font-light leading-relaxed mb-8 text-base">"${p.descripcion || 'Pieza de alta calidad.'}"</p>
                <div class="mb-10">
                    <p class="text-white/80 font-light tracking-widest text-3xl">$ ${Number(p.precio).toLocaleString('es-AR')}</p>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest mt-2"></p>
                </div>
                <button onclick="agregarCarrito('${p.id}')" class="w-full bg-[#d4af37] text-black py-5 rounded-full font-black uppercase tracking-widest hover:bg-white transition-all shadow-2xl text-sm">
                    Añadir al Carrito
                </button>
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
    const main = document.getElementById('main-img');
    main.style.opacity = 0;
    setTimeout(() => { main.src = src; main.style.opacity = 1; }, 200);
};

// --- CARRITO (CARLO-WEB) ---
window.agregarCarrito = function(id) {
    const prod = productos.find(p => p.id === id);
    if (!prod || prod.disponible === false) return showToast("Pieza no disponible");

    const existe = carrito.find(p => p.id === id);
    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ ...prod, cantidad: 1 });
    }

    guardarCarrito();
    actualizarContador();
    showToast("Producto agregado al carrito");
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
        lista.innerHTML = carrito.map(p => {
            total += p.precio * p.cantidad;
            return `
                <div class="flex gap-3 items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                    <img src="${p.imagenes[0]}" class="w-16 h-16 object-cover rounded-xl flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-luxury font-semibold text-white text-base truncate">${p.nombre}</h4>
                        <p class="text-[#d4af37] font-bold text-sm">$ ${(p.precio * p.cantidad).toLocaleString('es-AR')}</p>
                        <div class="flex items-center gap-3 mt-1.5">
                            <button onclick="cambiarCantidad('${p.id}', -1)" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white border border-white/10 rounded-full transition-colors"><i class="fa-solid fa-minus text-[9px]"></i></button>
                            <span class="text-white text-sm font-bold w-4 text-center">${p.cantidad}</span>
                            <button onclick="cambiarCantidad('${p.id}', 1)" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white border border-white/10 rounded-full transition-colors"><i class="fa-solid fa-plus text-[9px]"></i></button>
                        </div>
                    </div>
                    <button onclick="eliminarDelCarrito('${p.id}')" class="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            `;
        }).join("");
    }

    document.getElementById("total-carrito").innerText = `$ ${total.toLocaleString('es-AR')}`;
    document.getElementById("modal-carrito").classList.remove("hidden");
};

window.cambiarCantidad = (id, delta) => {
    const item = carrito.find(p => p.id === id);
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) carrito = carrito.filter(p => p.id !== id);
    guardarCarrito(); actualizarContador(); abrirCarrito();
};

window.eliminarDelCarrito = (id) => {
    const prod = carrito.find(p => p.id === id);
    if (!prod) return;

    // Mostrar modal de confirmación
    document.getElementById("confirm-nombre").textContent = prod.nombre;
    document.getElementById("confirm-img").src = prod.imagenes[0];
    document.getElementById("modal-confirmar").classList.remove("hidden");

    // Guardar id pendiente de eliminar
    window._pendingDeleteId = id;
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
    const id = window._pendingDeleteId;
    if (!id) return;
    carrito = carrito.filter(p => p.id !== id);
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
    let msj = "Hola! Deseo adquirir las siguientes piezas:%0A%0A";
    let total = 0;
    carrito.forEach(p => {
        msj += `*• ${p.nombre}* (x${p.cantidad}) - $${(p.precio * p.cantidad).toLocaleString('es-AR')}%0A`;
        total += p.precio * p.cantidad;
    });
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
