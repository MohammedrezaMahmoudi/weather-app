// ===== گرفتن عناصر =====
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const errorText = document.getElementById("error-text");
const weatherBox = document.getElementById("weather");

const weatherIcon = document.getElementById("weather-icon");
const weatherTemp = document.getElementById("weather-temp");
const weatherCity = document.getElementById("weather-city");
const weatherCondition = document.getElementById("weather-condition");
const weatherHumidity = document.getElementById("weather-humidity");
const weatherWind = document.getElementById("weather-wind");
const weatherFeels = document.getElementById("weather-feels");
const hourlyList = document.getElementById("hourly-list");

// ===== کش شهرها =====
const cityCache = {};

// ===== نقشه کدهای آب‌وهوا =====
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

// ===== توابع کمکی =====
function showLoading(message = "در حال گرفتن اطلاعات...") {
  loading.querySelector("p").textContent = message;
  loading.classList.remove("hidden");
  errorBox.classList.add("hidden");
  weatherBox.classList.add("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
  weatherBox.classList.add("hidden");
}

function showWeather() {
  weatherBox.classList.remove("hidden");
  errorBox.classList.add("hidden");
}

// ===== fetch با timeout =====
async function fetchWithTimeout(url, timeout = 10000) {
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

// ===== نمایش پیش‌بینی ساعتی =====
function renderHourly(hourlyData) {
  hourlyList.innerHTML = "";

  const times = hourlyData.time;
  const temps = hourlyData.temperature_2m;
  const codes = hourlyData.weather_code;

  const now = new Date();
  const currentHour = now.getHours();

  let startIndex = 0;
  for (let i = 0; i < times.length; i++) {
    const timeDate = new Date(times[i]);
    if (
      timeDate.getHours() === currentHour &&
      timeDate.getDate() === now.getDate()
    ) {
      startIndex = i;
      break;
    }
  }

  const hoursToShow = 10;

  for (
    let i = startIndex;
    i < startIndex + hoursToShow && i < times.length;
    i++
  ) {
    const hour = new Date(times[i]).getHours();
    const temp = temps[i];
    const code = codes[i];
    const info = weatherCodes[code] || { icon: "🌡️", text: "نامشخص" };

    const item = document.createElement("div");
    item.className = "hourly-item";
    if (i === startIndex) item.classList.add("now");

    item.innerHTML = `
            <div class="hourly-hour">${i === startIndex ? "الان" : hour + ":00"}</div>
            <div class="hourly-icon">${info.icon}</div>
            <div class="hourly-temp">${Math.round(temp)}°</div>
        `;

    hourlyList.appendChild(item);
  }
}

// ===== گرفتن مختصات (با کش) =====
async function getCoordinates(city) {
  const cacheKey = city.toLowerCase();

  if (cityCache[cacheKey]) {
    console.log("📦 از کش:", city);
    return cityCache[cacheKey];
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fa`;
  const geoRes = await fetchWithTimeout(geoUrl);
  const geoData = await geoRes.json();

  if (!geoData.results || geoData.results.length === 0) {
    throw new Error("شهر پیدا نشد! اسم شهر رو درست بنویس.");
  }

  const loc = geoData.results[0];
  cityCache[cacheKey] = loc;
  return loc;
}

// ===== تابع اصلی =====
async function getWeather(city) {
  showLoading("در حال پیدا کردن شهر...");

  try {
    // مرحله ۱: مختصات
    const location = await getCoordinates(city);
    const { latitude, longitude, name, country } = location;

    showLoading("در حال گرفتن آب‌وهوا...");

    // مرحله ۲: اطلاعات هوا
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_days=2`;
    const weatherRes = await fetchWithTimeout(weatherUrl);
    const weatherData = await weatherRes.json();

    // مرحله ۳: نمایش
    const current = weatherData.current;
    const code = current.weather_code;
    const weatherInfo = weatherCodes[code] || { icon: "🌡️", text: "نامشخص" };

    weatherIcon.textContent = weatherInfo.icon;
    weatherTemp.textContent = `${Math.round(current.temperature_2m)}°`;
    weatherCity.textContent = `${name}، ${country}`;
    weatherCondition.textContent = weatherInfo.text;
    weatherHumidity.textContent = `${current.relative_humidity_2m}%`;
    weatherWind.textContent = `${current.wind_speed_10m} km/h`;
    weatherFeels.textContent = `${Math.round(current.apparent_temperature)}°`;

    renderHourly(weatherData.hourly);

    hideLoading();
    showWeather();
  } catch (error) {
    hideLoading();

    if (error.name === "AbortError") {
      showError("زمان پاسخ‌دهی سرور طولانی شد. لطفاً دوباره تلاش کن.");
    } else {
      showError(error.message || "یه خطایی پیش اومد. دوباره تلاش کن.");
    }
    console.error(error);
  }
}

// ===== رویداد فرم =====
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  getWeather(city);
  // ✅ متن input پاک نمی‌شه
});
