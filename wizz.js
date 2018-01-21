const {XMLHttpRequest} = require('xmlhttprequest');

const formatDate = (dateString) => {
  const date = new Date(dateString);
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  const yyyy = date.getFullYear();

  dd = dd < 10 ? `0${dd}` : dd;
  mm = mm < 10 ? `0${mm}` : mm;

  return `${yyyy}-${mm}-${dd}`;
};

const getFlightBody = (searchPath, json, userAgent) => {
  const xhr = new XMLHttpRequest();
  const url = `https://be.wizzair.com/7.8.1/Api/search/${searchPath}`;

  const maxAttempts = 5;
  let i = 0;
  do {
    console.info(`> Getting response from '/${searchPath}' (attempt ${i + 1}/${maxAttempts})...`);
    xhr.open('POST', url, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (userAgent) {
      xhr.setRequestHeader('User-Agent', userAgent);
    }
    xhr.send(JSON.stringify(json));

    i += 1;
  } while ((xhr.readyState !== 4 || xhr.status !== 200) && i < maxAttempts)

  if (xhr.status !== 200) {
    throw new Error(`No response after ${i} attempts.`);
  }

  return JSON.parse(xhr.responseText);
};

const getDayBasicFlightFare = (from, to, day, userAgent) => {
  const json = {
    isFlightChange: false,
    isSeniorOrStudent: false,
    flightList:
      [{
        departureStation: from,
        arrivalStation: to,
        departureDate: day,
      }],
    adultCount: 1,
    childCount: 0,
    infantCount: 0,
    wdc: false,
    rescueFareCode: '',
  };

  return getFlightBody('search', json, userAgent)
    .outboundFlights[0].fares.filter(el => el.bundle === 'BASIC')[0];
};

const getPeriodCheapestFlightFare = (from, to, startDate, endDate, userAgent) => {
  const json = {
    flightList:
      [{
        departureStation: from,
        arrivalStation: to,
        from: startDate,
        to: endDate,
      }],
    priceType: 'regular',
    adultCount: 1,
    childCount: 0,
    infantCount: 0,
  };

  const allFlights = getFlightBody('timetable', json, userAgent).outboundFlights;

  const prices = [];
  allFlights.forEach((flight) => { prices.push(flight.price.amount); });

  return allFlights[prices.indexOf(Math.min(...prices))];
};

const getDayPrice = (from, to, day, userAgent) => {
  const {basePrice} = getDayBasicFlightFare(from, to, day, userAgent);

  const priceData = {
    amount: basePrice.amount,
    currency: basePrice.currencyCode,
  }

  return priceData;
}

const getPeriodCheapestPrice = (from, to, startDate, endDate, userAgent) => {
  const {price, departureDate} =
    getPeriodCheapestFlightFare(from, to, startDate, endDate, userAgent);

  const priceData = {
    amount: price.amount,
    currency: price.currencyCode,
    date: formatDate(departureDate),
  }

  return priceData;
}

const from = 'VNO';
const to = 'BVA';
const day = '2018-02-04';
const startDate = '2018-02-01';
const endDate = '2018-02-28';
const macUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) ' +
  'AppleWebKit/603.3.8 (KHTML, like Gecko) Version/10.1.2 Safari/603.3.8';

let price;

price = getDayPrice(from, to, day);
console.log('1) ' +
  `Outbound flight base price from ${from} to ${to} on ${day} ` +
  `is '${price.amount} ${price.currency}'.\n`);

price = getPeriodCheapestPrice(from, to, startDate, endDate);
console.log('2) ' +
  `The cheapest outbound flight base price from ${from} to ${to} ` +
  `during defined period (${startDate} - ${endDate}) ` +
  `is '${price.amount} ${price.currency}' (on ${price.date}).\n`);

price = getDayPrice(from, to, day, macUserAgent);
console.log('3) ' +
  `(Mac OS) Outbound flight base price from ${from} to ${to} on ${day} ` +
  `is '${price.amount} ${price.currency}'.\n`);
