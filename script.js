// --- DOM Elements ---
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const unitSwitch = document.getElementById('unit-switch');
const current_weather_section = document.getElementById('current-weather');
const forecast_section = document.getElementById('forecast');
const hourly_forecast_section = document.getElementById('hourly-forecast');
const loadingDiv = document.getElementById('loading');
const errorMessageDiv = document.getElementById('error-message');
const body = document.body; // Reference to the body element

// --- API Configuration ---
const API_KEY = '0729fa6d7024e4e9e9993db442c554d4'; // IMPORTANT: Replace with your actual API key

// --- State Management ---
let currentUnit = 'metric'; // 'metric' for Celsius, 'imperial' for Fahrenheit
let lastQuery = { type: null, value: null }; // To store the last successful query

// --- Event Listeners ---
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherByCity(city);
    } else {
        showError("Please enter a city name.");
    }
});

cityInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        searchBtn.click();
    }
});

locationBtn.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            getWeatherByCoords(latitude, longitude);
        },
        () => {
            showError("Unable to retrieve your location. Please allow location access or search for a city.");
        }
    );
});

unitSwitch.addEventListener('change', () => {
    currentUnit = unitSwitch.checked ? 'imperial' : 'metric';
    // Re-fetch weather for the last location if it exists
    if (lastQuery.type) {
        if (lastQuery.type === 'city') {
            getWeatherByCity(lastQuery.value);
        } else if (lastQuery.type === 'coords') {
            getWeatherByCoords(lastQuery.value.lat, lastQuery.value.lon);
        }
    }
});

// Run on page load to ask for location immediately
document.addEventListener('DOMContentLoaded', () => {
    locationBtn.click();
});

// --- Functions ---

/**
 * Fetches weather data for a given city name.
 * @param {string} city - The name of the city.
 */
function getWeatherByCity(city) {
    const URL = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`;
    fetchAndProcessWeather(URL, 'city', city);
}

/**
 * Fetches weather data for given coordinates.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 */
function getWeatherByCoords(lat, lon) {
    const URL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`;
    fetchAndProcessWeather(URL, 'coords', { lat, lon });
}

/**
 * Main function to fetch, process, and display weather data.
 * @param {string} url - The API URL to fetch from.
 * @param {string} type - The type of query ('city' or 'coords').
 * @param {any} value - The value of the query.
 */
async function fetchAndProcessWeather(url, type, value) {
    showLoading();
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Data not found (${response.status})`);
        const weatherData = await response.json();
        
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${API_KEY}&units=${currentUnit}`;
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error(`Could not fetch forecast (${forecastResponse.status})`);
        const forecastData = await forecastResponse.json();

        lastQuery = { type, value }; // Save the successful query
        hideLoading();
        displayCurrentWeather(weatherData);
        displayHourlyForecast(forecastData);
        displayForecast(forecastData);
        
        // Call the new function to set the background
        setDynamicBackground(weatherData);

    } catch (error) {
        showError(error.message);
    }
}

/**
 * Updates the DOM with current weather data.
 */
function displayCurrentWeather(data) {
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const windUnit = currentUnit === 'metric' ? 'km/h' : 'mph';

    document.getElementById('city-name').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('current-temp').textContent = `${Math.round(data.main.temp)}${tempUnit}`;
    document.getElementById('current-weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    document.getElementById('current-weather-icon').alt = data.weather[0].description;
    document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}${tempUnit}`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    
    // Convert wind speed if metric (m/s to km/h)
    const windSpeed = currentUnit === 'metric' ? (data.wind.speed * 3.6).toFixed(1) : data.wind.speed.toFixed(1);
    document.getElementById('wind-speed').textContent = `${windSpeed} ${windUnit}`;

    current_weather_section.classList.remove('hidden');
}

/**
 * Updates the DOM with hourly forecast data.
 */
function displayHourlyForecast(data) {
    const hourlyContainer = document.getElementById('hourly-container');
    hourlyContainer.innerHTML = '';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';

    // Display the next 8 intervals (24 hours)
    const next24Hours = data.list.slice(0, 8);

    next24Hours.forEach(item => {
        const card = document.createElement('div');
        card.className = 'hourly-card';

        const time = new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
        const temp = `${Math.round(item.main.temp)}${tempUnit}`;

        card.innerHTML = `
            <p>${time}</p>
            <img src="${icon}" alt="${item.weather[0].description}">
            <p><strong>${temp}</strong></p>
        `;
        hourlyContainer.appendChild(card);
    });
    hourly_forecast_section.classList.remove('hidden');
}

/**
 * Updates the DOM with 5-day forecast data.
 */
function displayForecast(data) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = '';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';

    const dailyForecasts = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    dailyForecasts.forEach(forecast => {
        const card = document.createElement('div');
        card.className = 'forecast-card';

        const day = new Date(forecast.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
        const icon = `https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png`;
        const temp = `${Math.round(forecast.main.temp)}${tempUnit}`;

        card.innerHTML = `
            <p>${day}</p>
            <img src="${icon}" alt="${forecast.weather[0].description}">
            <p><strong>${temp}</strong></p>
        `;
        forecastContainer.appendChild(card);
    });
    forecast_section.classList.remove('hidden');
}

// --- Dynamic Background Function ---
function setDynamicBackground(weatherData) {
    const currentTime = new Date().getTime() / 1000; // Current time in UTC seconds
    const sunrise = weatherData.sys.sunrise;
    const sunset = weatherData.sys.sunset;
    const isDay = (currentTime > sunrise && currentTime < sunset);

    const weatherCondition = weatherData.weather[0].main.toLowerCase(); // e.g., "clouds", "clear", "rain"
    const weatherId = weatherData.weather[0].id; // OpenWeatherMap condition ID

    // Remove any previous background classes
    body.className = ''; 

    // Add classes based on weather condition and time of day
    if (weatherCondition.includes('clear')) {
        body.classList.add(isDay ? 'bg-clear-day' : 'bg-clear-night');
    } else if (weatherCondition.includes('clouds')) {
        // More specific cloud handling
        if (weatherId >= 801 && weatherId <= 802) { // Few to scattered clouds
            body.classList.add(isDay ? 'bg-partly-cloudy-day' : 'bg-partly-cloudy-night');
        } else { // Broken to overcast clouds
            body.classList.add('bg-cloudy');
        }
    } else if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
        body.classList.add('bg-rainy');
    } else if (weatherCondition.includes('thunderstorm')) {
        body.classList.add('bg-thunderstorm');
    } else if (weatherCondition.includes('snow')) {
        body.classList.add('bg-snowy');
    } else if (weatherCondition.includes('mist') || weatherCondition.includes('fog') || weatherCondition.includes('haze')) {
        body.classList.add('bg-mist');
    } else {
        // Fallback for any other conditions or if not matched
        body.classList.add(isDay ? 'bg-default-day' : 'bg-default-night');
    }
}


// --- UI Helper Functions ---
function showLoading() {
    loadingDiv.classList.remove('hidden');
    errorMessageDiv.classList.add('hidden');
    [current_weather_section, forecast_section, hourly_forecast_section].forEach(el => el.classList.add('hidden'));
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function showError(message) {
    hideLoading();
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove('hidden');
}