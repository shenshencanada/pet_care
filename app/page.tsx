"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import {
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MapPinned,
  Menu,
  MessageCircle,
  PawPrint,
  PhoneCall,
  Send,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "#services", label: "服务" },
  { href: "#process", label: "流程" },
  { href: "#prices", label: "套餐" },
  { href: "#gallery", label: "环境" },
  { href: "#visit", label: "到店" },
];

const stats = [
  ["8年", "主理人洗护经验"],
  ["30min", "到店健康初检"],
  ["1宠1消", "工具与浴缸消毒"],
  ["96%", "顾客复购率"],
];

const services = [
  {
    title: "基础洁净洗护",
    body: "温和洗剂、肛门腺清理、耳道护理、脚底毛与指甲修剪。",
    image:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80",
    alt: "洗护后的短毛犬",
  },
  {
    title: "猫咪低压护理",
    body: "独立猫咪时段、低噪设备、少等待流程，减少陌生环境压力。",
    image:
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=900&q=80",
    alt: "安静休息的猫",
  },
  {
    title: "造型修剪",
    body: "按体型、毛量和生活习惯设计轮廓，兼顾可爱度与日常好打理。",
    image:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80",
    alt: "金毛犬肖像",
  },
];

const steps = [
  ["到店评估", "确认体重、毛结、皮肤敏感点和近期身体情况，必要时调整项目。"],
  ["分区清洁", "脸部、耳道、脚底和身体分区处理，使用适合毛质的洗护产品。"],
  ["彻底吹干", "分层梳通并吹透底毛，降低潮湿引起的皮肤不适。"],
  ["交付反馈", "说明皮肤、毛发、耳道、指甲状态，并给出居家护理建议。"],
];

const prices = [
  {
    title: "轻盈洁净",
    price: "¥128",
    featured: false,
    items: ["基础沐浴与吹干", "耳道、脚底、指甲护理", "适合短毛犬与日常维护"],
  },
  {
    title: "全身精护",
    price: "¥238",
    featured: true,
    items: ["深层清洁与护毛", "局部修剪与毛结处理", "护理记录与居家建议"],
  },
  {
    title: "造型焕新",
    price: "¥368",
    featured: false,
    items: ["洗护、吹干、全身修剪", "圆脸、泰迪装、清爽装", "适合需要完整造型的宠物"],
  },
];

const gallerySlides = [
  {
    title: "前厅接待与精品陈列",
    body: "暖木、石材与柔和灯带组成第一印象，等候区和洗护用品陈列保持安静有序。",
    image: "/assets/store-reception.png",
    alt: "高端宠物洗护店前厅接待区与商品陈列",
    dotLabel: "查看前厅接待区",
  },
  {
    title: "透明洗护工作区",
    body: "玻璃分区让护理过程可视，浴缸、吹风和修剪工位各自独立，减少等待干扰。",
    image: "/assets/store-grooming.png",
    alt: "高端宠物洗护店透明玻璃洗护区",
    dotLabel: "查看透明洗护区",
  },
  {
    title: "猫咪低压护理间",
    body: "独立猫区用低照度、软包与休息层架降低陌生环境压力，洗护前后都能安静过渡。",
    image: "/assets/store-cat-suite.png",
    alt: "高端宠物洗护店猫咪低压护理与休息区",
    dotLabel: "查看猫咪护理区",
  },
];

const reviews = [
  ["我家狗以前一吹风就紧张，这次出来状态很放松，毛也吹得很透。", "可乐妈妈"],
  ["猫咪第一次洗澡没有应激，店员会先沟通性格和禁忌点，很专业。", "团子爸爸"],
  ["修出来的造型清爽自然，不是只追求可爱，日常梳毛轻松多了。", "糯米主人"],
];

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function getTomorrowValue() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [dateValue, setDateValue] = useState(getTomorrowValue);
  const [minDate] = useState(getTodayValue);

  function showToast() {
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2600);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
    setDateValue(getTomorrowValue());
    showToast();
  }

  function setSlide(index: number) {
    setCarouselIndex((index + gallerySlides.length) % gallerySlides.length);
  }

  return (
    <>
      <header className="site-header">
        <nav className="nav" aria-label="主导航">
          <a className="brand" href="#top" aria-label="泡泡爪宠物洗护首页">
            <span className="brand-mark">
              <PawPrint aria-hidden="true" />
            </span>
            <span>泡泡爪宠物洗护</span>
          </a>
          <div className={`nav-links ${isMenuOpen ? "open" : ""}`} id="navLinks">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </a>
            ))}
          </div>
          <a className="primary-btn nav-cta" href="#booking">
            <CalendarCheck aria-hidden="true" />
            预约洗护
          </a>
          <button
            className="icon-btn menu-toggle"
            type="button"
            aria-label="打开导航"
            aria-controls="navLinks"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <Menu aria-hidden="true" />
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-label="泡泡爪宠物洗护">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">Cat & Dog Grooming Studio</p>
              <h1>泡泡爪宠物洗护</h1>
              <p>
                给猫狗准备的温柔洗护空间。低噪吹风、独立消毒工位、可视化护理记录，从基础清洁到造型修剪都稳稳照顾到。
              </p>
              <div className="hero-actions">
                <a className="primary-btn" href="#booking">
                  <CalendarPlus aria-hidden="true" />
                  立即预约
                </a>
                <a className="secondary-btn" href="tel:800-618-0920">
                  <PhoneCall aria-hidden="true" />
                  800-618-0920
                </a>
              </div>
            </div>

            <aside className="quick-book" aria-label="快速预约">
              <header>
                <div>
                  <h2>今日可约</h2>
                  <span>10:30 / 14:00 / 17:30</span>
                </div>
                <Sparkles aria-hidden="true" />
              </header>
              <form className="booking-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="quickPet">宠物类型</label>
                  <select id="quickPet" name="pet">
                    <option>小型犬</option>
                    <option>中大型犬</option>
                    <option>短毛猫</option>
                    <option>长毛猫</option>
                  </select>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="quickDate">日期</label>
                    <input
                      id="quickDate"
                      name="date"
                      type="date"
                      min={minDate}
                      value={dateValue}
                      onChange={(event) => setDateValue(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="quickTime">时段</label>
                    <select id="quickTime" name="time">
                      <option>10:30</option>
                      <option>14:00</option>
                      <option>17:30</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="quickNote">备注</label>
                  <textarea
                    className="quick-note"
                    id="quickNote"
                    name="note"
                    placeholder="体型、毛结、敏感点或偏好"
                  />
                </div>
                <button className="primary-btn" type="submit">
                  <Send aria-hidden="true" />
                  提交预约
                </button>
              </form>
            </aside>
          </div>
        </section>

        <section className="stats" aria-label="门店数据">
          <div className="section-inner">
            <div className="stats-grid">
              {stats.map(([value, label]) => (
                <div className="stat" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="services" id="services">
          <div className="section-inner">
            <div className="section-head">
              <h2>洗得干净，也照顾情绪</h2>
              <p>每只宠物先看皮肤、毛结、耳道和指甲情况，再安排适合的水温、洗剂和吹干方式。</p>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <article className="service" key={service.title}>
                  <Image
                    className="service-image"
                    src={service.image}
                    alt={service.alt}
                    width={900}
                    height={600}
                    sizes="(max-width: 640px) calc(100vw - 28px), (max-width: 920px) 50vw, 33vw"
                  />
                  <div className="service-body">
                    <h3>{service.title}</h3>
                    <p>{service.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="process">
          <div className="section-inner process-wrap">
            <Image
              className="process-photo"
              src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1000&q=82"
              alt="两只狗在户外并排坐着"
              width={1000}
              height={1200}
              sizes="(max-width: 920px) calc(100vw - 36px), 44vw"
            />
            <div>
              <div className="section-head">
                <h2>每一步都有记录</h2>
              </div>
              <div className="steps">
                {steps.map(([title, body]) => (
                  <article className="step" key={title}>
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="prices" id="prices">
          <div className="section-inner">
            <div className="section-head">
              <h2>常用套餐</h2>
              <p>价格按体型、毛量和毛结情况微调，到店评估后确认。</p>
            </div>
            <div className="price-grid">
              {prices.map((plan) => (
                <article className={`price-card ${plan.featured ? "featured" : ""}`} key={plan.title}>
                  <h3>{plan.title}</h3>
                  <div className="price">
                    {plan.price} <small>起</small>
                  </div>
                  <ul>
                    {plan.items.map((item) => (
                      <li key={item}>
                        <Check aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="gallery" id="gallery">
          <div className="section-inner">
            <div className="section-head">
              <h2>安静、明亮、可视</h2>
              <p>洗护区与等候区分开，减少宠物互相打扰；主人可在前厅看到主要护理进度。</p>
            </div>
            <div className="store-carousel" aria-label="店内环境轮播图">
              <div
                className="carousel-track"
                id="storeCarousel"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {gallerySlides.map((slide) => (
                  <figure className="carousel-slide" key={slide.title}>
                    <Image
                      className="carousel-image"
                      src={slide.image}
                      alt={slide.alt}
                      width={1672}
                      height={941}
                      sizes="(max-width: 640px) calc(100vw - 28px), calc(100vw - 36px)"
                    />
                    <figcaption className="carousel-caption">
                      <h3>{slide.title}</h3>
                      <p>{slide.body}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <button className="carousel-btn prev" type="button" aria-label="上一张环境图" onClick={() => setSlide(carouselIndex - 1)}>
                <ChevronLeft aria-hidden="true" />
              </button>
              <button className="carousel-btn next" type="button" aria-label="下一张环境图" onClick={() => setSlide(carouselIndex + 1)}>
                <ChevronRight aria-hidden="true" />
              </button>
              <div className="carousel-dots" aria-label="环境图分页">
                {gallerySlides.map((slide, index) => (
                  <button
                    className={`carousel-dot ${index === carouselIndex ? "active" : ""}`}
                    type="button"
                    aria-label={slide.dotLabel}
                    key={slide.title}
                    onClick={() => setSlide(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="reviews" aria-label="顾客评价">
          <div className="section-inner">
            <div className="section-head">
              <h2>主人们常这么说</h2>
              <p>我们最在意的是宠物愿意再来，主人也能安心把它交给我们。</p>
            </div>
            <div className="review-grid">
              {reviews.map(([body, author]) => (
                <article className="review" key={author}>
                  <div className="stars">★★★★★</div>
                  <p>{body}</p>
                  <h3>{author}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="visit" id="visit">
          <div className="section-inner visit-grid">
            <div>
              <h2>带它来洗个舒服澡</h2>
              <p>上海市普陀区宜川路街道陕西北路1620号，沿陕西北路到店。营业时间 10:00-20:00，周二店休。</p>
              <div className="info-list">
                <div className="info-item">
                  <MapPin aria-hidden="true" />
                  <span>普陀区宜川路街道陕西北路1620号</span>
                </div>
                <div className="info-item">
                  <Clock3 aria-hidden="true" />
                  <span>10:00-20:00，周二店休</span>
                </div>
                <div className="info-item">
                  <MessageCircle aria-hidden="true" />
                  <span>微信：bubblepaw88</span>
                </div>
              </div>
            </div>
            <div className="visit-side">
              <div className="map-card" aria-label="泡泡爪宠物洗护门店位置地图">
                <PetMap />
                <div className="map-card-title">
                  <MapPinned aria-hidden="true" />
                  <span>上海市普陀区宜川路街道陕西北路1620号</span>
                </div>
              </div>
              <aside className="booking-panel" id="booking">
                <h3>预约到店</h3>
                <form className="booking-form" onSubmit={handleSubmit}>
                  <div className="field">
                    <label htmlFor="name">联系人</label>
                    <input id="name" name="name" autoComplete="name" placeholder="您的称呼" />
                  </div>
                  <div className="field">
                    <label htmlFor="phone">手机</label>
                    <input id="phone" name="phone" autoComplete="tel" placeholder="用于确认预约" />
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="pet">宠物</label>
                      <select id="pet" name="pet">
                        <option>狗狗</option>
                        <option>猫咪</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="package">套餐</label>
                      <select id="package" name="package">
                        <option>全身精护</option>
                        <option>轻盈洁净</option>
                        <option>造型焕新</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="note">备注</label>
                    <textarea id="note" name="note" placeholder="体型、毛结、敏感点或偏好时段" />
                  </div>
                  <button className="primary-btn" type="submit">
                    <CalendarCheck aria-hidden="true" />
                    发送预约
                  </button>
                </form>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span>© 2026 泡泡爪宠物洗护</span>
          <span>低压洗护 / 造型修剪 / 猫狗护理</span>
        </div>
      </footer>

      <div className={`toast ${toastVisible ? "show" : ""}`} role="status" aria-live="polite">
        预约已记录，我们会尽快联系您确认时间。
      </div>
    </>
  );
}

function PetMap() {
  return (
    <svg className="pet-map" viewBox="0 0 640 430" role="img" aria-labelledby="mapTitle mapDesc" xmlns="http://www.w3.org/2000/svg">
      <title id="mapTitle">泡泡爪宠物洗护位置地图</title>
      <desc id="mapDesc">门店标记在上海市普陀区宜川路街道陕西北路1620号附近。</desc>
      <defs>
        <pattern id="dotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="2" fill="#f1dfca" />
        </pattern>
        <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#7d5130" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect width="640" height="430" fill="#fff8ef" />
      <rect width="640" height="430" fill="url(#dotGrid)" opacity="0.55" />
      <path d="M-20 96 C92 64 154 96 246 70 C344 42 432 70 680 32" fill="none" stroke="#cfe8dd" strokeWidth="48" strokeLinecap="round" />
      <path d="M-28 98 C90 70 158 100 248 74 C344 48 430 72 678 36" fill="none" stroke="#80baa3" strokeWidth="6" strokeLinecap="round" strokeDasharray="16 18" />
      <path d="M100 -20 C130 78 124 142 184 210 C234 266 232 340 202 458" fill="none" stroke="#f8dccf" strokeWidth="62" strokeLinecap="round" />
      <path d="M104 -18 C134 76 130 138 188 206 C240 266 236 340 208 460" fill="none" stroke="#d7816a" strokeWidth="7" strokeLinecap="round" strokeDasharray="18 16" />
      <path d="M-30 320 C92 286 194 316 296 280 C398 244 470 254 674 210" fill="none" stroke="#f2e5b8" strokeWidth="54" strokeLinecap="round" />
      <path d="M-30 320 C92 286 194 316 296 280 C398 244 470 254 674 210" fill="none" stroke="#caa85a" strokeWidth="7" strokeLinecap="round" strokeDasharray="14 16" />
      <path d="M420 -26 C386 82 384 154 418 224 C454 300 446 354 406 458" fill="none" stroke="#d8edf6" strokeWidth="58" strokeLinecap="round" />
      <path d="M420 -26 C386 82 384 154 418 224 C454 300 446 354 406 458" fill="none" stroke="#6ea6bf" strokeWidth="7" strokeLinecap="round" strokeDasharray="17 17" />
      <g fill="#fff" stroke="#eadcca" strokeWidth="3" filter="url(#mapShadow)">
        <rect x="34" y="166" width="112" height="72" rx="8" />
        <rect x="474" y="72" width="110" height="82" rx="8" />
        <rect x="474" y="286" width="118" height="78" rx="8" />
      </g>
      <g fill="#5e6c66" fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="21" fontWeight="800">
        <text x="58" y="208">宜川路</text>
        <text x="494" y="119">社区</text>
        <text x="494" y="334">公园</text>
      </g>
      <g transform="translate(250 142)" filter="url(#mapShadow)">
        <path d="M68 0 C105 0 136 28 136 64 C136 124 68 178 68 178 C68 178 0 124 0 64 C0 28 31 0 68 0Z" fill="#d9664f" />
        <circle cx="68" cy="66" r="42" fill="#fff6ea" />
        <circle cx="50" cy="46" r="12" fill="#4f7d70" />
        <circle cx="86" cy="46" r="12" fill="#4f7d70" />
        <circle cx="68" cy="80" r="17" fill="#4f7d70" />
        <circle cx="44" cy="77" r="10" fill="#4f7d70" />
        <circle cx="92" cy="77" r="10" fill="#4f7d70" />
      </g>
      <g fill="#503a2a" fontFamily="PingFang SC, Microsoft YaHei, sans-serif" textAnchor="middle">
        <text x="318" y="356" fontSize="28" fontWeight="900">泡泡爪宠物洗护</text>
        <text x="318" y="389" fontSize="22" fontWeight="700">陕西北路1620号</text>
      </g>
      <g fill="#d9664f" opacity="0.38">
        <circle cx="210" cy="78" r="9" />
        <circle cx="222" cy="65" r="5" />
        <circle cx="234" cy="75" r="5" />
        <circle cx="198" cy="64" r="5" />
        <circle cx="548" cy="230" r="9" />
        <circle cx="560" cy="216" r="5" />
        <circle cx="572" cy="228" r="5" />
        <circle cx="536" cy="216" r="5" />
      </g>
    </svg>
  );
}
