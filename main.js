// City Expansion Manager Dashboard
class CityExpansionDashboard {
    constructor() {
        this.map = null;
        this.heatmapLayer = null;
        this.weatherData = null;
        this.userLocation = null;
        this.settings = this.loadSettings();
        this.refreshInterval = null;
        this.historyKey = 'cityExpansionWeatherHistory';
        this.humiditySource = 'Provedor';
        this.heatmapIntensityFactor = 0.5; // 0..1 escalonador do slider
        this.riskThresholds = {
            low: { temp: 35, humidity: 80, wind: 50, aqi: 100 },
            medium: { temp: 30, humidity: 70, wind: 40, aqi: 80 },
            high: { temp: 25, humidity: 60, wind: 30, aqi: 60 }
        };
        
        // API configurations
        this.apiConfigs = {
            tomorrow_openaq: {
                name: 'Tomorrow.io + OpenAQ',
                currentUrl: (lat, lng, key) => `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${key}&units=metric`,
                forecastUrl: (lat, lng, key) => `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&apikey=${key}&units=metric&timesteps=daily&forecastDays=7`,
                requiresKey: true
            },
            tomorrow: {
                name: 'Tomorrow.io',
                currentUrl: (lat, lng, key) => `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${key}&units=metric`,
                forecastUrl: (lat, lng, key) => `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&apikey=${key}&units=metric&timesteps=daily&forecastDays=7`,
                requiresKey: true
            },
            openweathermap: {
                name: 'OpenWeatherMap',
                currentUrl: (lat, lng, key) => `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric`,
                forecastUrl: (lat, lng, key) => `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${key}&units=metric`,
                requiresKey: true
            },
            openmeteo: {
                name: 'Open-Meteo',
                currentUrl: (lat, lng) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`,
                forecastUrl: (lat, lng) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=7`,
                requiresKey: false
            },
            weatherapi: {
                name: 'WeatherAPI.com',
                currentUrl: (lat, lng, key) => `https://api.weatherapi.com/v1/current.json?key=${key}&q=${lat},${lng}&aqi=yes`,
                forecastUrl: (lat, lng, key) => `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${lat},${lng}&days=7&aqi=yes`,
                requiresKey: true
            },
            weatherbit: {
                name: 'Weatherbit',
                currentUrl: (lat, lng, key) => `https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lng}&key=${key}&units=M`,
                forecastUrl: (lat, lng, key) => `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lng}&key=${key}&days=7&units=M`,
                requiresKey: true
            }
        };
        
        // OpenAQ API configuration for air quality data
        this.openaqConfig = {
            name: 'OpenAQ',
            baseUrl: 'https://api.openaq.org/v2',
            requiresKey: false
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeMap();
        this.requestLocationPermission();
        this.loadWeatherData();
        this.setupAutoRefresh();
        this.setupPushNotifications();
    }

    setupEventListeners() {
        // Controles do cabeçalho
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        
        // Controles de alerta
        document.getElementById('closeAlert').addEventListener('click', () => this.hideAlert());
        
        // Controles do mapa
        document.getElementById('locateBtn').addEventListener('click', () => this.locateUser());
        document.getElementById('heatmapToggle').addEventListener('click', () => this.toggleHeatmap());
        
        // Controles do mapa de calor
        document.getElementById('heatmapType').addEventListener('change', (e) => this.updateHeatmap(e.target.value));
        document.getElementById('heatmapIntensity').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) || 0;
            const min = isNaN(parseFloat(e.target.min)) ? 0 : parseFloat(e.target.min);
            const max = isNaN(parseFloat(e.target.max)) ? 100 : parseFloat(e.target.max);
            const clamped = Math.min(Math.max(value, min), max);
            const percent = ((clamped - min) / (max - min)) * 100;
            document.getElementById('intensityValue').textContent = Math.round(percent) + '%';
            this.heatmapIntensityFactor = percent / 100;
            // Atualiza visual do track do slider de acordo com faixa real
            e.target.style.background = `linear-gradient(90deg, #27ae60 0%, #27ae60 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
            this.updateHeatmapIntensity(percent);
        });
        // Ajusta visual inicial do slider
        const sliderEl = document.getElementById('heatmapIntensity');
        if (sliderEl) {
            const value = parseFloat(sliderEl.value) || 0;
            const min = isNaN(parseFloat(sliderEl.min)) ? 0 : parseFloat(sliderEl.min);
            const max = isNaN(parseFloat(sliderEl.max)) ? 100 : parseFloat(sliderEl.max);
            const clamped = Math.min(Math.max(value, min), max);
            const percent = ((clamped - min) / (max - min)) * 100;
            sliderEl.style.background = `linear-gradient(90deg, #27ae60 0%, #27ae60 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
        }
        
        // Modal de configurações
        document.getElementById('closeSettings').addEventListener('click', () => this.hideSettings());
        document.getElementById('cancelSettings').addEventListener('click', () => this.hideSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        
        // Clique no fundo do modal
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.hideSettings();
        });

        // IA: sidebar open/close + analisar
        const aiOpenBtn = document.getElementById('aiSidebarBtn');
        const aiCloseBtn = document.getElementById('closeAiSidebar');
        const aiOverlay = document.getElementById('aiSidebarOverlay');
        const aiBtn = document.getElementById('aiAnalyzeBtn');

        if (aiOpenBtn) {
            aiOpenBtn.addEventListener('click', () => this.showAISidebar());
        }
        if (aiCloseBtn) {
            aiCloseBtn.addEventListener('click', () => this.hideAISidebar());
        }
        if (aiOverlay) {
            aiOverlay.addEventListener('click', () => this.hideAISidebar());
        }
        if (aiBtn) {
            aiBtn.addEventListener('click', () => this.runAIAnalysis());
        }
    }

    initializeMap() {
        // Inicializa o mapa com localização padrão (Nova Iorque)
        this.map = L.map('map').setView([40.7128, -74.0060], 10);
        
        // Adiciona camada de tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Adiciona marcadores de áreas da cidade
        this.addCityMarkers();
        
        // Adiciona evento de clique no mapa
        this.map.on('click', (e) => this.onMapClick(e));
    }

    addCityMarkers() {
        // Áreas de exemplo com dados de população
        const cityAreas = [
            { lat: 40.7589, lng: -73.9851, name: 'Times Square', population: 50000, risk: 'medium' },
            { lat: 40.7505, lng: -73.9934, name: 'Empire State Building', population: 25000, risk: 'low' },
            { lat: 40.6892, lng: -74.0445, name: 'Financial District', population: 75000, risk: 'high' },
            { lat: 40.7282, lng: -73.7949, name: 'Queens Center', population: 100000, risk: 'medium' },
            { lat: 40.6782, lng: -73.9442, name: 'Brooklyn Heights', population: 60000, risk: 'low' }
        ];

        cityAreas.forEach(area => {
            const marker = L.circleMarker([area.lat, area.lng], {
                radius: Math.sqrt(area.population / 1000) * 2,
                fillColor: this.getRiskColor(area.risk),
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(this.map);

            marker.bindPopup(`
                <div class="marker-popup">
                    <h4>${area.name}</h4>
                    <p><strong>Population:</strong> ${area.population.toLocaleString()}</p>
                    <p><strong>Risk Level:</strong> <span class="risk-${area.risk}">${area.risk.toUpperCase()}</span></p>
                </div>
            `);
        });
    }

    getRiskColor(risk) {
        const colors = {
            low: '#27ae60',
            medium: '#f39c12',
            high: '#e74c3c'
        };
        return colors[risk] || '#95a5a6';
    }

    async requestLocationPermission() {
        if ('geolocation' in navigator) {
            try {
                const position = await this.getCurrentPosition();
                this.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                this.map.setView([this.userLocation.lat, this.userLocation.lng], 12);
                this.addUserLocationMarker();
            } catch (error) {
                console.log('Location access denied or unavailable');
            }
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            });
        });
    }

    addUserLocationMarker() {
        if (this.userLocation) {
            L.marker([this.userLocation.lat, this.userLocation.lng], {
                icon: L.divIcon({
                    className: 'user-location-marker',
                    html: '<i class="fas fa-user-circle" style="color: #3498db; font-size: 24px;"></i>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(this.map).bindPopup('Sua Localização');
        }
    }

    locateUser() {
        if (this.userLocation) {
            this.map.setView([this.userLocation.lat, this.userLocation.lng], 15);
        } else {
            this.requestLocationPermission();
        }
    }

    async loadWeatherData() {
        const currentAPI = this.settings.weatherAPI || 'openweathermap';
        const apiConfig = this.apiConfigs[currentAPI];
        
        if (apiConfig.requiresKey && !this.settings.apiKey) {
            this.showAlert(`Configure sua chave da API ${apiConfig.name} nas configurações`, 'warning');
            return;
        }

        try {
            const coords = this.userLocation || { lat: 40.7128, lng: -74.0060 };
            let url;
            
            if (apiConfig.requiresKey) {
                url = apiConfig.currentUrl(coords.lat, coords.lng, this.settings.apiKey);
            } else {
                url = apiConfig.currentUrl(coords.lat, coords.lng);
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`${apiConfig.name} API request failed`);
            }
            
            const rawData = await response.json();
            this.weatherData = this.normalizeWeatherData(rawData, currentAPI === 'tomorrow_openaq' ? 'tomorrow' : currentAPI);
            // If Tomorrow.io humidity override is configured, fetch and replace humidity
            if (this.settings.tomorrowHumidityKey) {
                try {
                    const tmUrl = this.apiConfigs.tomorrow.currentUrl(coords.lat, coords.lng, this.settings.tomorrowHumidityKey);
                    const tmResp = await fetch(tmUrl);
                    if (tmResp.ok) {
                        const tmJson = await tmResp.json();
                        const tmHumidity = tmJson?.data?.values?.humidity;
                        if (typeof tmHumidity === 'number') {
                            this.weatherData.main.humidity = tmHumidity;
                            this.humiditySource = 'Tomorrow.io';
                        } else {
                            this.humiditySource = 'Provedor';
                        }
                    } else {
                        this.humiditySource = 'Provedor';
                    }
                } catch (_) {}
            } else {
                this.humiditySource = 'Provedor';
            }
            this.updateWeatherDisplay();
            this.assessRisk();
            this.loadForecast();
            this.recordDailyHistory();
            
            // Load air quality data from OpenAQ if enabled, or always when using combined option
            if (this.settings.useOpenAQ || currentAPI === 'tomorrow_openaq') {
                await this.loadAirQualityData(coords);
            }

            // Update Fire Risk card if module exists
            this.updateFireRiskCard();
        } catch (error) {
            console.error('Erro ao carregar dados de clima:', error);
            // Fallback: if combined Tomorrow.io + OpenAQ fails, try OpenWeatherMap
            if ((this.settings.weatherAPI === 'tomorrow_openaq') && this.settings.apiKey) {
                try {
                    const coords = this.userLocation || { lat: 40.7128, lng: -74.0060 };
                    const owConfig = this.apiConfigs.openweathermap;
                    const url = owConfig.currentUrl(coords.lat, coords.lng, this.settings.apiKey);
                    const resp = await fetch(url);
                    if (resp.ok) {
                        const raw = await resp.json();
                        this.weatherData = this.normalizeWeatherData(raw, 'openweathermap');
                        this.updateWeatherDisplay();
                        this.assessRisk();
                        // still try to show fire risk
                        this.updateFireRiskCard();
                        this.showAlert('Tomorrow.io indisponível; usando OpenWeatherMap como alternativa.', 'warning');
                        return;
                    }
                } catch (e) {
                    // ignore and show original error below
                }
            }
            this.showAlert(`Falha ao carregar dados de clima de ${apiConfig.name}. Verifique suas configurações.`, 'error');
        }
    }

    // Registra um snapshot diário no histórico (mantém últimos 7 dias)
    recordDailyHistory() {
        try {
            const now = new Date();
            const dayKey = now.toISOString().slice(0, 10);
            const history = this.loadHistory();
            const precipitation = this.estimatePrecipitationFlag();
            const fire = this.computeFireRiskSnapshot();
            const aqi = this.airQualityData && (this.airQualityData.pm25 || this.airQualityData.pm10 || this.airQualityData.o3)
                ? this.calculateRealAQI(this.airQualityData)
                : (this.weatherData ? this.calculateAQI(this.weatherData) : null);

            const entry = {
                date: dayKey,
                temp: this.weatherData?.main?.temp ?? null,
                humidity: this.weatherData?.main?.humidity ?? null,
                windKmh: this.weatherData?.wind?.speed != null ? Math.round(this.weatherData.wind.speed * 3.6) : null,
                aqi: aqi,
                rain: precipitation,
                fireChance: fire?.score ?? null,
                fireLevel: fire?.level ?? null
            };

            // replace or append
            const filtered = history.filter(h => h.date !== dayKey);
            filtered.push(entry);
            // keep last 7 days sorted desc
            filtered.sort((a,b) => (a.date < b.date ? 1 : -1));
            const trimmed = filtered.slice(0, 7);
            localStorage.setItem(this.historyKey, JSON.stringify(trimmed));
            this.renderHistory(trimmed);
        } catch (e) {
            console.warn('Falha ao registrar histórico:', e);
        }
    }

    loadHistory() {
        try {
            const raw = localStorage.getItem(this.historyKey);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    }

    renderHistory(history) {
        const list = document.getElementById('historyList');
        if (!list) return;
        const data = history || this.loadHistory();
        list.innerHTML = '';
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'weather-card history-card';
            const date = new Date(item.date + 'T00:00:00');
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
            const dayNum = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            card.innerHTML = `
                <div class="card-header">
                    <i class="fas fa-calendar-day"></i>
                    <h3>${dayName} • ${dayNum}</h3>
                </div>
                <div class="card-content">
                    <div class="history-grid">
                        <div class="history-metric"><span>🌡️ Temp</span><strong>${item.temp != null ? Math.round(item.temp) + '°C' : '--'}</strong></div>
                        <div class="history-metric"><span>💧 Umidade</span><strong>${item.humidity != null ? item.humidity + '%' : '--'}</strong></div>
                        <div class="history-metric"><span>💨 Vento</span><strong>${item.windKmh != null ? item.windKmh + ' km/h' : '--'}</strong></div>
                        <div class="history-metric"><span>🫁 AQI</span><strong>${item.aqi != null ? item.aqi : '--'}</strong></div>
                        <div class="history-metric"><span>☔ Chuva</span><strong>${item.rain ? 'Sim' : 'Não'}</strong></div>
                        <div class="history-metric"><span>🔥 Incêndio</span><strong>${item.fireChance != null ? item.fireChance + '%' : '--'}${item.fireLevel ? ' ('+item.fireLevel+')' : ''}</strong></div>
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
    }

    estimatePrecipitationFlag() {
        try {
            // Heurística simples: usa descrição/código do tempo se disponível
            const w = this.weatherData?.weather?.[0]?.main?.toLowerCase() || '';
            if (/rain|drizzle|thunderstorm/.test(w)) return true;
            // Para Open-Meteo no forecast, a precipitação diária aparece em forecast, mas aqui usamos heurística
            return false;
        } catch (_) { return false; }
    }

    computeFireRiskSnapshot() {
        try {
            const temp = this.weatherData?.main?.temp ?? 20;
            const humidity = this.weatherData?.main?.humidity ?? 50;
            const windMs = this.weatherData?.wind?.speed ?? 0;
            const windKmh = windMs * 3.6;
            const isClear = Array.isArray(this.weatherData?.weather) && this.weatherData.weather[0] && (this.weatherData.weather[0].main || '').toLowerCase().includes('clear');
            let score = 0;
            if (temp > 35) score += 30; else if (temp > 30) score += 25; else if (temp > 25) score += 20; else if (temp > 20) score += 15; else if (temp > 15) score += 10; else score += 5;
            if (humidity < 30) score += 30; else if (humidity < 40) score += 25; else if (humidity < 50) score += 20; else if (humidity < 60) score += 15; else if (humidity < 70) score += 10; else score += 5;
            if (windKmh > 40) score += 25; else if (windKmh > 30) score += 20; else if (windKmh > 20) score += 15; else if (windKmh > 10) score += 10; else score += 5;
            if (isClear) score += 15;
            score = Math.max(0, Math.min(100, Math.round(score)));
            let level = 'BAIXO';
            if (score < 20) level = 'BAIXO'; else if (score < 40) level = 'MODERADO'; else if (score < 60) level = 'ALTO'; else if (score < 80) level = 'MUITO ALTO'; else level = 'EXTREMO';
            return { score, level };
        } catch (_) { return null; }
    }

    async loadAirQualityData(coords) {
        try {
            const url = `${this.openaqConfig.baseUrl}/latest?coordinates=${coords.lat},${coords.lng}&radius=10000&limit=1`;
            const response = await fetch(url);
            
            if (response.ok) {
                const aqData = await response.json();
                if (aqData.results && aqData.results.length > 0) {
                    this.airQualityData = this.normalizeOpenAQData(aqData.results[0]);
                    this.updateAirQualityDisplay();
                }
            }
        } catch (error) {
            console.error('Error loading air quality data:', error);
            // Fallback to calculated AQI if OpenAQ fails
            this.updateAirQualityDisplay();
        }
    }

    normalizeOpenAQData(data) {
        const measurements = data.measurements || [];
        const pollutants = {};
        
        measurements.forEach(measurement => {
            pollutants[measurement.parameter] = measurement.value;
        });
        
        return {
            pm25: pollutants.pm25 || null,
            pm10: pollutants.pm10 || null,
            o3: pollutants.o3 || null,
            no2: pollutants.no2 || null,
            so2: pollutants.so2 || null,
            co: pollutants.co || null,
            location: data.location,
            lastUpdated: data.lastUpdated
        };
    }

    async loadForecast() {
        const currentAPI = this.settings.weatherAPI || 'openweathermap';
        const apiConfig = this.apiConfigs[currentAPI];
        
        if (apiConfig.requiresKey && !this.settings.apiKey) return;

        try {
            const coords = this.userLocation || { lat: 40.7128, lng: -74.0060 };
            let url;
            
            if (apiConfig.requiresKey) {
                url = apiConfig.forecastUrl(coords.lat, coords.lng, this.settings.apiKey);
            } else {
                url = apiConfig.forecastUrl(coords.lat, coords.lng);
            }
            
            const response = await fetch(url);
            
            if (response.ok) {
                const forecastData = await response.json();
                this.updateForecastDisplay(forecastData, currentAPI);
            }
        } catch (error) {
            console.error('Error loading forecast:', error);
        }
    }

    normalizeWeatherData(data, apiType) {
        // Normalize different API responses to a common format
        switch (apiType) {
            case 'tomorrow':
                const values = data.data.values;
                return {
                    main: {
                        temp: values.temperature,
                        feels_like: values.temperatureApparent,
                        humidity: values.humidity,
                        pressure: values.pressureSurfaceLevel
                    },
                    wind: {
                        speed: values.windSpeed,
                        deg: values.windDirection
                    },
                    weather: [{
                        main: this.getTomorrowWeatherCondition(values.weatherCode),
                        description: this.getTomorrowWeatherDescription(values.weatherCode),
                        icon: this.getTomorrowWeatherIcon(values.weatherCode)
                    }],
                    name: 'Current Location'
                };
                
            case 'openweathermap':
                return {
                    main: {
                        temp: data.main.temp,
                        feels_like: data.main.feels_like,
                        humidity: data.main.humidity,
                        pressure: data.main.pressure
                    },
                    wind: {
                        speed: data.wind.speed,
                        deg: data.wind.deg
                    },
                    weather: data.weather,
                    name: data.name
                };
                
            case 'openmeteo':
                // Pick humidity closest to current time from hourly data
                let humidity = null;
                try {
                    const times = data.hourly.time || [];
                    const rh = data.hourly.relativehumidity_2m || [];
                    if (times.length && rh.length) {
                        const now = Date.now();
                        let bestIdx = 0;
                        let bestDiff = Infinity;
                        for (let i = 0; i < times.length; i++) {
                            const t = Date.parse(times[i]);
                            const diff = Math.abs(now - t);
                            if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
                        }
                        humidity = rh[bestIdx];
                    }
                } catch (_) {}
                return {
                    main: {
                        temp: data.current_weather.temperature,
                        feels_like: data.current_weather.temperature,
                        humidity: humidity != null ? humidity : data.current_weather?.relativehumidity ?? 60,
                        pressure: 1013
                    },
                    wind: {
                        speed: data.current_weather.windspeed,
                        deg: data.current_weather.winddirection
                    },
                    weather: [{
                        main: this.getWeatherCondition(data.current_weather.weathercode),
                        description: this.getWeatherDescription(data.current_weather.weathercode),
                        icon: this.getWeatherIconCode(data.current_weather.weathercode)
                    }],
                    name: 'Current Location'
                };
                
            case 'weatherapi':
                return {
                    main: {
                        temp: data.current.temp_c,
                        feels_like: data.current.feelslike_c,
                        humidity: data.current.humidity,
                        pressure: data.current.pressure_mb
                    },
                    wind: {
                        speed: data.current.wind_kph / 3.6, // Convert to m/s
                        deg: data.current.wind_degree
                    },
                    weather: [{
                        main: data.current.condition.text,
                        description: data.current.condition.text,
                        icon: data.current.condition.icon
                    }],
                    name: data.location.name
                };
                
            case 'weatherbit':
                return {
                    main: {
                        temp: data.data[0].temp,
                        feels_like: data.data[0].app_temp,
                        humidity: data.data[0].rh,
                        pressure: data.data[0].pres
                    },
                    wind: {
                        speed: data.data[0].wind_spd,
                        deg: data.data[0].wind_dir
                    },
                    weather: [{
                        main: data.data[0].weather.description,
                        description: data.data[0].weather.description,
                        icon: data.data[0].weather.icon
                    }],
                    name: data.data[0].city_name
                };
                
            default:
                return data;
        }
    }

    getWeatherCondition(code) {
        // Open-Meteo weather code mapping
        const conditions = {
            0: 'Clear', 1: 'Clear', 2: 'Clouds', 3: 'Clouds',
            45: 'Mist', 48: 'Mist', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
            61: 'Rain', 63: 'Rain', 65: 'Rain', 71: 'Snow', 73: 'Snow', 75: 'Snow',
            77: 'Snow', 80: 'Rain', 81: 'Rain', 82: 'Rain', 85: 'Snow', 86: 'Snow',
            95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
        };
        return conditions[code] || 'Unknown';
    }

    getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
            77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
        };
        return descriptions[code] || 'Unknown';
    }

    getWeatherIconCode(code) {
        const icons = {
            0: '01d', 1: '01d', 2: '02d', 3: '04d',
            45: '50d', 48: '50d', 51: '09d', 53: '09d', 55: '09d',
            61: '10d', 63: '10d', 65: '10d', 71: '13d', 73: '13d', 75: '13d',
            77: '13d', 80: '09d', 81: '09d', 82: '09d', 85: '13d', 86: '13d',
            95: '11d', 96: '11d', 99: '11d'
        };
        return icons[code] || '01d';
    }

    // Tomorrow.io weather code mapping functions
    getTomorrowWeatherCondition(code) {
        const conditions = {
            1000: 'Clear', 1100: 'Clear', 1101: 'Clear', 1102: 'Clear',
            1001: 'Clouds', 2000: 'Clouds', 2100: 'Clouds',
            4000: 'Rain', 4001: 'Rain', 4200: 'Rain', 4201: 'Rain',
            5000: 'Snow', 5001: 'Snow', 5100: 'Snow', 5101: 'Snow',
            6000: 'Rain', 6001: 'Rain', 6200: 'Rain', 6201: 'Rain',
            7000: 'Snow', 7101: 'Snow', 7102: 'Snow',
            8000: 'Thunderstorm'
        };
        return conditions[code] || 'Clear';
    }

    getTomorrowWeatherDescription(code) {
        const descriptions = {
            1000: 'Clear', 1100: 'Mostly Clear', 1101: 'Partly Cloudy', 1102: 'Mostly Cloudy',
            1001: 'Cloudy', 2000: 'Fog', 2100: 'Light Fog',
            4000: 'Drizzle', 4001: 'Rain', 4200: 'Light Rain', 4201: 'Heavy Rain',
            5000: 'Snow', 5001: 'Flurries', 5100: 'Light Snow', 5101: 'Heavy Snow',
            6000: 'Freezing Drizzle', 6001: 'Freezing Rain', 6200: 'Light Freezing Rain', 6201: 'Heavy Freezing Rain',
            7000: 'Ice Pellets', 7101: 'Heavy Ice Pellets', 7102: 'Light Ice Pellets',
            8000: 'Thunderstorm'
        };
        return descriptions[code] || 'Clear';
    }

    getTomorrowWeatherIcon(code) {
        const icons = {
            1000: '01d', 1100: '01d', 1101: '02d', 1102: '03d',
            1001: '04d', 2000: '50d', 2100: '50d',
            4000: '09d', 4001: '10d', 4200: '09d', 4201: '10d',
            5000: '13d', 5001: '13d', 5100: '13d', 5101: '13d',
            6000: '09d', 6001: '10d', 6200: '09d', 6201: '10d',
            7000: '13d', 7101: '13d', 7102: '13d',
            8000: '11d'
        };
        return icons[code] || '01d';
    }

    updateWeatherDisplay() {
        if (!this.weatherData) return;

        const data = this.weatherData;
        
        // Atualiza temperatura
        document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
        document.getElementById('tempTrend').textContent = `Sensação térmica ${Math.round(data.main.feels_like)}°C`;
        
        // Atualiza umidade
        const humidityEl = document.getElementById('humidity');
        const humidityTrendEl = document.getElementById('humidityTrend');
        if (humidityEl) humidityEl.textContent = `${data.main.humidity}%`;
        if (humidityTrendEl) humidityTrendEl.textContent = `${this.getHumidityDescription(data.main.humidity)} (${this.humiditySource})`;
        
        // Atualiza vento
        document.getElementById('windSpeed').textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
        document.getElementById('windTrend').textContent = `Direção: ${this.getWindDirection(data.wind.deg)}`;
        
        // Update air quality (use real data if available, otherwise calculate)
        this.updateAirQualityDisplay();
    }

    updateAirQualityDisplay() {
        let aqi;
        let aqiSource = 'Calculado';
        
        if (this.airQualityData && (this.airQualityData.pm25 || this.airQualityData.pm10 || this.airQualityData.o3)) {
            // Use real air quality data from OpenAQ
            aqi = this.calculateRealAQI(this.airQualityData);
            aqiSource = 'OpenAQ';
        } else if (this.weatherData) {
            // Fallback to calculated AQI based on weather conditions
            aqi = this.calculateAQI(this.weatherData);
        } else {
            aqi = 50; // Default moderate AQI
        }
        
        document.getElementById('airQuality').textContent = `${aqi} AQI`;
        document.getElementById('airQualityTrend').textContent = `${this.getAQIDescription(aqi)} (${aqiSource})`;
    }

    updateForecastDisplay(forecastData, apiType) {
        const forecastGrid = document.getElementById('forecastGrid');
        forecastGrid.innerHTML = '';
        
        let forecasts = [];
        
        if (apiType === 'tomorrow' || apiType === 'tomorrow_openaq') {
            // Handle Tomorrow.io forecast format
            forecasts = forecastData.timelines.daily.slice(0, 7).map(day => ({
                date: new Date(day.time),
                temp: day.values.temperatureAvg,
                description: this.getTomorrowWeatherDescription(day.values.weatherCodeMax),
                icon: this.getTomorrowWeatherIcon(day.values.weatherCodeMax)
            }));
        } else {
            // Handle other API formats (OpenWeatherMap, etc.)
            const dailyForecasts = {};
            forecastData.list.forEach(item => {
                const date = new Date(item.dt * 1000);
                const dayKey = date.toDateString();
                if (!dailyForecasts[dayKey]) {
                    dailyForecasts[dayKey] = item;
                }
            });
            
            forecasts = Object.values(dailyForecasts).slice(0, 7).map(forecast => ({
                date: new Date(forecast.dt * 1000),
                temp: forecast.main.temp,
                description: forecast.weather[0].description,
                icon: this.getWeatherIcon(forecast.weather[0].icon)
            }));
        }
        
        forecasts.forEach(forecast => {
            const dayName = forecast.date.toLocaleDateString('pt-BR', { weekday: 'short' });
            
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.innerHTML = `
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon">${forecast.icon}</div>
                <div class="forecast-temp">${Math.round(forecast.temp)}°C</div>
                <div class="forecast-desc">${forecast.description}</div>
            `;
            forecastGrid.appendChild(forecastItem);
        });
    }

    // Compute and update Fire Risk card using current normalized weather data
    updateFireRiskCard() {
        try {
            const fireRiskEl = document.getElementById('fireRisk');
            if (!fireRiskEl || !this.weatherData) return;

            const temp = this.weatherData.main?.temp ?? 20;
            const humidity = this.weatherData.main?.humidity ?? 50;
            const windMs = this.weatherData.wind?.speed ?? 0;
            const windKmh = windMs * 3.6;
            const isClear = Array.isArray(this.weatherData.weather) && this.weatherData.weather[0] && (this.weatherData.weather[0].main || '').toLowerCase().includes('clear');

            let score = 0;
            // Temperature factor
            if (temp > 35) score += 30;
            else if (temp > 30) score += 25;
            else if (temp > 25) score += 20;
            else if (temp > 20) score += 15;
            else if (temp > 15) score += 10; else score += 5;

            // Humidity factor (lower = higher risk)
            if (humidity < 30) score += 30;
            else if (humidity < 40) score += 25;
            else if (humidity < 50) score += 20;
            else if (humidity < 60) score += 15;
            else if (humidity < 70) score += 10; else score += 5;

            // Wind factor
            if (windKmh > 40) score += 25;
            else if (windKmh > 30) score += 20;
            else if (windKmh > 20) score += 15;
            else if (windKmh > 10) score += 10; else score += 5;

            if (isClear) score += 15;

            score = Math.max(0, Math.min(100, Math.round(score)));

            let level = 'LOW'; let color = '#27ae60';
            if (score < 20) { level = 'LOW'; color = '#27ae60'; }
            else if (score < 40) { level = 'MODERATE'; color = '#f39c12'; }
            else if (score < 60) { level = 'HIGH'; color = '#e67e22'; }
            else if (score < 80) { level = 'VERY HIGH'; color = '#d35400'; }
            else { level = 'EXTREME'; color = '#c0392b'; }

            const trendEl = document.getElementById('fireRiskTrend');
            const indicatorEl = document.getElementById('riskIndicator');
            if (fireRiskEl) fireRiskEl.textContent = `${score}%`;
            if (trendEl) trendEl.textContent = '→ Stable';
            if (indicatorEl) { indicatorEl.textContent = level; indicatorEl.style.color = color; }
        } catch (_) { /* noop */ }
    }

    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': '☀️', '01n': '🌙',
            '02d': '⛅', '02n': '☁️',
            '03d': '☁️', '03n': '☁️',
            '04d': '☁️', '04n': '☁️',
            '09d': '🌧️', '09n': '🌧️',
            '10d': '🌦️', '10n': '🌧️',
            '11d': '⛈️', '11n': '⛈️',
            '13d': '❄️', '13n': '❄️',
            '50d': '🌫️', '50n': '🌫️'
        };
        return iconMap[iconCode] || '🌤️';
    }

    calculateAQI(weatherData) {
        // Enhanced AQI calculation based on weather conditions
        let aqi = 50; // Base AQI (moderate)
        
        // Temperature effects (more detailed)
        if (weatherData.main.temp > 35) aqi += 30;      // Very hot - high pollution
        else if (weatherData.main.temp > 30) aqi += 20; // Hot - moderate pollution
        else if (weatherData.main.temp < -10) aqi += 25; // Very cold - trapped pollutants
        else if (weatherData.main.temp < 0) aqi += 15;   // Cold - some pollution
        
        // Humidity effects (more nuanced)
        if (weatherData.main.humidity > 90) aqi += 30;   // Very humid - poor dispersion
        else if (weatherData.main.humidity > 80) aqi += 20; // Humid - reduced dispersion
        else if (weatherData.main.humidity < 20) aqi += 15; // Very dry - more particles
        else if (weatherData.main.humidity < 30) aqi += 10; // Dry - some particles
        
        // Wind effects (detailed wind speed analysis)
        if (weatherData.wind.speed < 1) aqi += 40;       // No wind - pollutants trapped
        else if (weatherData.wind.speed < 2) aqi += 30;  // Very light wind
        else if (weatherData.wind.speed < 5) aqi += 15;  // Light wind
        else if (weatherData.wind.speed > 20) aqi -= 10; // Strong wind - good dispersion
        
        // Pressure effects (atmospheric pressure)
        if (weatherData.main.pressure < 980) aqi += 25;  // Very low pressure
        else if (weatherData.main.pressure < 1000) aqi += 15; // Low pressure
        else if (weatherData.main.pressure > 1030) aqi -= 5; // High pressure - better air
        
        // Time of day effect (if available)
        const hour = new Date().getHours();
        if (hour >= 7 && hour <= 9) aqi += 10;   // Morning rush hour
        if (hour >= 17 && hour <= 19) aqi += 10; // Evening rush hour
        
        // Seasonal adjustment (rough estimate)
        const month = new Date().getMonth();
        if (month >= 11 || month <= 1) aqi += 10; // Winter - heating emissions
        if (month >= 5 && month <= 8) aqi += 5;   // Summer - ozone formation
        
        return Math.min(Math.max(aqi, 0), 500);
    }

    // Enhanced AQI calculation with real pollutant data
    calculateRealAQI(pollutantData) {
        // This function would be used when real air quality data is available
        const { pm25, pm10, o3, no2, so2, co } = pollutantData;
        
        // Calculate individual AQI values for each pollutant
        const pm25AQI = this.calculatePollutantAQI(pm25, 'pm25');
        const pm10AQI = this.calculatePollutantAQI(pm10, 'pm10');
        const o3AQI = this.calculatePollutantAQI(o3, 'o3');
        const no2AQI = this.calculatePollutantAQI(no2, 'no2');
        const so2AQI = this.calculatePollutantAQI(so2, 'so2');
        const coAQI = this.calculatePollutantAQI(co, 'co');
        
        // Return the highest AQI value (worst pollutant)
        return Math.max(pm25AQI, pm10AQI, o3AQI, no2AQI, so2AQI, coAQI);
    }

    calculatePollutantAQI(concentration, pollutant) {
        // US EPA AQI breakpoints for different pollutants
        const breakpoints = {
            pm25: [
                { min: 0, max: 12, aqiMin: 0, aqiMax: 50 },
                { min: 12.1, max: 35.4, aqiMin: 51, aqiMax: 100 },
                { min: 35.5, max: 55.4, aqiMin: 101, aqiMax: 150 },
                { min: 55.5, max: 150.4, aqiMin: 151, aqiMax: 200 },
                { min: 150.5, max: 250.4, aqiMin: 201, aqiMax: 300 },
                { min: 250.5, max: 500.4, aqiMin: 301, aqiMax: 500 }
            ],
            pm10: [
                { min: 0, max: 54, aqiMin: 0, aqiMax: 50 },
                { min: 55, max: 154, aqiMin: 51, aqiMax: 100 },
                { min: 155, max: 254, aqiMin: 101, aqiMax: 150 },
                { min: 255, max: 354, aqiMin: 151, aqiMax: 200 },
                { min: 355, max: 424, aqiMin: 201, aqiMax: 300 },
                { min: 425, max: 604, aqiMin: 301, aqiMax: 500 }
            ],
            o3: [
                { min: 0, max: 54, aqiMin: 0, aqiMax: 50 },
                { min: 55, max: 70, aqiMin: 51, aqiMax: 100 },
                { min: 71, max: 85, aqiMin: 101, aqiMax: 150 },
                { min: 86, max: 105, aqiMin: 151, aqiMax: 200 },
                { min: 106, max: 200, aqiMin: 201, aqiMax: 300 }
            ]
        };
        
        const pollutantBreakpoints = breakpoints[pollutant];
        if (!pollutantBreakpoints) return 0;
        
        for (const bp of pollutantBreakpoints) {
            if (concentration >= bp.min && concentration <= bp.max) {
                return Math.round(
                    ((bp.aqiMax - bp.aqiMin) / (bp.max - bp.min)) * 
                    (concentration - bp.min) + bp.aqiMin
                );
            }
        }
        
        return 500; // Hazardous
    }

    getHumidityDescription(humidity) {
        if (humidity < 30) return 'Muito seco';
        if (humidity < 50) return 'Seco';
        if (humidity < 70) return 'Confortável';
        if (humidity < 90) return 'Úmido';
        return 'Muito úmido';
    }

    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return directions[Math.round(degrees / 22.5) % 16];
    }

    getAQIDescription(aqi) {
        if (aqi <= 50) return 'Bom';
        if (aqi <= 100) return 'Moderado';
        if (aqi <= 150) return 'Insalubre para Sensíveis';
        if (aqi <= 200) return 'Insalubre';
        if (aqi <= 300) return 'Muito Insalubre';
        return 'Perigoso';
    }

    assessRisk() {
        if (!this.weatherData) return;

        const data = this.weatherData;
        const thresholds = this.riskThresholds[this.settings.alertThreshold];
        
        let riskScore = 0;
        let riskFactors = [];
        
        // Temperature risk
        if (data.main.temp > thresholds.temp) {
            riskScore += 3;
            riskFactors.push('High Temperature');
        } else if (data.main.temp > thresholds.temp - 5) {
            riskScore += 1;
        }
        
        // Humidity risk
        if (data.main.humidity > thresholds.humidity) {
            riskScore += 2;
            riskFactors.push('High Humidity');
        }
        
        // Wind risk
        if (data.wind.speed * 3.6 > thresholds.wind) {
            riskScore += 3;
            riskFactors.push('High Wind Speed');
        }
        
        // Air quality risk
        const aqi = this.calculateAQI(data);
        if (aqi > thresholds.aqi) {
            riskScore += 2;
            riskFactors.push('Poor Air Quality');
        }
        
        // Determine risk level
        let riskLevel = 'low';
        if (riskScore >= 6) riskLevel = 'high';
        else if (riskScore >= 3) riskLevel = 'medium';
        
        this.updateRiskDisplay(riskLevel, riskFactors, data, aqi);
        
        // Check for alerts
        if (riskLevel === 'high' || riskFactors.length > 0) {
            this.showWeatherAlert(riskLevel, riskFactors);
        }
    }

    updateRiskDisplay(riskLevel, riskFactors, weatherData, aqi) {
        const riskIndicator = document.getElementById('riskLevel');
        const riskClass = riskLevel;
        
        riskIndicator.innerHTML = `
            <div class="risk-indicator ${riskClass}">
                <i class="fas fa-shield-alt"></i>
                <span>RISCO ${riskLevel.toUpperCase()}</span>
            </div>
        `;
        
        // Atualiza fatores de risco
        document.getElementById('weatherRisk').textContent = this.getWeatherRiskText(weatherData);
        document.getElementById('airRisk').textContent = this.getAQIDescription(aqi);
        document.getElementById('populationRisk').textContent = this.getPopulationRiskText();
    }

    getWeatherRiskText(weatherData) {
        const temp = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const wind = weatherData.wind.speed * 3.6;
        
        if (temp > 35 || humidity > 80 || wind > 50) return 'High';
        if (temp > 30 || humidity > 70 || wind > 40) return 'Medium';
        return 'Low';
    }

    getPopulationRiskText() {
        // This would typically come from population density data
        return 'Medium';
    }

    showWeatherAlert(riskLevel, riskFactors) {
        const message = `Alerta Climático: risco ${riskLevel.toUpperCase()} detectado. Fatores: ${riskFactors.join(', ')}`;
        this.showAlert(message, riskLevel);
        
        // Send push notification
        this.sendPushNotification(message, riskLevel);
    }

    showAlert(message, type = 'info') {
        const alertBanner = document.getElementById('alertBanner');
        const alertMessage = document.getElementById('alertMessage');
        
        alertMessage.textContent = message;
        alertBanner.className = `alert-banner ${type}`;
        alertBanner.classList.remove('hidden');
        
        // Auto-ocultar após 10 segundos
        setTimeout(() => this.hideAlert(), 10000);
    }

    hideAlert() {
        document.getElementById('alertBanner').classList.add('hidden');
    }

    setupPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Push notifications enabled');
                }
            });
        }
    }

    sendPushNotification(message, type) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Alerta Climático', {
                body: message,
                icon: '/favicon.ico',
                tag: 'weather-alert'
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    toggleHeatmap() {
        const button = document.getElementById('heatmapToggle');
        const heatmapType = document.getElementById('heatmapType').value;
        
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
            button.classList.remove('active');
        } else {
            this.updateHeatmap(heatmapType);
            button.classList.add('active');
        }
    }

    updateHeatmap(type) {
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }
        
        const heatmapData = this.generateHeatmapData(type);
        this.heatmapLayer = L.heatLayer(heatmapData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: this.getHeatmapGradient(type)
        }).addTo(this.map);
    }

    generateHeatmapData(type) {
        const baseLat = this.userLocation?.lat || 40.7128;
        const baseLng = this.userLocation?.lng || -74.0060;
        const data = [];
        
        // Generate sample data points around the base location
        for (let i = 0; i < 50; i++) {
            const lat = baseLat + (Math.random() - 0.5) * 0.1;
            const lng = baseLng + (Math.random() - 0.5) * 0.1;
            let intensity = Math.random();
            
            // Ajusta intensidade com base no tipo
            switch (type) {
                case 'population':
                    intensity = Math.random() * 0.8 + 0.2;
                    break;
                case 'temperature':
                    intensity = this.weatherData ? (this.weatherData.main.temp / 50) : Math.random();
                    break;
                case 'airQuality':
                    const aqi = this.weatherData ? this.calculateAQI(this.weatherData) : 100;
                    intensity = Math.min(aqi / 200, 1);
                    break;
                case 'risk':
                    intensity = Math.random() * 0.6 + 0.4;
                    break;
            }

            // Aplica fator do slider e limita 0..1
            intensity = Math.max(0, Math.min(1, intensity * this.heatmapIntensityFactor));

            data.push([lat, lng, intensity]);
        }
        
        return data;
    }

    getHeatmapGradient(type) {
        const gradients = {
            population: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' },
            temperature: { 0.4: 'blue', 0.6: 'green', 0.7: 'yellow', 0.8: 'orange', 1.0: 'red' },
            airQuality: { 0.4: 'green', 0.6: 'yellow', 0.7: 'orange', 0.8: 'red', 1.0: 'purple' },
            risk: { 0.4: 'green', 0.6: 'yellow', 0.7: 'orange', 0.8: 'red', 1.0: 'darkred' }
        };
        return gradients[type] || gradients.population;
    }

    updateHeatmapIntensity(intensity) {
        if (this.heatmapLayer) {
            const currentType = document.getElementById('heatmapType').value;
            this.updateHeatmap(currentType);
        }
    }

    onMapClick(e) {
        // Add click functionality for map interactions
        console.log('Map clicked at:', e.latlng);
    }

    async runAIAnalysis() {
        try {
            const resultBox = document.getElementById('aiResult');
            const questionEl = document.getElementById('aiQuestion');
            const areaEl = document.getElementById('aiAreaName');
            if (!resultBox || !questionEl) return;

            const coords = this.userLocation || { lat: 40.7128, lng: -74.0060 };
            const question = questionEl.value?.trim();
            const areaName = areaEl?.value?.trim();
            if (!question) {
                resultBox.innerHTML = '<div class="ai-msg">Digite uma pergunta.</div>';
                return;
            }

            // Agrega dados atuais
            const aqi = (this.airQualityData && (this.airQualityData.pm25 || this.airQualityData.pm10 || this.airQualityData.o3))
                ? this.calculateRealAQI(this.airQualityData)
                : (this.weatherData ? this.calculateAQI(this.weatherData) : null);
            const fire = this.computeFireRiskSnapshot();
            const history = this.loadHistory();

            const systemPrompt = `Você é uma IA técnica de planejamento urbano e ambiental. Avalie riscos de construção e expansão urbana considerando clima, histórico de chuvas/tempestades, qualidade do ar, risco de incêndio, calor urbano, poluição e possíveis deslizamentos. Seja crítico, claro e proponha mitigação.`;
            const userContext = {
                areaName: areaName || null,
                location: coords,
                weather: this.weatherData,
                aqi,
                fire,
                history
            };

            resultBox.innerHTML = '<div class="ai-loading">Analisando...</div>';

			// Eventos históricos fixos (exemplos) para contextualizar a IA
			const historicalEvents = [
				{ date: '2023-12-10', type: 'alagamento', region: 'Centro', severity: 'alto' },
				{ date: '2024-02-15', type: 'onda de calor', region: 'Zona Norte', severity: 'alto' },
				{ date: '2024-03-22', type: 'chuva forte', region: 'Zona Sul', severity: 'médio' }
			];

			const analysisPayload = {
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: 'Você é um assistente ambiental especialista em urbanismo sustentável. Analise dados meteorológicos e de qualidade do ar para prever áreas seguras para expansão urbana em Campo Mourão.'
					},
					{
						role: 'user',
						content: `
Analise os seguintes dados de Campo Mourão e diga onde a cidade pode crescer com segurança.
Considere calor, risco de deslizamento, qualidade do ar e histórico de desastres.

Pergunta do usuário: ${question}
Área (opcional): ${areaName || '—'}
Coordenadas aproximadas: ${JSON.stringify(coords)}

DADOS ATUAIS (clima normalizado):
${JSON.stringify(this.weatherData, null, 2)}

QUALIDADE DO AR (OpenAQ normalizado se disponível):
${JSON.stringify(this.airQualityData, null, 2)}

HISTÓRICO CLIMÁTICO (eventos locais):
${JSON.stringify(historicalEvents, null, 2)}

Entregue um relatório estruturado com:
- Áreas seguras: baixo risco de deslizamento e ilhas de calor;
- Locais adequados para indústrias: baixo impacto de poluição e boa ventilação;
- Regiões a evitar: alta poluição, umidade excessiva, ou histórico de desastres;
- Observações e recomendações de mitigação.
`
					}
				]
			};

			const resp = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(analysisPayload)
			});

            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || 'Falha na IA');
            const reply = data?.reply || 'Sem resposta.';
            resultBox.innerHTML = `<div class="ai-reply">${reply.replace(/\n/g, '<br>')}</div>`;
        } catch (err) {
            const resultBox = document.getElementById('aiResult');
            if (resultBox) resultBox.innerHTML = `<div class="ai-error">Erro: ${err.message}</div>`;
        }
    }

    showAISidebar() {
        const overlay = document.getElementById('aiSidebarOverlay');
        const sidebar = document.getElementById('aiSidebar');
        if (overlay) overlay.classList.remove('hidden');
        if (sidebar) sidebar.classList.remove('hidden');
    }

    hideAISidebar() {
        const overlay = document.getElementById('aiSidebarOverlay');
        const sidebar = document.getElementById('aiSidebar');
        if (overlay) overlay.classList.add('hidden');
        if (sidebar) sidebar.classList.add('hidden');
    }

    refreshData() {
        this.loadWeatherData();
        this.showAlert('Dados atualizados com sucesso', 'success');
    }

    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            this.loadWeatherData();
        }, this.settings.refreshInterval);
    }

    showSettings() {
        document.getElementById('settingsModal').classList.remove('hidden');
        document.getElementById('weatherAPI').value = this.settings.weatherAPI || 'tomorrow';
        document.getElementById('apiKey').value = this.settings.apiKey || '';
        document.getElementById('tomorrowHumidityKey').value = this.settings.tomorrowHumidityKey || '';
        document.getElementById('useOpenAQ').checked = this.settings.useOpenAQ !== false; // Default to true
        document.getElementById('alertThreshold').value = this.settings.alertThreshold;
        document.getElementById('refreshInterval').value = this.settings.refreshInterval;
        
        // Update API key help text based on selected API
        this.updateAPIKeyHelp();
        
        // Add event listener for API selection change
        document.getElementById('weatherAPI').addEventListener('change', () => this.updateAPIKeyHelp());
    }

    updateAPIKeyHelp() {
        const selectedAPI = document.getElementById('weatherAPI').value;
        const apiKeyHelp = document.getElementById('apiKeyHelp');
        const apiKeyInput = document.getElementById('apiKey');
        
        const apiInfo = {
            tomorrow_openaq: {
                help: 'Usa Tomorrow.io para clima (chave de API obrigatória) e OpenAQ para qualidade do ar.',
                placeholder: 'Insira sua chave da API do Tomorrow.io',
                required: true
            },
            tomorrow: {
                help: 'Obtenha sua chave gratuita em <a href="https://tomorrow.io/" target="_blank">Tomorrow.io</a> (100 chamadas/dia, dados premium)',
                placeholder: 'Insira sua chave da API do Tomorrow.io',
                required: true
            },
            openmeteo: {
                help: 'Chave de API não é necessária para Open-Meteo',
                placeholder: 'Não precisa de chave de API',
                required: false
            },
            openweathermap: {
                help: 'Obtenha sua chave gratuita em <a href="https://openweathermap.org/api" target="_blank">OpenWeatherMap</a> (1000 chamadas/dia)',
                placeholder: 'Insira sua chave da API do OpenWeatherMap',
                required: true
            },
            weatherapi: {
                help: 'Obtenha sua chave gratuita em <a href="https://weatherapi.com/" target="_blank">WeatherAPI.com</a> (1M chamadas/mês)',
                placeholder: 'Insira sua chave da API do WeatherAPI.com',
                required: true
            },
            weatherbit: {
                help: 'Obtenha sua chave gratuita em <a href="https://www.weatherbit.io/" target="_blank">Weatherbit</a> (500 chamadas/dia)',
                placeholder: 'Insira sua chave da API do Weatherbit',
                required: true
            }
        };
        
        const info = apiInfo[selectedAPI];
        apiKeyHelp.innerHTML = info.help;
        apiKeyInput.placeholder = info.placeholder;
        apiKeyInput.required = info.required;
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    saveSettings() {
        this.settings = {
            apiKey: document.getElementById('apiKey').value,
            weatherAPI: document.getElementById('weatherAPI').value,
            tomorrowHumidityKey: document.getElementById('tomorrowHumidityKey').value,
            useOpenAQ: document.getElementById('useOpenAQ').checked,
            alertThreshold: document.getElementById('alertThreshold').value,
            refreshInterval: parseInt(document.getElementById('refreshInterval').value)
        };
        
        this.saveSettingsToStorage();
        this.setupAutoRefresh();
        this.hideSettings();
        this.showAlert('Settings saved successfully', 'success');
        
        // Reload weather data with new settings
        this.loadWeatherData();
    }

    loadSettings() {
        const defaultSettings = {
            apiKey: '',
            weatherAPI: 'tomorrow', // Default to Tomorrow.io
            tomorrowHumidityKey: '',
            useOpenAQ: true, // Default to using OpenAQ for air quality
            alertThreshold: 'medium',
            refreshInterval: 60000
        };
        
        try {
            const saved = localStorage.getItem('cityExpansionSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return defaultSettings;
        }
    }

    saveSettingsToStorage() {
        try {
            localStorage.setItem('cityExpansionSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CityExpansionDashboard();
});

// Add some additional CSS for map markers
const style = document.createElement('style');
style.textContent = `
    .user-location-marker {
        background: none !important;
        border: none !important;
    }
    
    .marker-popup h4 {
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
    }
    
    .marker-popup p {
        margin: 0.25rem 0;
        font-size: 0.9rem;
    }
    
    .risk-low { color: #27ae60; font-weight: bold; }
    .risk-medium { color: #f39c12; font-weight: bold; }
    .risk-high { color: #e74c3c; font-weight: bold; }
    
    .btn.active {
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
    }
    
    .alert-banner.success {
        background: linear-gradient(135deg, #27ae60, #2ecc71);
    }
    
    .alert-banner.warning {
        background: linear-gradient(135deg, #f39c12, #e67e22);
    }
    
    .alert-banner.error {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
    }

    /* Histórico Climático */
    .history-section { margin-top: 1rem; }
    .history-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .history-card .card-header h3 { font-size: 1rem; }
    .history-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; }
    .history-metric { display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem; }
    .history-metric span { color: #7f8c8d; margin-right: 0.5rem; }

    /* IA */
    .ai-section { margin-top: 1rem; }
    .ai-content { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 1rem; }
    .ai-controls { display: grid; gap: 0.5rem; grid-template-columns: 1fr; }
    .ai-input, .ai-textarea { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #dfe6e9; border-radius: 6px; font-size: 0.95rem; }
    .ai-result { margin-top: 0.75rem; font-size: 0.95rem; line-height: 1.4; }
    .ai-loading { color: #7f8c8d; }
    .ai-error { color: #c0392b; }
    .ai-reply { white-space: normal; }
`;
document.head.appendChild(style);
