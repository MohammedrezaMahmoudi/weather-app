// ============================================
// ۱. گرفتن عناصر
// ============================================
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const errorBox = document.getElementById("error");
const errorText = document.getElementById("error-text");
const cardsGrid = document.getElementById("cards-grid");

// ============================================
// ۲. تنظیمات
// ============================================
const CACHE_DURATION = 60 * 60 * 1000; // ۱ ساعت
const FETCH_TIMEOUT = 30000; // ۳۰ ثانیه (۳ برابر)

// ============================================
// ۳. کش
// ============================================
function getCache(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) return data;
    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  localStorage.setItem(
    key,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    }),
  );
}

// ============================================
// ۴. نقشه کدهای آب‌وهوا
// ============================================
const weatherCodes = {
  0: { icon: "☀️", text: "آسمان صاف" },
  1: { icon: "🌤️", text: "اغلب صاف" },
  2: { icon: "⛅", text: "نیمه ابری" },
  3: { icon: "☁️", text: "ابری" },
  45: { icon: "🌫️", text: "مه‌آلود" },
  48: { icon: "🌫️", text: "مه یخ‌زده" },
  51: { icon: "🌦️", text: "نم‌نم باران" },
  53: { icon: "🌦️", text: "باران سبک" },
  55: { icon: "🌧️", text: "باران شدید" },
  61: { icon: "🌧️", text: "باران کم" },
  63: { icon: "🌧️", text: "باران متوسط" },
  65: { icon: "🌧️", text: "باران شدید" },
  71: { icon: "🌨️", text: "برف کم" },
  73: { icon: "🌨️", text: "برف متوسط" },
  75: { icon: "❄️", text: "برف شدید" },
  80: { icon: "🌦️", text: "رگبار" },
  81: { icon: "🌧️", text: "رگبار شدید" },
  82: { icon: "⛈️", text: "رگبار خیلی شدید" },
  95: { icon: "⛈️", text: "رعد و برق" },
  96: { icon: "⛈️", text: "رعد و برق با تگرگ" },
};

// ============================================
// ۵. حالت‌ها
// ============================================
function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

// ============================================
// ۶. fetch با timeout
// ============================================
async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ============================================
// ۷. ساخت کارت لودینگ
// ============================================
function createLoadingCard(cityName) {
  const card = document.createElement("div");
  card.className = "city-card";
  card.dataset.loading = "true";
  card.innerHTML = `
        <div class="card-loading">
            <div class="spinner"></div>
            <p>در حال گرفتن آب‌وهوای <strong>${cityName}</strong>...</p>
        </div>
    `;
  return card;
}

// ============================================
// ۸. ساخت کارت شهر
// ============================================
function createCityCard(data, cityName) {
  const card = document.createElement("div");
  card.className = "city-card";

  const current = data.current;
  const info = weatherCodes[current.weather_code] || {
    icon: "🌡️",
    text: "نامشخص",
  };

  card.innerHTML = `
        <button class="card-remove" title="حذف">✕</button>

        <div class="card-main">
            <div class="card-icon">${info.icon}</div>
            <div class="card-info">
                <div class="card-temp">${Math.round(current.temperature_2m)}°</div>
                <div class="card-city">${cityName}</div>
                <div class="card-condition">${info.text}</div>
            </div>
        </div>

        <div class="card-details">
            <div class="card-detail">
                <span class="card-detail-icon">💧</span>
                <span class="card-detail-label">رطوبت</span>
                <span class="card-detail-value">${current.relative_humidity_2m}%</span>
            </div>
            <div class="card-detail">
                <span class="card-detail-icon">💨</span>
                <span class="card-detail-label">باد</span>
                <span class="card-detail-value">${Math.round(current.wind_speed_10m)} km/h</span>
            </div>
            <div class="card-detail">
                <span class="card-detail-icon">🌡️</span>
                <span class="card-detail-label">احساس</span>
                <span class="card-detail-value">${Math.round(current.apparent_temperature)}°</span>
            </div>
        </div>
    `;

  // پیش‌بینی ساعتی
  if (data.hourly) {
    const hourlySection = document.createElement("div");
    hourlySection.className = "card-hourly";
    hourlySection.innerHTML = `
            <div class="card-hourly-title">⏰ پیش‌بینی ساعتی</div>
            <div class="card-hourly-list"></div>
        `;
    card.appendChild(hourlySection);

    const hourlyList = hourlySection.querySelector(".card-hourly-list");
    renderHourly(hourlyList, data.hourly);
  }

  // دکمه حذف
  card.querySelector(".card-remove").addEventListener("click", (e) => {
    e.stopPropagation();
    card.style.animation = "cardIn 0.3s ease reverse";
    setTimeout(() => card.remove(), 300);
  });

  return card;
}

// ============================================
// ۹. نمایش پیش‌بینی ساعتی
// ============================================
function renderHourly(container, hourlyData) {
  container.innerHTML = "";

  const times = hourlyData.time;
  const temps = hourlyData.temperature_2m;
  const codes = hourlyData.weather_code;

  const now = new Date();
  const currentHour = now.getHours();

  let startIndex = 0;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (t.getHours() === currentHour && t.getDate() === now.getDate()) {
      startIndex = i;
      break;
    }
  }

  for (let i = startIndex; i < startIndex + 10 && i < times.length; i++) {
    const hour = new Date(times[i]).getHours();
    const info = weatherCodes[codes[i]] || { icon: "🌡️" };

    const item = document.createElement("div");
    item.className = "hourly-item";
    if (i === startIndex) item.classList.add("now");

    item.innerHTML = `
            <div class="hourly-hour">${i === startIndex ? "الان" : hour + ":00"}</div>
            <div class="hourly-icon">${info.icon}</div>
            <div class="hourly-temp">${Math.round(temps[i])}°</div>
        `;
    container.appendChild(item);
  }
}

// ============================================
// ۱۰. گرفتن آب‌وهوای یک شهر
// ============================================
async function fetchCityWeather(city) {
  // مختصات (با کش)
  const cacheKey = `coord_${city.toLowerCase()}`;
  let location = getCache(cacheKey);

  if (!location) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fa`;
    const geoRes = await fetchWithTimeout(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("شهر پیدا نشد!");
    }

    location = geoData.results[0];
    setCache(cacheKey, location);
  }

  // آب‌وهوا
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_days=2&timezone=auto`;
  const weatherRes = await fetchWithTimeout(weatherUrl);
  const weatherData = await weatherRes.json();

  return {
    data: weatherData,
    name: `${location.name}${location.country ? "، " + location.country : ""}`,
  };
}

// ============================================
// ۱۱. اضافه کردن کارت شهر (با کارت لودینگ)
// ============================================
async function addCity(city) {
  hideError();

  // کارت لودینگ اضافه کن
  const loadingCard = createLoadingCard(city);
  cardsGrid.prepend(loadingCard);

  try {
    const { data, name } = await fetchCityWeather(city);

    // حذف کارت لودینگ
    loadingCard.remove();

    // اضافه کارت واقعی
    const card = createCityCard(data, name);
    cardsGrid.prepend(card);
  } catch (error) {
    loadingCard.remove();

    if (error.name === "AbortError") {
      showError("زمان پاسخ‌دهی سرور طولانی شد. لطفاً دوباره تلاش کن.");
    } else {
      showError(error.message || "خطایی پیش اومد!");
    }
    console.error(error);
  }
}

// ============================================
// ۱۲. شروع: نمایش زنجان
// ============================================
async function initApp() {
  if (cardsGrid.children.length > 0) return;

  // کارت لودینگ
  const loadingCard = createLoadingCard("زنجان");
  cardsGrid.appendChild(loadingCard);

  try {
    const { data } = await fetchCityWeather("Zanjan");
    loadingCard.remove();

    const card = createCityCard(data, "زنجان، ایران");
    cardsGrid.appendChild(card);
  } catch (error) {
    loadingCard.remove();
    showError("خطا در بارگذاری اولیه. لطفاً VPN روشن کن یا اینترنتت رو چک کن.");
    console.error(error);
  }
}

// ============================================
// ۱۳. رویداد فرم
// ============================================
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  addCity(city);
  cityInput.value = "";
});

// ============================================
// ۱۴. شروع
// ============================================
initApp();
