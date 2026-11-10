/* ==========================================================================
   HALİL ÖZ | ORTAK JAVASCRIPT MODÜLÜ (app.js)
   1. Çakışmasız Tek Döngülü Lenis Smooth Scroll (+ Dahili Yedek Motor)
   2. Akıllı Mıknatıslı Bölüm Ortalama (Smart Section Auto-Centering / Snapping)
   3. 3D Spline Viewer Fare Tekerleği (Wheel) Kilitlenme Önleyici
   4. GSAP ScrollTrigger Reveal, Mesh Büyüteç, Galeri, Zihin Haritası & Lightbox
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    // =========================================================================
    // 1. YUMUŞAK KAYDIRMA MOTORU (LENIS + DAHİLİ YUMUŞAK KAYDIRMA MOTORU)
    // =========================================================================
    let scroller = null;

    if (typeof Lenis !== "undefined") {
        scroller = new Lenis({
            duration: 1.15,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.5,
            infinite: false,
        });

        // DİKKAT: Sadece TEK BİR requestAnimationFrame döngüsü kullanılır.
        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
            scroller.on("scroll", ScrollTrigger.update);
        }

        function raf(time) {
            scroller.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    } else {
        // ÇEVRİMDIŞI VEYA YEREL KLASÖRDEN (file://) İNTERNETSİZ AÇILDIĞINDA
        // BİREBİR LENIS FİZİĞİYLE ÇALIŞAN DAHİLİ YUMUŞAK KAYDIRMA MOTORU
        document.documentElement.classList.add("lenis", "lenis-smooth");
        const LocalSmoothScroller = {
            targetScroll: window.scrollY,
            animatedScroll: window.scrollY,
            velocity: 0,
            isScrolling: false,
            listeners: [],
            init() {
                window.addEventListener(
                    "wheel",
                    (e) => {
                        if (e.ctrlKey) return;
                        e.preventDefault();
                        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
                        const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
                        this.isScrolling = true;
                        this.targetScroll = Math.max(0, Math.min(maxScroll, this.targetScroll + delta));
                    },
                    { passive: false }
                );
                window.addEventListener(
                    "scroll",
                    () => {
                        // Sadece kullanıcı sağdaki kaydırma çubuğunu (scrollbar) elle sürüklediğinde senkronize et
                        if (!this.isScrolling) {
                            this.animatedScroll = window.scrollY;
                            this.targetScroll = window.scrollY;
                        }
                    },
                    { passive: true }
                );
                const loop = () => {
                    const diff = this.targetScroll - this.animatedScroll;
                    if (Math.abs(diff) > 0.45) {
                        this.isScrolling = true;
                        const step = diff * 0.14;
                        this.velocity = step;
                        this.animatedScroll += step;
                        window.scrollTo(0, Math.round(this.animatedScroll));
                        this.listeners.forEach((cb) =>
                            cb({ scroll: this.animatedScroll, velocity: this.velocity })
                        );
                        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.update();
                    } else if (this.isScrolling) {
                        this.animatedScroll = this.targetScroll;
                        this.velocity = 0;
                        window.scrollTo(0, Math.round(this.animatedScroll));
                        this.isScrolling = false;
                    }
                    requestAnimationFrame(loop);
                };
                requestAnimationFrame(loop);
            },
            scrollTo(target, opts = {}) {
                let dest = 0;
                if (typeof target === "number") {
                    dest = target;
                } else if (typeof target === "string") {
                    const el = document.querySelector(target);
                    if (!el) return;
                    dest = el.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
                } else if (target && target.getBoundingClientRect) {
                    dest = target.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
                }
                const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
                this.isScrolling = true;
                this.targetScroll = Math.max(0, Math.min(maxScroll, dest));
            },
            on(evt, cb) {
                if (evt === "scroll") this.listeners.push(cb);
            },
        };
        LocalSmoothScroller.init();
        scroller = LocalSmoothScroller;
    }

    // =========================================================================
    // 2. 3D SPLINE VIEWER ÜZERİNDE FARE TEKERLEĞİ (WHEEL) GEÇİŞ SİSTEMİ
    // =========================================================================
    const showcase3d = document.querySelector(".showcase-3d");
    if (showcase3d) {
        let splinePointerTimer = null;
        showcase3d.addEventListener(
            "wheel",
            function (e) {
                const sv = showcase3d.querySelector("spline-viewer");
                if (sv) {
                    sv.style.pointerEvents = "none";
                    clearTimeout(splinePointerTimer);
                    splinePointerTimer = setTimeout(() => {
                        sv.style.pointerEvents = "auto";
                    }, 280);
                }
                e.stopPropagation();
                const syntheticWheel = new WheelEvent("wheel", {
                    deltaX: e.deltaX,
                    deltaY: e.deltaY,
                    deltaMode: e.deltaMode,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    bubbles: false,
                    cancelable: true,
                });
                window.dispatchEvent(syntheticWheel);
            },
            { capture: true, passive: true }
        );
    }

    // =========================================================================
    // 3. AKILLI MIKNATISLI BÖLÜM ORTALAMA (SMART SECTION AUTO-CENTERING)
    // =========================================================================
    function getSectionCenterTarget(el) {
        const vh = window.innerHeight;
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const height = el.offsetHeight;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

        if (height <= vh * 1.14) {
            const centered = top - (vh - height) / 2;
            return Math.max(0, Math.min(maxScroll, Math.round(centered)));
        }
        return Math.max(0, Math.min(maxScroll, Math.round(top - 20)));
    }

    const snapSections = Array.from(
        document.querySelectorAll(
            "#hero, #vizyon-ekrani, #vision-screen, #armco-projesi, #armco-project, #deneyim, #experience, #projeler, #projects, #referanslar, #references, #iletisim, #contact"
        )
    );

    let isNavScrolling = false;
    let navScrollTimer = null;
    let wheelIdleTimer = null;
    let lastWheelDir = 0;
    let accumulatedWheelDelta = 0;
    let gestureStartScrollY = window.scrollY;
    let gestureActive = false;

    function computeSnapStops() {
        const vh = window.innerHeight;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
        const stops = [];

        snapSections.forEach((sec) => {
            const rect = sec.getBoundingClientRect();
            const top = rect.top + window.scrollY;
            const height = sec.offsetHeight;

            if (height <= vh * 1.14) {
                const centerPos = Math.max(0, Math.min(maxScroll, Math.round(top - (vh - height) / 2)));
                stops.push({ y: centerPos, type: "center", el: sec });
            } else {
                const topStop = Math.max(0, Math.min(maxScroll, Math.round(top - 20)));
                const bottomStop = Math.max(topStop, Math.min(maxScroll, Math.round(top + height - vh + 45)));
                stops.push({ y: topStop, type: "range-start", rangeEnd: bottomStop, el: sec });
                if (bottomStop - topStop > vh * 0.25) {
                    stops.push({ y: bottomStop, type: "range-end", rangeStart: topStop, el: sec });
                }
            }
        });

        return stops.sort((a, b) => a.y - b.y);
    }

    function triggerSmartSnap() {
        if (window.innerWidth <= 768 || snapSections.length === 0 || isNavScrolling) return;

        const lb = document.querySelector(".lightbox-overlay.active");
        if (lb) return;

        const vh = window.innerHeight;
        const targetY =
            scroller && typeof scroller.targetScroll === "number" ? scroller.targetScroll : window.scrollY;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

        if (targetY >= maxScroll - 35 && lastWheelDir >= 0) return;

        const stops = computeSnapStops();
        if (stops.length === 0) return;

        // Çok uzun bir bölümün ortasında okuma yapılıyorsa müdahale etme
        for (const s of stops) {
            if (s.type === "range-start" && s.rangeEnd - s.y > vh * 1.15) {
                if (targetY > s.y + vh * 0.35 && targetY < s.rangeEnd - vh * 0.35) {
                    return;
                }
            }
        }

        let chosenStop = null;
        const effectiveMove = targetY - gestureStartScrollY;
        const advanceThreshold = vh * 0.14; // Ekran yüksekliğinin %14'ü kadar kaydırıldığında sonraki bölüme ortala

        if (Math.abs(effectiveMove) >= advanceThreshold || Math.abs(accumulatedWheelDelta) >= 130) {
            if (lastWheelDir > 0) {
                const nextStop = stops.find((s) => s.y > gestureStartScrollY + 45 && s.y >= targetY - vh * 0.25);
                if (nextStop && nextStop.y - targetY <= vh * 0.88) {
                    chosenStop = nextStop;
                }
            } else if (lastWheelDir < 0) {
                for (let i = stops.length - 1; i >= 0; i--) {
                    if (stops[i].y < gestureStartScrollY - 45 && stops[i].y <= targetY + vh * 0.25) {
                        if (targetY - stops[i].y <= vh * 0.88) {
                            chosenStop = stops[i];
                        }
                        break;
                    }
                }
            }
        }

        if (!chosenStop) {
            let minDist = Infinity;
            let nearest = null;
            for (const s of stops) {
                const d = Math.abs(s.y - targetY);
                if (d < minDist) {
                    minDist = d;
                    nearest = s;
                }
            }
            if (nearest && minDist <= vh * 0.28) {
                chosenStop = nearest;
            }
        }

        if (chosenStop && Math.abs(chosenStop.y - window.scrollY) > 2) {
            scroller.scrollTo(chosenStop.y, {
                duration: 0.85,
                easing: (t) => 1 - Math.pow(1 - t, 4),
            });
        }
    }

    if (snapSections.length > 0) {
        window.addEventListener(
            "wheel",
            function (e) {
                if (isNavScrolling || window.innerWidth <= 768) return;
                if (!gestureActive) {
                    gestureActive = true;
                    gestureStartScrollY =
                        scroller && typeof scroller.animatedScroll === "number"
                            ? scroller.animatedScroll
                            : window.scrollY;
                    accumulatedWheelDelta = 0;
                }
                const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
                accumulatedWheelDelta += delta;
                if (Math.abs(delta) > 1) {
                    lastWheelDir = delta > 0 ? 1 : -1;
                }

                clearTimeout(wheelIdleTimer);
                wheelIdleTimer = setTimeout(() => {
                    gestureActive = false;
                    triggerSmartSnap();
                }, 150);
            },
            { passive: true }
        );
    }

    // =========================================================================
    // 4. YÜZEN MENÜ (ANCHOR) TIKLAMALARINDA YUMUŞAK VE ORTALI GEÇİŞ
    // =========================================================================
    document.querySelectorAll('a[href*="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            const href = this.getAttribute("href");
            if (!href || href === "#") return;

            const hashIndex = href.indexOf("#");
            if (hashIndex === -1) return;

            const pathPart = href.slice(0, hashIndex);
            const hashPart = href.slice(hashIndex);

            const currentFile = window.location.pathname.split("/").pop() || "index.html";
            if (pathPart && pathPart !== currentFile && pathPart !== "./" + currentFile) {
                return;
            }

            const targetEl = document.querySelector(hashPart);
            if (!targetEl) return;

            e.preventDefault();
            clearTimeout(wheelIdleTimer);
            clearTimeout(navScrollTimer);
            isNavScrolling = true;

            const targetY = getSectionCenterTarget(targetEl);
            if (scroller && typeof scroller.scrollTo === "function") {
                scroller.scrollTo(targetY, {
                    duration: 1.15,
                    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                });
            } else {
                window.scrollTo({ top: targetY, behavior: "smooth" });
            }

            navScrollTimer = setTimeout(() => {
                isNavScrolling = false;
                gestureStartScrollY = window.scrollY;
            }, 1250);
        });
    });

    // =========================================================================
    // 5. GSAP REVEAL ANİMASYONLARI
    // =========================================================================
    const revealElements = document.querySelectorAll(".gsap-reveal");
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
        revealElements.forEach((el) => {
            gsap.to(el, {
                scrollTrigger: {
                    trigger: el,
                    start: "top 88%",
                    toggleActions: "play none none reverse",
                },
                opacity: 1,
                y: 0,
                duration: 0.9,
                ease: "power3.out",
            });
        });
        window.addEventListener("load", function () {
            ScrollTrigger.refresh();
        });
    } else {
        revealElements.forEach((el) => {
            el.style.opacity = "1";
            el.style.transform = "none";
        });
    }

    // =========================================================================
    // 6. ETKİLEŞİMLİ 3D MESH (BÜYÜTEÇ) FARE TAKİP SİSTEMİ
    // =========================================================================
    const meshBg = document.querySelector(".mesh-bg");
    if (meshBg) {
        document.addEventListener(
            "mousemove",
            function (e) {
                meshBg.style.setProperty("--mouse-x", e.clientX + "px");
                meshBg.style.setProperty("--mouse-y", e.clientY + "px");
            },
            { passive: true }
        );
    }

    // =========================================================================
    // 7. LIGHTBOX (TAM EKRAN GÖRSEL BÜYÜTME) SİSTEMİ
    // =========================================================================
    const zoomableImages = document.querySelectorAll("#mainGalleryImage, .kku-problem-image img, .zoomable-img");
    if (zoomableImages.length > 0) {
        const isEnglish = document.documentElement.lang === "en";
        const closeLabel = isEnglish ? "Close" : "Kapat";
        const defaultAlt = isEnglish ? "Engineering Detail View" : "Mühendislik Detay Görseli";

        const overlay = document.createElement("div");
        overlay.className = "lightbox-overlay";
        overlay.innerHTML = `
            <button class="lightbox-close" aria-label="${closeLabel}">&times;</button>
            <img class="lightbox-img" src="" alt="${defaultAlt}">
            <div class="lightbox-caption"></div>
        `;
        document.body.appendChild(overlay);

        const lbImg = overlay.querySelector(".lightbox-img");
        const lbCap = overlay.querySelector(".lightbox-caption");
        const lbClose = overlay.querySelector(".lightbox-close");

        function openLightbox(src, alt) {
            lbImg.src = src;
            lbImg.alt = alt || defaultAlt;
            lbCap.textContent = alt || "";
            overlay.classList.add("active");
        }

        function closeLightbox() {
            overlay.classList.remove("active");
        }

        zoomableImages.forEach((img) => {
            img.addEventListener("click", function () {
                openLightbox(this.src, this.alt);
            });
        });

        const mainBox = document.querySelector(".kku-main-img-box");
        if (mainBox) {
            mainBox.addEventListener("click", function (e) {
                if (e.target.tagName !== "IMG") {
                    const mainImg = document.getElementById("mainGalleryImage");
                    if (mainImg) openLightbox(mainImg.src, mainImg.alt);
                }
            });
        }

        lbClose.addEventListener("click", closeLightbox);
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) closeLightbox();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeLightbox();
        });
    }
});

// =========================================================================
// 8. PROJE GALERİSİ KÜÇÜK RESİM DEĞİŞTİRME & ZİHİN HARİTASI FONKSİYONLARI
// =========================================================================
function changeImage(element) {
    const mainImg = document.getElementById("mainGalleryImage");
    if (!mainImg) return;
    mainImg.src = element.src;
    if (element.alt) {
        mainImg.alt = element.alt;
    }
    const thumbs = document.querySelectorAll(".kku-thumbnails img");
    thumbs.forEach((thumb) => thumb.classList.remove("active"));
    element.classList.add("active");
}

function toggleMindmap(element) {
    if (element.classList.contains("leaf")) return;
    element.classList.toggle("open");
    const childrenContainer = element.nextElementSibling;
    if (childrenContainer && childrenContainer.classList.contains("kku-children")) {
        childrenContainer.classList.toggle("visible");
        if (typeof ScrollTrigger !== "undefined") {
            setTimeout(() => ScrollTrigger.refresh(), 420);
        }
    }
}
