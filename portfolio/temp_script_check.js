
  // scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:0.15});
  reveals.forEach(r=>io.observe(r));

  // phone parallax tilt
  const stage = document.getElementById('phoneStage');
  const phone = document.getElementById('phone');
  stage.addEventListener('mousemove',(e)=>{
    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - rect.left)/rect.width - 0.5;
    const y = (e.clientY - rect.top)/rect.height - 0.5;
    phone.style.transform = `rotateY(${x*22}deg) rotateX(${-y*22}deg)`;
  });
  stage.addEventListener('mouseleave',()=>{
    phone.style.transform = 'rotateY(0deg) rotateX(0deg)';
  });

  // screen slide cycle
  const slides = document.querySelectorAll('.screen-slide');
  const dots = document.querySelectorAll('#dotsNav span');
  let cur = 0;
  setInterval(()=>{
    slides[cur].classList.remove('active');
    dots[cur].classList.remove('active');
    cur = (cur+1)%slides.length;
    slides[cur].classList.add('active');
    dots[cur].classList.add('active');
  },3200);

  // personal project detail slide-in panels
  const projects = {
    sk: {
      cover: 'linear-gradient(135deg,#7F52FF,#5A3ACF)',
      eyebrow: 'VasyERP · Android',
      title: 'Self-Kiosk Appointment App',
      desc: 'A self-service kiosk app that lets customers book appointments in real time on the spot, removing manual front-desk booking entirely.',
      list: [
        '<b>Real-time scheduling</b> — live slot availability, no manual coordination needed.',
        '<b>40% less manual effort</b> — booking work shifted from staff to the kiosk itself.',
        '<b>Improved convenience</b> — customers self-serve at their own pace.'
      ],
      tags: ['Kotlin','MVVM','Firebase'],
      actions: '',
      note: ''
    },
    pc: {
      cover: 'linear-gradient(135deg,#FF6B4A,#D8492C)',
      eyebrow: 'VasyERP · Android',
      title: 'Price Checker App',
      desc: 'An in-store QR scanner that lets shoppers check product prices instantly, cutting the time staff previously spent on manual lookups.',
      list: [
        '<b>QR-based scanning</b> — point, scan, see the price.',
        '<b>50% faster lookups</b> — replaced manual price-checking with an instant scan.',
        '<b>Better shopping experience</b> — fewer queues at the help desk.'
      ],
      tags: ['Kotlin','Camera X','MVVM'],
      actions: '',
      note: ''
    },
    vo: {
      cover: 'linear-gradient(135deg,#7F52FF,#FF6B4A)',
      eyebrow: 'VasyERP · Android & iOS',
      title: 'Vorder — B2B Sales Order App',
      desc: 'A B2B sales order platform automating billing, taxation, and order workflows for over 1,000 businesses, built and shipped natively across Android and iOS.',
      list: [
        '<b>Automated billing & taxation</b> — removed manual, error-prone order entry.',
        '<b>1,000+ businesses served</b> — running in production at scale.',
        '<b>Cross-platform</b> — native builds on both Android and iOS.'
      ],
      tags: ['Android','iOS','REST API','MVVM'],
      actions: '',
      note: ''
    },
    mp: {
      cover: 'linear-gradient(135deg,#A78BFF,#7F52FF)',
      eyebrow: 'VasyERP · Android',
      title: 'mPOS Application',
      desc: 'A point-of-sale app hardened against fraudulent access with a 3-attempt account-lock mechanism, protecting 4,000+ business and international clients.',
      list: [
        '<b>3-attempt lockout</b> — cut fraudulent login attempts by 35%.',
        '<b>4,000+ businesses</b> — including international onboarding.',
        '<b>Streamlined account management</b> — fewer security vulnerabilities overall.'
      ],
      tags: ['Kotlin','Security','MVVM'],
      actions: '',
      note: ''
    },
    sh: {
      cover: 'linear-gradient(135deg,#FF6B4A,#A78BFF)',
      eyebrow: 'VasyERP · Android',
      title: 'Shrivani App',
      desc: 'A retail app with UPI payment integration and a transparent transaction history module, giving both merchants and customers a clear digital payment trail.',
      list: [
        '<b>UPI payments</b> — seamless, secure digital checkout.',
        '<b>Transaction history</b> — a transparent, always-available payment record.'
      ],
      tags: ['UPI','Razorpay','Kotlin'],
      actions: '',
      note: ''
    },
    gm2: {
      cover: 'linear-gradient(135deg,#5A3ACF,#FF6B4A)',
      eyebrow: 'VasyERP · Android',
      title: 'GrocMart — Cart & Orders',
      desc: 'Built the cart and order-management features inside the GrocMart e-commerce app using Jetpack Compose and Clean Architecture, plus led the API design in Spring Boot for GrocMart and GrocMart Owner.',
      list: [
        '<b>Jetpack Compose UI</b> — smooth cart and checkout experience.',
        '<b>Clean Architecture</b> — maintainable, testable feature layer.',
        '<b>API design</b> — led and deployed Spring Boot services for both apps.'
      ],
      tags: ['Compose','Clean Architecture','Spring Boot'],
      actions: '',
      note: ''
    },
    pt: {
      cover: 'linear-gradient(135deg,#7F52FF,#A78BFF)',
      eyebrow: 'Plova Infotech · Flutter',
      title: 'Plova Tiles',
      desc: 'A cross-platform Flutter app streamlining sales, purchase, and payment workflows with Razorpay integration, plus faster GST and Aadhaar-based onboarding.',
      list: [
        '<b>Cross-platform Flutter</b> — one codebase, Android and iOS.',
        '<b>Razorpay integration</b> — secure, seamless transactions.',
        '<b>Faster onboarding</b> — GST and Aadhaar-based flows.',
        '<b>Credit-based insights</b> — business-facing financial visibility.'
      ],
      tags: ['Flutter','Razorpay','Cross-platform'],
      actions: '',
      note: ''
    },
    ft: {
      cover: 'linear-gradient(135deg,#D8492C,#7F52FF)',
      eyebrow: 'Enjay IT Solutions · Android',
      title: 'Fitness App',
      desc: 'A full-fledged fitness tracker built during my internship, with activity-tracking features designed to improve day-to-day user engagement.',
      list: [
        '<b>Activity tracking</b> — logs daily fitness activity.',
        '<b>Room DB & Firebase</b> — Realtime DB, Storage, and Auth for secure local + cloud data handling.',
        '<b>Kotlin/XML UI</b> — built for smooth, responsive interaction.'
      ],
      tags: ['Kotlin','Room DB','Firebase'],
      actions: '',
      note: ''
    },
    grocmart: {
      cover: 'linear-gradient(135deg,#5A3ACF,#FF6B4A)',
      eyebrow: 'Hyperlocal marketplace · Android & Flutter',
      title: 'GrocMart',
      desc: 'A two-sided marketplace connecting everyday shoppers with local sellers — grocery stores, paan houses, fruit and vegetable sellers, and registered kirana stores — all within a 5–6 km radius. Built and shipped both the consumer app and the merchant-facing app, plus the backend and database powering both.',
      list: [
        '<b>Consumer app</b> — browse nearby registered sellers by category, place orders, and track them in real time.',
        '<b>Merchant app</b> — sellers manage catalog, inventory, and incoming orders from one dashboard.',
        '<b>Location-aware discovery</b> — surfaces only sellers within a 5–6 km radius of the shopper.',
        '<b>Full backend & database</b> — REST API and data layer built and deployed end to end.'
      ],
      tags: ['Android','Flutter','Jetpack Compose','Spring Boot','Firebase','REST API'],
      actions: `<a href="#" class="btn btn-primary">Download APK ↓</a><a href="#" class="btn btn-ghost">Merchant app ↓</a>`,
      note: 'Add your GitHub Release or Play Store link here to make these buttons live.'
    },
    portfolio: {
      cover: 'linear-gradient(135deg,#7F52FF,#3C3489)',
      eyebrow: 'SaaS website builder · Full stack',
      title: 'Portfolio Builder',
      desc: "A self-serve tool where a user fills out a short form — name, work, projects, links — and gets back a complete, hosted portfolio website. Built the form flow, the site-generation logic, and the backend and database that store each user's content.",
      list: [
        '<b>Form-driven generation</b> — structured input turns straight into a live, styled site.',
        "<b>Backend &amp; database</b> — every user's content is persisted and re-editable.",
        '<b>Instant hosting</b> — the generated site is live immediately, no manual deployment.'
      ],
      tags: ['Full-stack','Backend','Database','Forms','Hosting'],
      actions: `<a href="#" class="btn btn-primary">Visit website ↗</a>`,
      note: 'Add your live portfolio-builder URL here to make this link real.'
    }
  };

  const overlay = document.getElementById('projectOverlay');
  const content = document.getElementById('projectContent');
  const glow = document.getElementById('cursorGlow');

  function openProject(key){
    const p = projects[key];
    content.innerHTML = `
      <div class="pd-cover" style="background:${p.cover};"></div>
      <span class="pd-eyebrow">${p.eyebrow}</span>
      <h3 class="pd-title">${p.title}</h3>
      <p class="pd-desc">${p.desc}</p>
      <ul class="pd-list">${p.list.map(l=>`<li>${l}</li>`).join('')}</ul>
      <div class="pd-tags">${p.tags.map(t=>`<span class="chip">${t}</span>`).join('')}</div>
      ${p.actions ? `<div class="pd-actions">${p.actions}</div>` : ''}
      ${p.note ? `<div class="pd-note">${p.note}</div>` : ''}
    `;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeProject(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  overlay.addEventListener('click',(e)=>{ if(e.target===overlay) closeProject(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeProject(); });

  // tablet slideshow
  const tabletSlides = document.querySelectorAll('.tablet-slide');
  const tabletDots = document.getElementById('tabletDots');
  const tabletPrev = document.getElementById('tabletPrev');
  const tabletNext = document.getElementById('tabletNext');
  let tabletIndex = 0;
  let tabletAutoPlay;

  const switchTabletSlide = (index) => {
    tabletSlides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    document.querySelectorAll('.tablet-dots button').forEach((dot, i) => dot.classList.toggle('active', i === index));
  };

  const createTabletDots = () => {
    if (!tabletDots) return;
    tabletDots.innerHTML = '';
    tabletSlides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.addEventListener('click', () => {
        tabletIndex = i;
        switchTabletSlide(tabletIndex);
      });
      if (i === 0) dot.classList.add('active');
      tabletDots.appendChild(dot);
    });
  };

  const nextTabletSlide = () => {
    tabletIndex = (tabletIndex + 1) % tabletSlides.length;
    switchTabletSlide(tabletIndex);
  };
  const prevTabletSlide = () => {
    tabletIndex = (tabletIndex - 1 + tabletSlides.length) % tabletSlides.length;
    switchTabletSlide(tabletIndex);
  };

  tabletPrev?.addEventListener('click', prevTabletSlide);
  tabletNext?.addEventListener('click', nextTabletSlide);

  const resetTabletAutoplay = () => {
    clearInterval(tabletAutoPlay);
    tabletAutoPlay = setInterval(nextTabletSlide, 5200);
  };

  createTabletDots();
  resetTabletAutoplay();

  document.querySelector('.production-tablet-section')?.addEventListener('mouseenter', () => clearInterval(tabletAutoPlay));
  document.querySelector('.production-tablet-section')?.addEventListener('mouseleave', resetTabletAutoplay);

  document.addEventListener('mousemove',(e)=>{
    glow.style.opacity = '1';
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  });
  document.addEventListener('mouseleave',()=>{ glow.style.opacity = '0'; });
