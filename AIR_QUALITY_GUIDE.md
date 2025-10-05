# 🌬️ Air Quality Calculation Guide

This guide explains how air quality is calculated in your City Expansion Manager dashboard and the different methods used by various weather APIs.

## 📊 **Air Quality Index (AQI) Overview**

The Air Quality Index (AQI) is a standardized way to report air quality. It converts complex air quality data into a simple number that's easy to understand.

### **AQI Scale (0-500):**

| AQI Range | Category | Health Effects | Color | Recommendation |
|-----------|----------|----------------|-------|----------------|
| **0-50** | Good | No health impacts | 🟢 Green | Enjoy outdoor activities |
| **51-100** | Moderate | Sensitive people may experience minor issues | 🟡 Yellow | Sensitive people should limit outdoor activity |
| **101-150** | Unhealthy for Sensitive | Children, elderly, and people with respiratory issues should limit outdoor activity | 🟠 Orange | Sensitive groups should avoid outdoor activity |
| **151-200** | Unhealthy | Everyone may experience health effects | 🔴 Red | Everyone should limit outdoor activity |
| **201-300** | Very Unhealthy | Health warnings for everyone | 🟣 Purple | Avoid outdoor activity |
| **301-500** | Hazardous | Emergency conditions | 🟤 Maroon | Stay indoors, close windows |

## 🔬 **How Air Quality is Calculated**

### **1. Dashboard's Weather-Based Calculation**

When real air quality data isn't available, the dashboard uses weather conditions to estimate AQI:

```javascript
// Enhanced AQI calculation based on weather conditions
let aqi = 50; // Base AQI (moderate)

// Temperature effects
if (temp > 35°C) aqi += 30;      // Very hot - high pollution
if (temp > 30°C) aqi += 20;      // Hot - moderate pollution
if (temp < -10°C) aqi += 25;     // Very cold - trapped pollutants
if (temp < 0°C) aqi += 15;       // Cold - some pollution

// Humidity effects
if (humidity > 90%) aqi += 30;   // Very humid - poor dispersion
if (humidity > 80%) aqi += 20;   // Humid - reduced dispersion
if (humidity < 20%) aqi += 15;   // Very dry - more particles
if (humidity < 30%) aqi += 10;   // Dry - some particles

// Wind effects
if (wind < 1 m/s) aqi += 40;     // No wind - pollutants trapped
if (wind < 2 m/s) aqi += 30;     // Very light wind
if (wind < 5 m/s) aqi += 15;     // Light wind
if (wind > 20 m/s) aqi -= 10;    // Strong wind - good dispersion

// Pressure effects
if (pressure < 980 hPa) aqi += 25;  // Very low pressure
if (pressure < 1000 hPa) aqi += 15; // Low pressure
if (pressure > 1030 hPa) aqi -= 5;  // High pressure - better air

// Time of day effects
if (7-9 AM) aqi += 10;           // Morning rush hour
if (5-7 PM) aqi += 10;           // Evening rush hour

// Seasonal effects
if (winter) aqi += 10;           // Heating emissions
if (summer) aqi += 5;            // Ozone formation
```

### **2. Real Air Quality Data from APIs**

#### **WeatherAPI.com (Most Comprehensive):**
```json
{
  "current": {
    "air_quality": {
      "co": 230.5,           // Carbon Monoxide (μg/m³)
      "no2": 1.4,            // Nitrogen Dioxide (μg/m³)
      "o3": 68.7,            // Ozone (μg/m³)
      "so2": 2.1,            // Sulfur Dioxide (μg/m³)
      "pm2_5": 0.6,          // PM2.5 (μg/m³)
      "pm10": 0.9,           // PM10 (μg/m³)
      "us-epa-index": 1,     // US EPA AQI (0-6)
      "gb-defra-index": 1    // UK DEFRA AQI (1-10)
    }
  }
}
```

#### **OpenWeatherMap:**
```json
{
  "list": [{
    "main": {
      "aqi": 2  // 1-5 scale (1=Good, 5=Hazardous)
    },
    "components": {
      "co": 230.5,
      "no": 0.18,
      "no2": 1.4,
      "o3": 68.7,
      "so2": 2.1,
      "pm2_5": 0.6,
      "pm10": 0.9,
      "nh3": 0.01
    }
  }]
}
```

#### **Weatherbit:**
```json
{
  "data": [{
    "aqi": 45,               // 0-500 scale
    "mold_level": 1,         // Mold level (1-5)
    "pollen_level_grass": 1, // Grass pollen (1-5)
    "pollen_level_tree": 1,  // Tree pollen (1-5)
    "pollen_level_weed": 1   // Weed pollen (1-5)
  }]
}
```

## 🧪 **Pollutants and Their Effects**

### **Primary Air Pollutants:**

#### **1. PM2.5 (Fine Particles)**
- **Size**: < 2.5 micrometers
- **Sources**: Vehicle emissions, industrial processes, wildfires
- **Health Effects**: Can penetrate deep into lungs, cause heart and lung problems
- **AQI Calculation**: Based on 24-hour average concentration

#### **2. PM10 (Coarse Particles)**
- **Size**: < 10 micrometers
- **Sources**: Dust, pollen, mold spores, construction
- **Health Effects**: Can irritate eyes, nose, throat, and lungs
- **AQI Calculation**: Based on 24-hour average concentration

#### **3. Ozone (O3)**
- **Formation**: Chemical reactions between pollutants in sunlight
- **Sources**: Vehicle emissions, industrial facilities
- **Health Effects**: Can cause breathing problems, aggravate asthma
- **AQI Calculation**: Based on 8-hour average concentration

#### **4. Nitrogen Dioxide (NO2)**
- **Sources**: Vehicle emissions, power plants, industrial facilities
- **Health Effects**: Can cause respiratory issues, aggravate asthma
- **AQI Calculation**: Based on 1-hour average concentration

#### **5. Sulfur Dioxide (SO2)**
- **Sources**: Power plants, industrial facilities, burning fossil fuels
- **Health Effects**: Can cause breathing problems, aggravate asthma
- **AQI Calculation**: Based on 1-hour average concentration

#### **6. Carbon Monoxide (CO)**
- **Sources**: Vehicle emissions, incomplete combustion
- **Health Effects**: Can cause headaches, dizziness, confusion
- **AQI Calculation**: Based on 8-hour average concentration

## 📈 **US EPA AQI Breakpoints**

### **PM2.5 (μg/m³):**
| AQI Range | PM2.5 Concentration | Category |
|-----------|-------------------|----------|
| 0-50 | 0-12.0 | Good |
| 51-100 | 12.1-35.4 | Moderate |
| 101-150 | 35.5-55.4 | Unhealthy for Sensitive |
| 151-200 | 55.5-150.4 | Unhealthy |
| 201-300 | 150.5-250.4 | Very Unhealthy |
| 301-500 | 250.5-500.4 | Hazardous |

### **PM10 (μg/m³):**
| AQI Range | PM10 Concentration | Category |
|-----------|-------------------|----------|
| 0-50 | 0-54 | Good |
| 51-100 | 55-154 | Moderate |
| 101-150 | 155-254 | Unhealthy for Sensitive |
| 151-200 | 255-354 | Unhealthy |
| 201-300 | 355-424 | Very Unhealthy |
| 301-500 | 425-604 | Hazardous |

### **Ozone (ppb):**
| AQI Range | Ozone Concentration | Category |
|-----------|-------------------|----------|
| 0-50 | 0-54 | Good |
| 51-100 | 55-70 | Moderate |
| 101-150 | 71-85 | Unhealthy for Sensitive |
| 151-200 | 86-105 | Unhealthy |
| 201-300 | 106-200 | Very Unhealthy |

## 🌍 **International AQI Standards**

### **European AQI (1-5 Scale):**
| Index | Category | Description |
|-------|----------|-------------|
| 1 | Good | Air quality is satisfactory |
| 2 | Fair | Air quality is acceptable |
| 3 | Moderate | Sensitive people may experience minor issues |
| 4 | Poor | Everyone may experience health effects |
| 5 | Very Poor | Health warnings for everyone |

### **UK DEFRA AQI (1-10 Scale):**
| Index | Category | Description |
|-------|----------|-------------|
| 1-3 | Low | Enjoy your usual outdoor activities |
| 4-6 | Moderate | Adults and children with lung/heart problems should reduce physical exertion |
| 7-9 | High | Adults and children with lung/heart problems should avoid physical exertion |
| 10 | Very High | Everyone should avoid physical exertion |

## 🔧 **How to Get Real Air Quality Data**

### **1. Use WeatherAPI.com (Recommended):**
- **Free Tier**: 1 million calls/month
- **Features**: Real-time air quality data with all major pollutants
- **Setup**: Get API key from [weatherapi.com](https://weatherapi.com/)

### **2. Use OpenWeatherMap:**
- **Free Tier**: 1000 calls/day
- **Features**: Air pollution data with major pollutants
- **Setup**: Get API key from [openweathermap.org](https://openweathermap.org/)

### **3. Use Weatherbit:**
- **Free Tier**: 500 calls/day
- **Features**: AQI data with pollen and mold levels
- **Setup**: Get API key from [weatherbit.io](https://weatherbit.io/)

### **4. Use Open-Meteo (Limited):**
- **Free Tier**: Unlimited calls
- **Features**: No air quality data (uses weather-based estimation)
- **Setup**: No API key required

## 🚨 **Health Recommendations by AQI**

### **Good (0-50):**
- ✅ Enjoy outdoor activities
- ✅ No restrictions for anyone
- ✅ Good time for outdoor exercise

### **Moderate (51-100):**
- ✅ Most people can enjoy outdoor activities
- ⚠️ Sensitive people should limit outdoor activity
- ⚠️ Consider reducing outdoor exercise if you have respiratory issues

### **Unhealthy for Sensitive (101-150):**
- ⚠️ Children, elderly, and people with respiratory issues should limit outdoor activity
- ⚠️ Everyone should consider reducing outdoor exercise
- ⚠️ Keep windows closed if you have respiratory issues

### **Unhealthy (151-200):**
- ❌ Everyone should limit outdoor activity
- ❌ Avoid outdoor exercise
- ❌ Keep windows closed
- ❌ Use air purifiers if available

### **Very Unhealthy (201-300):**
- ❌ Avoid outdoor activity
- ❌ Stay indoors with windows closed
- ❌ Use air purifiers
- ❌ Consider wearing masks if going outside

### **Hazardous (301-500):**
- ❌ Stay indoors
- ❌ Close all windows and doors
- ❌ Use air purifiers
- ❌ Avoid any outdoor activity
- ❌ Consider evacuating if possible

## 📱 **Dashboard Features**

Your City Expansion Manager dashboard provides:

1. **Real-time AQI Display**: Shows current air quality index
2. **Health Recommendations**: Provides appropriate health advice
3. **Risk Assessment**: Incorporates air quality into overall risk assessment
4. **Heat Map Visualization**: Shows air quality distribution across the city
5. **Alert System**: Notifies you when air quality becomes dangerous
6. **Historical Data**: Tracks air quality trends over time

## 🔮 **Future Enhancements**

Planned improvements to air quality calculation:

1. **Machine Learning**: Use historical data to improve predictions
2. **Traffic Data Integration**: Incorporate real-time traffic data
3. **Industrial Emissions**: Include industrial facility data
4. **Pollen Data**: Add pollen and allergen information
5. **Personalized Recommendations**: Customize advice based on user health conditions

## 📞 **Getting Help**

If you have questions about air quality calculation:

1. **Check API Documentation**: Each weather API has detailed documentation
2. **Monitor Your Usage**: Keep track of your API call limits
3. **Switch APIs**: Try different providers if one isn't working
4. **Check Weather Conditions**: Understand how weather affects air quality

Remember: Air quality can change rapidly, so it's important to check it regularly, especially if you have respiratory issues or are planning outdoor activities!
