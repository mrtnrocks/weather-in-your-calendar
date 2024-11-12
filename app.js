// Load the API key from a separate file
const apiKey = require('../api_key');

// Load variables from the URL
const { city, zip, country_code, units = 'metric', location = 'show', temperature = 'day' } = require('url').parse(request.url, true).query;

// Load the JSON data from the API
const weatherData = await fetch(`http://api.openweathermap.org/data/2.5/forecast/daily?${zip ? `zip=${zip},${country_code}` : `q=${city}`}&units=${units}&cnt=16&appid=${apiKey}`)
  .then(response => response.json());

// Set the ICAL headers
response.setHeader('Content-type', 'text/calendar; charset=utf-8');
response.setHeader('Content-Disposition', 'attachment; filename=weather-cal.ics');

// Define helper functions
const dateToCal = timestamp => new Date(timestamp * 1000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const dayToCal = timestamp => new Date(timestamp * 1000).toISOString().slice(0, 8);
const nextDayToCal = timestamp => new Date((timestamp + 86400) * 1000).toISOString().slice(0, 8);

const iconToEmoji = icon => {
  const emojiMap = {
    '01d': '☀️', '01n': '✨', '02d': '🌤', '02n': '🌤', '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️', '09d': '🌧', '09n': '🌧', '10d': '🌦', '10n': '🌦',
    '11d': '⛈', '11n': '⛈', '13d': '🌨', '13n': '🌨', '50d': '🌫', '50n': '🌫'
  };
  return emojiMap[icon] || '🤔';
};

const windDirectionPro = deg => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'][Math.round(deg / 22.5)];
const windDirectionArrow = deg => ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖', '↑'][Math.round(deg / 45)];

const makeDescriptions = data => {
  const { weather, sunrise, sunset, pressure, humidity, speed, deg } = data;
  let desc = `${iconToEmoji(weather[0].icon)} ${weather[0].description.charAt(0).toUpperCase() + weather[0].description.slice(1)}\n\n`;
  desc += `🌅 Sunrise ${new Date(sunrise * 1000).toLocaleTimeString()} and sets ${new Date(sunset * 1000).toLocaleTimeString()}\n\n`;
  desc += `⚡️ Pressure ${pressure} hPa\n\n`;
  desc += `💧 Humidity ${humidity}%\n\n`;
  desc += `💨 Wind speed up to ${Math.round(speed)} m/s\n`;
  desc += `🚩 from ${windDirectionPro(deg)} ${windDirectionArrow(deg)}\n\n\n\n`;
  desc += 'weather.vejnoe.dk';
  return desc;
};

const displayTemp = (temp, display) => {
  if (display === 'day') {
    return `${Math.round(temp.day)}°`;
  } else {
    return `${Math.round(temp.min)}°/${Math.round(temp.max)}°`;
  }
};

// Echo out the ICS file's contents
response.write('BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//vejnoe.dk//v0.2//EN\nX-WR-CALNAME:Weather for ' + weatherData.city.name + '\nX-APPLE-CALENDAR-COLOR:#ffffff\nCALSCALE:GREGORIAN\n');

for (const day of weatherData.list) {
  response.write('BEGIN:VEVENT\nSUMMARY;LANGUAGE=en:' + iconToEmoji(day.weather[0].icon) + ' ' + displayTemp(day.temp, temperature) + '\nX-FUNAMBOL-ALLDAY:1\nCONTACT:Andreas Vejnø Andersen, andreas@vejnoe.dk\nUID:' + dayToCal(day.dt) + '@vejnoe.dk\nDTSTAMP;VALUE=DATE:' + new Date().toISOString().replace(/[-:]/g, '') + '\nDTSTART;VALUE=DATE:' + dayToCal(day.dt) + '\n');

  if (location === 'show') {
    response.write('LOCATION:' + weatherData.city.name + '\n');
  }

  response.write('X-MICROSOFT-CDO-ALLDAYEVENT:TRUE\nURL;VALUE=URI:http://www.vejnoe.dk\nDTEND;VALUE=DATE:' + nextDayToCal(day.dt) + '\nX-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC\nDESCRIPTION;LANGUAGE=en:' + makeDescriptions(day) + '\nEND:VEVENT\n');
}

response.write('END:VCALENDAR');
response.end();
