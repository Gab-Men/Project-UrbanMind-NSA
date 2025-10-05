# City Expansion Manager - Weather Risk Dashboard

A comprehensive city expansion managerial software dashboard that provides real-time weather monitoring, risk assessment, and population density visualization to help city planners make informed decisions about urban development and public safety.

## Features

### 🌍 Interactive Map
- **GPS Integration**: Automatic location detection and user positioning
- **City Area Markers**: Visual representation of different city zones with population data
- **Risk Visualization**: Color-coded markers showing risk levels for each area
- **Click Interactions**: Detailed information popups for each city area

### 🌤️ Real-Time Weather Monitoring
- **Temperature**: Current temperature with "feels like" readings
- **Humidity**: Humidity levels with descriptive indicators
- **Wind Speed**: Wind speed and direction information
- **Air Quality**: AQI (Air Quality Index) calculations and descriptions
- **7-Day Forecast**: Extended weather predictions with icons and descriptions

### 🚨 Risk Assessment & Alerts
- **Multi-Factor Risk Analysis**: Combines temperature, humidity, wind, and air quality
- **Configurable Thresholds**: Low, medium, and high sensitivity settings
- **Push Notifications**: Browser notifications for dangerous weather conditions
- **Visual Risk Indicators**: Color-coded risk levels (Low/Medium/High)

### 🔥 Heat Map Visualization
- **Population Density**: Visual representation of population distribution
- **Temperature Heat Maps**: Temperature-based risk visualization
- **Air Quality Heat Maps**: Air pollution concentration mapping
- **Risk Assessment Heat Maps**: Combined risk factor visualization
- **Adjustable Intensity**: Customizable heat map opacity and intensity

### 📱 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Glass Morphism**: Modern glass-like design with backdrop blur effects
- **Smooth Animations**: Hover effects and transitions for better user experience
- **Dark/Light Theme**: Adaptive color scheme based on content

## Setup Instructions

### 1. Get Your API Key
1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Generate an API key (free tier includes 1000 calls/day)

### 2. Configure the Dashboard
1. Open the dashboard in your browser
2. Click the "Settings" button (⚙️) in the top-right corner
3. Enter your OpenWeatherMap API key
4. Configure your preferred alert threshold and refresh interval
5. Click "Save Settings"

### 3. Enable Location Services
- Allow location access when prompted for GPS functionality
- The dashboard will automatically center on your location

### 4. Enable Push Notifications
- Allow notifications when prompted for weather alerts
- You'll receive alerts for dangerous weather conditions

## Usage

### Weather Monitoring
- **Real-time Data**: Weather information updates automatically based on your refresh interval
- **Manual Refresh**: Click the "Refresh Data" button for immediate updates
- **Location-based**: Weather data is fetched for your current location

### Risk Assessment
- **Automatic Analysis**: The system continuously monitors weather conditions
- **Risk Factors**: Displays individual risk factors (temperature, humidity, wind, air quality)
- **Overall Risk Level**: Shows combined risk assessment with color-coded indicators

### Map Interaction
- **My Location**: Click to center the map on your current position
- **Heat Map Toggle**: Enable/disable heat map visualization
- **Area Information**: Click on city area markers for detailed information

### Heat Map Controls
- **Type Selection**: Choose between population, temperature, air quality, or risk heat maps
- **Intensity Adjustment**: Use the slider to adjust heat map intensity
- **Real-time Updates**: Heat maps update based on current weather conditions

## Technical Details

### APIs Used
- **OpenWeatherMap API**: For weather data and forecasts
- **Leaflet.js**: For interactive mapping functionality
- **Browser Geolocation API**: For GPS positioning
- **Web Notifications API**: For push notifications

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Data Storage
- Settings are stored locally in browser localStorage
- No personal data is transmitted to external servers (except weather API)

## Customization

### Risk Thresholds
You can modify risk thresholds in the JavaScript code:
```javascript
this.riskThresholds = {
    low: { temp: 35, humidity: 80, wind: 50, aqi: 100 },
    medium: { temp: 30, humidity: 70, wind: 40, aqi: 80 },
    high: { temp: 25, humidity: 60, wind: 30, aqi: 60 }
};
```

### City Areas
Add or modify city areas in the `addCityMarkers()` function:
```javascript
const cityAreas = [
    { lat: 40.7589, lng: -73.9851, name: 'Times Square', population: 50000, risk: 'medium' },
    // Add more areas here
];
```

## Troubleshooting

### Weather Data Not Loading
- Verify your API key is correct
- Check your internet connection
- Ensure you haven't exceeded the API rate limit

### Location Not Working
- Ensure location services are enabled in your browser
- Check that the site has permission to access your location
- Try refreshing the page and allowing location access again

### Push Notifications Not Working
- Check that notifications are enabled in your browser settings
- Ensure the site has permission to send notifications
- Try refreshing the page and allowing notifications again

## Future Enhancements

- Integration with additional weather APIs for redundancy
- Historical weather data and trends
- Integration with traffic and infrastructure data
- Machine learning-based risk prediction
- Multi-city support for regional monitoring
- Export functionality for reports and data

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please check the troubleshooting section above or create an issue in the project repository.
